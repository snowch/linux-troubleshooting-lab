#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <linux/futex.h>
#include <pthread.h>
#include <signal.h>
#include <stdatomic.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <sys/resource.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

static void check(int success, const char *operation)
{
    if (!success) {
        perror(operation);
        exit(2);
    }
}

static void pause_ms(long milliseconds)
{
    struct timespec delay = { .tv_sec = milliseconds / 1000,
                              .tv_nsec = milliseconds % 1000 * 1000000 };
    while (nanosleep(&delay, &delay) < 0)
        check(errno == EINTR, "nanosleep");
}

static int child_status(pid_t child)
{
    int status;
    pid_t result;
    do {
        result = waitpid(child, &status, 0);
    } while (result < 0 && errno == EINTR);
    check(result == child && WIFEXITED(status), "waitpid");
    return WEXITSTATUS(status);
}

static int log_message(int fixed)
{
    const char *message = fixed ? "export requested for profile=standard\n"
                                : "export requested for profile=archived\n";
    size_t length = strlen(message);
    check(write(STDOUT_FILENO, message, length) == (ssize_t)length, "write log");
    return fixed ? 0 : 1;
}

static int lookup_loop(int fixed)
{
    // The same optional file is requested repeatedly in the inefficient case.
    for (int attempt = 0; attempt < (fixed ? 1 : 12); ++attempt) {
        int fd = openat(AT_FDCWD, "conf/optional", O_RDONLY | O_CLOEXEC);
        check(fd == -1 && errno == ENOENT, "optional lookup");
    }
    int fd = openat(AT_FDCWD, "conf/settings", O_RDONLY | O_CLOEXEC);
    char value[16];
    check(fd >= 0 && read(fd, value, sizeof value) > 0, "read settings");
    close(fd);
    return 0;
}

static int descriptor_limit(int fixed)
{
    struct rlimit limit = { .rlim_cur = 12, .rlim_max = 12 };
    check(setrlimit(RLIMIT_NOFILE, &limit) == 0, "setrlimit");
    int held[16], count = 0;
    int status = 0;
    for (int i = 0; i < 16; ++i) {
        int fd = open("/dev/null", O_RDONLY | O_CLOEXEC);
        if (fd < 0) {
            check(errno == EMFILE, "open");
            puts("no descriptors left");
            status = 1;
            break;
        }
        if (fixed)
            close(fd);
        else
            held[count++] = fd;
    }
    while (count)
        close(held[--count]);
    if (fixed)
        puts("completed all opens");
    return status;
}

static int write_report(int fixed)
{
    const char *path = fixed ? "report.txt" : "/dev/full";
    int fd = open(path, O_WRONLY | O_CLOEXEC | (fixed ? O_CREAT | O_TRUNC : 0), 0600);
    check(fd >= 0, "open report");
    ssize_t result = write(fd, "report\n", 7);
    if (result < 0) {
        check(errno == ENOSPC, "write report");
        close(fd);
        return 1;
    }
    check(result == 7 && fsync(fd) == 0 && close(fd) == 0, "finish report");
    return 0;
}

static int export_job(int fixed)
{
    pid_t worker = fork();
    check(worker >= 0, "fork");
    if (!worker)
        _exit(write_report(fixed));
    int result = child_status(worker);
    puts(result ? "export failed" : "export complete");
    return result;
}

static int memory_limit(int fixed)
{
    struct rlimit limit = { .rlim_cur = 16 * 1024 * 1024, .rlim_max = 16 * 1024 * 1024 };
    check(setrlimit(RLIMIT_AS, &limit) == 0, "setrlimit");
    size_t bytes = fixed ? 4096 : 32 * 1024 * 1024;
    void *region = mmap(NULL, bytes, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (region == MAP_FAILED) {
        check(errno == ENOMEM, "mmap");
        puts("buffer allocation failed");
        return 1;
    }
    check(munmap(region, bytes) == 0, "munmap");
    puts("buffer allocated");
    return 0;
}

static int terminal_control(int fixed)
{
    int fd = open(fixed ? "/dev/ttyS0" : "conf/settings", O_RDONLY | O_NOCTTY | O_CLOEXEC);
    check(fd >= 0, "open descriptor");
    struct winsize size;
    int result = ioctl(fd, TIOCGWINSZ, &size);
    if (result < 0)
        check(errno == ENOTTY, "TIOCGWINSZ");
    close(fd);
    puts(result < 0 ? "window size unavailable" : "terminal window size available");
    return result < 0;
}

static volatile sig_atomic_t release_fd;

static void release_writer(int signal_number)
{
    (void)signal_number;
    int saved = errno;
    ssize_t ignored = write(release_fd, "x", 1);
    (void)ignored;
    errno = saved;
}

static int interrupted_read(int fixed)
{
    int data[2], release[2];
    check(pipe2(data, O_CLOEXEC) == 0 && pipe2(release, O_CLOEXEC) == 0, "create pipes");
    release_fd = release[1];
    struct sigaction action = { .sa_handler = release_writer, .sa_flags = fixed ? SA_RESTART : 0 };
    sigemptyset(&action.sa_mask);
    check(sigaction(SIGUSR1, &action, NULL) == 0, "sigaction");
    pid_t reader = getpid();
    pid_t child = fork();
    check(child >= 0, "fork");
    if (!child) {
        alarm(5);
        close(data[0]);
        close(release[1]);
        pause_ms(150);
        char byte;
        check(kill(reader, SIGUSR1) == 0 && read(release[0], &byte, 1) == 1, "release writer");
        _exit(write(data[1], "B", 1) == 1 ? 0 : 2);
    }
    close(data[1]);
    close(release[0]);
    char byte;
    ssize_t result = read(data[0], &byte, 1);
    int error = errno;
    check(child_status(child) == 0, "writer exit");
    close(data[0]);
    close(release[1]);
    if (result < 0) {
        check(error == EINTR, "interrupted read");
        puts("read interrupted by signal");
        return 1;
    }
    check(result == 1 && byte == 'B', "read byte");
    puts("read received B");
    return 0;
}

static int pending_signal(int fixed)
{
    sigset_t blocked, selected;
    sigemptyset(&blocked);
    sigaddset(&blocked, SIGUSR1);
    check(sigprocmask(SIG_BLOCK, &blocked, NULL) == 0 &&
          kill(getpid(), SIGUSR1) == 0, "queue signal");
    sigemptyset(&selected);
    sigaddset(&selected, fixed ? SIGUSR1 : SIGUSR2);
    struct timespec deadline = { .tv_nsec = 100 * 1000 * 1000 };
    int result = sigtimedwait(&selected, NULL, &deadline);
    if (result < 0) {
        check(errno == EAGAIN, "sigtimedwait");
        check(sigpending(&selected) == 0 && sigismember(&selected, SIGUSR1) == 1, "pending signal");
        puts("wait timed out while SIGUSR1 stayed pending");
        return 1;
    }
    check(result == SIGUSR1, "consume pending signal");
    puts("consumed SIGUSR1");
    return 0;
}

struct handoff {
    _Atomic int ready;
    int wakes_reader;
};

static void *publish(void *argument)
{
    struct handoff *state = argument;
    pause_ms(150);
    if (state->wakes_reader) {
        atomic_store(&state->ready, 1);
        check(syscall(SYS_futex, &state->ready, FUTEX_WAKE_PRIVATE, 1, NULL, NULL, 0) >= 0, "futex wake");
    }
    return NULL;
}

static int thread_wait(int fixed)
{
    struct handoff state = { .ready = 0, .wakes_reader = fixed };
    pthread_t worker;
    check(pthread_create(&worker, NULL, publish, &state) == 0, "pthread_create");
    // SYS_futex uses two kernel longs, including on x86 with a 64-bit libc time_t.
    struct { long seconds, nanoseconds; } deadline = { 0, 500 * 1000 * 1000 };
    long result = syscall(SYS_futex, &state.ready, FUTEX_WAIT_PRIVATE, 0, &deadline, NULL, 0);
    int error = errno;
    check(pthread_join(worker, NULL) == 0, "pthread_join");
    if (result < 0 && error == ETIMEDOUT) {
        puts("worker did not publish");
        return 1;
    }
    check((result == 0 || error == EAGAIN) && atomic_load(&state.ready) == 1, "futex result");
    puts("worker published");
    return 0;
}

int run_diagnostic(const char *name, int fixed)
{
    const struct { const char *name; int (*run)(int); } cases[] = {
        { "log-message", log_message },
        { "lookup-loop", lookup_loop },
        { "descriptor-limit", descriptor_limit },
        { "space-error", write_report },
        { "memory-limit", memory_limit },
        { "terminal-control", terminal_control },
        { "interrupted-read", interrupted_read },
        { "pending-signal", pending_signal },
        { "thread-wait", thread_wait },
        { "export-job", export_job }
    };
    for (size_t i = 0; i < sizeof cases / sizeof *cases; ++i)
        if (!strcmp(name, cases[i].name))
            return cases[i].run(fixed);
    fputs("unknown fixture\n", stderr);
    return 2;
}
