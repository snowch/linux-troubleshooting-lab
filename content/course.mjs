export const course = {
  "slug": "linux-troubleshooting-lab",
  "title": "Linux Troubleshooting Lab",
  "overview": {
    "description": "Use strace in a browser Linux guest to diagnose file errors, failed child processes, pipes without an end-of-file signal and loopback connection failures. Test each diagnosis with a repaired example.",
    "prerequisites": "You should be able to read a basic shell command. The lessons introduce Linux tracing as you go. The files and services are provided inside the guest."
  },
  "instructions": "The page prepares a fresh example for each run. Choose Failing under Case and select Run in Linux with the starter trace command. If you have a saved edit, use Download command and notes to keep a copy before choosing Restore starter command.",
  "lessons": [
    {
      "id": "first-trace",
      "section": "Files and paths",
      "title": "Find the file that failed to open",
      "command": "strace -e trace=openat \"$LAB_BIN/fixture\" file",
      "intro": "strace shows system calls, which are requests a program makes to the Linux kernel. Here, openat() asks to open a file. It returns a file descriptor on success. A descriptor is the number this process uses to refer to an open resource.",
      "question": "Which path explains why the program prints “startup failed”?",
      "evidence": "In Linux output, find the openat() line for the path starting conf/. Read the quoted path and the text after the equals sign. ENOENT means the requested file or a directory in its path is missing.",
      "task": "Copy that line into Trace evidence and diagnosis. Choose Repaired under Case and select Run in Linux without changing the command. Compare the quoted conf/ paths and whether each result is an error or a descriptor.",
      "hint": "Calls near the start of the trace load the program itself. Start your search at the last openat() call that mentions conf/.",
      "explanation": "The failing run asks for conf/setting and gets ENOENT. The repaired run asks for conf/settings and gets a nonnegative descriptor. The program then reads the configuration.",
      "transfer": "Which names would you add to the trace filter to follow reads and the closing of that descriptor?",
      "reference": [
        "Read the strace manual",
        "https://man7.org/linux/man-pages/man1/strace.1.html"
      ]
    },
    {
      "id": "working-directory",
      "section": "Files and paths",
      "title": "Resolve a path from the working directory",
      "command": "strace -e trace=chdir,openat \"$LAB_BIN/fixture\" cwd",
      "intro": "A relative path, such as conf/settings, has no leading slash. In this exercise, openat() uses AT_FDCWD to resolve it from the process’s working directory. The working directory is where the process starts looking. chdir() changes that directory.",
      "question": "How can the same relative filename work in one case and fail in the other?",
      "evidence": "In Linux output, find chdir() and the following openat(AT_FDCWD, …) for conf/settings. A return of 0 from chdir() confirms that the directory change succeeded.",
      "task": "Write the directory and the openat() result in Trace evidence and diagnosis. Choose Repaired under Case and select Run in Linux with the same command. Compare the chdir() arguments, then write each conf/settings path relative to the starting example directory.",
      "hint": "In chdir(\".\"), the dot refers to the directory the process already uses.",
      "explanation": "The failing process moves into work and looks for work/conf/settings. The repaired process stays in the starting directory and opens conf/settings there.",
      "transfer": "Where would the lookup start if the path began with a slash? What could an open descriptor for a directory let the program choose?",
      "reference": [
        "Read the strace manual",
        "https://man7.org/linux/man-pages/man1/strace.1.html"
      ]
    },
    {
      "id": "permissions",
      "section": "Files and paths",
      "title": "Distinguish permission denied from a missing file",
      "command": "strace -e trace=openat,setuid,setuid32,setgid,setgid32 \"$LAB_BIN/fixture\" permission",
      "intro": "The provided program switches to an unprivileged Linux user before it opens the configuration. The trace includes user and group changes and the final openat() call. EACCES means Linux denied access. ENOENT means a file or directory in the path could not be found.",
      "question": "What evidence identifies an access problem even though the program prints “startup failed”?",
      "evidence": "In Linux output, find setuid32(65534) or setuid(65534) returning 0 and the openat() call for conf/private. Read the return value and error name.",
      "task": "Record the filename, user change and error in Trace evidence and diagnosis. Choose Repaired under Case and select Run in Linux with the same command. Compare the user, the conf/ filename and the openat() result. Did the user change between cases?",
      "hint": "The page prepares conf/private as a file the service user cannot read. It also prepares a readable file at conf/public.",
      "explanation": "Both runs switch to user 65534. The Failing case gets EACCES opening conf/private. The Repaired case opens conf/public successfully. This example changes which file the program opens.",
      "transfer": "What permissions would you inspect if Linux denied access while crossing a parent directory of the file?",
      "reference": [
        "Read the strace manual",
        "https://man7.org/linux/man-pages/man1/strace.1.html"
      ]
    },
    {
      "id": "children",
      "section": "Processes and descriptors",
      "title": "Follow the child that failed to exec",
      "command": "strace -e trace=execve,wait4 \"$LAB_BIN/fixture\" launch",
      "intro": "A parent process can wait for a child and report its exit status. execve() replaces the program running in the calling process. By default, strace follows the initial process. Use -f to follow its children as well.",
      "question": "What does the parent know about the failed child, and what extra evidence appears when strace follows the child?",
      "evidence": "In the starter trace, find wait4() and WEXITSTATUS(s). That value describes how the child exited. The final exited line reports the result of the parent command.",
      "task": "In Trace command, change the opening strace -e to strace -f -e. Keep Case set to Failing and select Run in Linux. Find the child’s execve() and record its path and result. Choose Repaired and select Run in Linux with -f still present. Compare the child’s execve() result and the parent’s wait status.",
      "hint": "In the expanded trace, use the child’s process number to connect its execve() line with its exit.",
      "explanation": "The failing child tries ./missing-helper, gets ENOENT and exits with status 127. The parent sees 127 and exits with status 1. The repaired child runs /bin/echo and exits with status 0.",
      "transfer": "Why would a parent-only trace be enough to detect a failure but insufficient to name the missing helper?",
      "reference": [
        "Read the strace manual",
        "https://man7.org/linux/man-pages/man1/strace.1.html"
      ]
    },
    {
      "id": "pipeline",
      "section": "Processes and descriptors",
      "title": "Trace where a pipeline sent its bytes",
      "command": "strace -f -yy -e trace=pipe,pipe2,dup2,dup3,write,writev /bin/sh -c 'if [ \"$LAB_VARIANT\" = fixed ]; then printf ping | wc -c; else printf ping >&2 | wc -c; fi'",
      "intro": "A pipe carries bytes from a writer to a reader. The shell connects the first program’s standard output, descriptor 1, to the second program’s standard input. Redirection can change that destination. The -yy option asks strace to show paths and pipe identifiers beside descriptors.",
      "question": "Why does wc -c count zero bytes when printf wrote four?",
      "evidence": "In Linux output, find write() or writev() carrying \"ping\". writev() can send several buffers in one call. Check the four-byte length and the annotation after the descriptor number. Find the count wc writes afterwards. If the count is mixed into another line, look for a write with iov_base=\"0\" or iov_base=\"4\". iov_base shows the contents of a buffer here.",
      "task": "Record the destination of the ping write and the count in Trace evidence and diagnosis. Choose Repaired under Case and select Run in Linux with the same command. Find the ping write and count again. Compare where the bytes went.",
      "hint": "The failing command uses >&2. That redirects output to the command’s standard error destination, which remains the guest terminal here.",
      "explanation": "The failing pipeline writes ping to the guest terminal and wc counts zero bytes. The repaired one writes ping to a pipe and wc counts four bytes. Both commands can exit with status 0.",
      "transfer": "Which system call would you add to the trace filter to see wc receive those bytes?",
      "reference": [
        "Read the strace manual",
        "https://man7.org/linux/man-pages/man1/strace.1.html"
      ]
    },
    {
      "id": "pipe-eof",
      "section": "Processes and descriptors",
      "title": "Explain why a pipe has no EOF",
      "command": "strace -f -yy -e trace=pipe2,close,poll,read \"$LAB_BIN/fixture\" pipe",
      "intro": "EOF means end of file or stream. For a pipe, a reader reaches EOF after it reads any queued bytes and every descriptor for the write end has closed. A child can inherit a write descriptor and keep the pipe open without writing.",
      "question": "Which process still has the write end open when the first wait expires?",
      "evidence": "In Linux output, find the pipe identifier inside poll(). Match it to the pipe2() and close() lines. Check which process closes the writer before poll() returns 0 (Timeout). The program prints “no EOF before deadline”.",
      "task": "Record the pipe identifier and which process keeps the writer in Trace evidence and diagnosis. Choose Repaired under Case and select Run in Linux with the same command. Compare the parent’s poll() result and the return from read() on that same pipe.",
      "hint": "The fixture uses another pipe to hold the child alive while the parent waits. Track only the pipe in poll() for this question.",
      "explanation": "The parent closes its writer in both cases. The failing child retains its writer, so the wait expires. The repaired child closes its writer. The parent sees POLLHUP and read() returns zero, which means EOF here.",
      "transfer": "A descriptor marked close-on-exec closes when a new program replaces the current one. Would that flag close the writer if the child only forks and keeps running the same program?",
      "reference": [
        "Read the strace manual",
        "https://man7.org/linux/man-pages/man1/strace.1.html"
      ]
    },
    {
      "id": "refused",
      "section": "Loopback networking",
      "title": "Check why a connection was refused",
      "command": "strace -yy -e trace=bind,listen,connect,poll,getsockopt \"$LAB_BIN/fixture\" refused",
      "intro": "This example connects to a port inside the Linux guest. Nonblocking connect() can return EINPROGRESS, meaning it has begun but has not yet reported the outcome. The socket can become ready to write after success or failure. The SO_ERROR value reports the outcome.",
      "question": "How do you tell a completed connection attempt from a successful connection?",
      "evidence": "In Linux output, look for ECONNREFUSED. It can appear directly in connect() or inside the square brackets returned for SO_ERROR by getsockopt(). The return after the equals sign tells you whether getsockopt() succeeded in reading the value.",
      "task": "Record the connection error and its source in Trace evidence and diagnosis. Choose Repaired under Case and select Run in Linux with the same command. Find listen() in the repaired trace. Compare the connect() results and the value in brackets for SO_ERROR when present.",
      "hint": "The failing endpoint binds a port but never starts listening for TCP connections.",
      "explanation": "The failing connection gets ECONNREFUSED. The repaired endpoint listens and the connection reports SO_ERROR [0]. Seeing a readiness event or a successful getsockopt() call alone does not establish that the connection succeeded.",
      "transfer": "If connect() stayed in progress, what result from a timed poll() would tell you that the client’s wait expired?",
      "reference": [
        "Read the strace manual",
        "https://man7.org/linux/man-pages/man1/strace.1.html"
      ]
    },
    {
      "id": "deadline",
      "section": "Loopback networking",
      "title": "Separate connection success from a reply deadline",
      "command": "strace -T -yy -e trace=connect,poll,getsockopt,accept4,read,write \"$LAB_BIN/fixture\" deadline",
      "intro": "A client can connect successfully and still wait too long for a reply. This example has separate waits for connection completion and incoming data. The -T option prints the elapsed time for each system call in seconds, usually inside angle brackets.",
      "question": "Does the timeout happen while connecting or while waiting for a server reply?",
      "evidence": "In Linux output, read the SO_ERROR value in brackets. Then find the later poll() that requests POLLIN, readiness to read. Compare its return and elapsed time with the program’s message.",
      "task": "Record the SO_ERROR and POLLIN results in Trace evidence and diagnosis. Choose Repaired under Case and select Run in Linux with the same command. Compare the later poll() and look for the read() of \"R\". Which wait changed between cases?",
      "hint": "The connection wait asks for POLLOUT. The response wait asks for POLLIN and has a deadline of 300 milliseconds in this fixture.",
      "explanation": "The connection reports SO_ERROR [0] in both runs. In the failing run, the POLLIN wait returns 0 (Timeout). In the repaired run, the server writes one byte and the client reads it. The measured times describe these guest runs.",
      "transfer": "What evidence on the service side would help explain why a successful connection is slow to return data?",
      "reference": [
        "Read the strace manual",
        "https://man7.org/linux/man-pages/man1/strace.1.html"
      ]
    },
    {
      "id": "capstone",
      "section": "Capstone",
      "title": "Diagnose a CLI that only says startup failed",
      "command": "strace -f -yy -e trace=chdir,openat,execve,wait4 \"$LAB_BIN/fixture\" startup",
      "intro": "This example command-line program prints “startup failed”. Use the calls made after program launch to locate the first operation that prevents startup. The starter includes -f to follow any helper process.",
      "question": "Which failed operation explains the startup message, and why does it fail?",
      "evidence": "In Linux output, trace chdir() and the openat() call for conf/settings. Check for a child’s execve() after the configuration step. Some earlier file lookups are part of loading the program.",
      "task": "In Trace evidence and diagnosis, write the decisive call, its result, and how the earlier lines explain it. Choose Repaired under Case and select Run in Linux with the same command. Record one line confirming that configuration opened and a separate line confirming that a child ran a helper. Then compare with the worked diagnosis.",
      "hint": "Resolve the relative configuration path using the argument that went into chdir() before the failing openat().",
      "explanation": "The failing program switches into work, so conf/settings points to work/conf/settings. That file does not exist and the program stops before launching a child. The repaired run opens the configuration successfully and its child runs /bin/echo.",
      "transfer": "Which path and error would you put in the program’s startup message so a user could reach the same diagnosis without a trace?",
      "reference": [
        "Read the strace manual",
        "https://man7.org/linux/man-pages/man1/strace.1.html"
      ]
    }
  ],
  "assets": [
    "fixtures.c",
    "prepare.sh",
    "strace-x86"
  ]
};
