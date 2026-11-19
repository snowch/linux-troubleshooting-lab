#define _GNU_SOURCE
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <grp.h>
#include <poll.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>

static void check(int condition, const char *operation)
{
    if (!condition) {
        perror(operation);
        exit(2);
    }
}

static int config(int fixed, const char *fault)
{
    const char *file = fixed ? "conf/settings" : "conf/setting";
    if (!strcmp(fault, "cwd")) {
        check(chdir(fixed ? "." : "work") == 0, "chdir");
        file = "conf/settings";
    }
    if (!strcmp(fault, "permission")) {
        file = fixed ? "conf/public" : "conf/private";
        if (geteuid() == 0)
            check(setgroups(0, NULL) == 0 && setgid(65534) == 0 && setuid(65534) == 0,
                  "switch to service user");
    }
    int fd = openat(AT_FDCWD, file, O_RDONLY | O_CLOEXEC);
    if (fd < 0) {
        puts("startup failed");
        return 1;
    }
    char value[16];
    check(read(fd, value, sizeof value) > 0, "read configuration");
    close(fd);
    puts("read configuration");
    return 0;
}

static int child_exit(pid_t child)
{
    int status;
    check(waitpid(child, &status, 0) == child && WIFEXITED(status), "waitpid");
    return WEXITSTATUS(status);
}

static int launch(int fixed)
{
    pid_t child = fork();
    check(child >= 0, "fork");
    if (!child) {
        const char *path = fixed ? "/bin/echo" : "./missing-helper";
        execl(path, fixed ? "echo" : "missing-helper", "helper ready", (char *)NULL);
        _exit(127);
    }
    if (child_exit(child)) {
        puts("helper failed");
        return 1;
    }
    return 0;
}

static int pipe_wait(int fixed)
{
    int channel[2], release[2];
    check(pipe2(channel, O_CLOEXEC) == 0 && pipe2(release, O_CLOEXEC) == 0, "pipe2");
    pid_t child = fork();
    check(child >= 0, "fork");
    if (!child) {
        close(channel[0]);
        close(release[1]);
        if (fixed)
            close(channel[1]);
        char byte;
        _exit(read(release[0], &byte, 1) == 0 ? 0 : 2);
    }
    close(channel[1]);
    close(release[0]);
    struct pollfd item = { .fd = channel[0], .events = POLLIN };
    int ready = poll(&item, 1, 500);
    check(ready >= 0, "poll");
    if (!ready)
        puts("no EOF before deadline");
    else {
        char value;
        check((item.revents & POLLHUP) && read(channel[0], &value, 1) == 0, "read EOF");
        puts("reader reached EOF");
    }
    close(release[1]);
    close(channel[0]);
    check(child_exit(child) == 0, "child exit");
    return ready ? 0 : 1;
}

static int network(int fixed, int deadline)
{
    int endpoint = socket(AF_INET, SOCK_STREAM | SOCK_CLOEXEC, 0);
    struct sockaddr_in local = {
        .sin_family = AF_INET, .sin_addr.s_addr = htonl(INADDR_LOOPBACK)
    };
    socklen_t length = sizeof local;
    check(endpoint >= 0 && bind(endpoint, (struct sockaddr *)&local, length) == 0 &&
          getsockname(endpoint, (struct sockaddr *)&local, &length) == 0, "bind loopback");
    if (fixed || deadline)
        check(listen(endpoint, 1) == 0, "listen");
    int client = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK | SOCK_CLOEXEC, 0);
    check(client >= 0, "socket");
    int result = connect(client, (struct sockaddr *)&local, length);
    if (result < 0 && errno != EINPROGRESS) {
        if (errno == ECONNREFUSED) {
            close(client);
            close(endpoint);
            puts("connection refused");
            return 1;
        }
        check(0, "connect");
    }
    struct pollfd output = { .fd = client, .events = POLLOUT };
    if (result < 0)
        check(poll(&output, 1, 1000) == 1, "await connection");
    int error;
    length = sizeof error;
    check(getsockopt(client, SOL_SOCKET, SO_ERROR, &error, &length) == 0, "SO_ERROR");
    if (error) {
        check(error == ECONNREFUSED, "unexpected connection failure");
        close(client);
        close(endpoint);
        puts("connection refused");
        return 1;
    }
    int peer = accept4(endpoint, NULL, NULL, SOCK_CLOEXEC);
    check(peer >= 0, "accept");
    int status = 0;
    if (deadline) {
        if (fixed)
            check(write(peer, "R", 1) == 1, "reply");
        struct pollfd input = { .fd = client, .events = POLLIN };
        int received = poll(&input, 1, 300);
        check(received >= 0, "await response");
        if (!received) {
            puts("connection established, reply deadline expired");
            status = 1;
        } else {
            char reply;
            check(read(client, &reply, 1) == 1 && reply == 'R', "read reply");
            puts("received reply");
        }
    } else {
        puts("connection established");
    }
    close(peer);
    close(client);
    close(endpoint);
    return status;
}

int main(int argc, char **argv)
{
    alarm(8);
    if (argc != 2)
        return 2;
    const char *variant = getenv("LAB_VARIANT");
    int fixed = variant && !strcmp(variant, "fixed");
    if (!strcmp(argv[1], "launch"))
        return launch(fixed);
    if (!strcmp(argv[1], "pipe"))
        return pipe_wait(fixed);
    if (!strcmp(argv[1], "refused"))
        return network(fixed, 0);
    if (!strcmp(argv[1], "deadline"))
        return network(fixed, 1);
    if (!strcmp(argv[1], "startup")) {
        if (config(fixed, "cwd"))
            return 1;
        return launch(1);
    }
    if (!strcmp(argv[1], "file") || !strcmp(argv[1], "cwd") || !strcmp(argv[1], "permission"))
        return config(fixed, argv[1]);
    fputs("unknown fixture\n", stderr);
    return 2;
}
