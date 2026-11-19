export const course = {
  "slug": "linux-troubleshooting-lab",
  "title": "Linux Troubleshooting Lab",
  "overview": {
    "description": "Use strace to explain file and permission errors, failed children, pipes that hang and loopback connection failures. Record the trace evidence and test your diagnosis against a repaired case.",
    "prerequisites": "Be comfortable reading a shell command. Each case opens with a trace command you can edit and run."
  },
  "instructions": "Run the command in Linux. Narrow the trace in the editor, record the evidence, then compare with the repaired case.",
  "lessons": [
    {
      "id": "first-trace",
      "section": "Files and paths",
      "title": "Find the file that failed to open",
      "command": "strace -e trace=openat \"$LAB_BIN/fixture\" file",
      "intro": "strace prints system calls and what the kernel returned. This program reports only “startup failed”. Trace its attempts to open a file and find the one that explains the message.",
      "question": "Which exact path did the program try, and what error did the kernel report?",
      "task": "Record the failing call and the path. Switch Case to Repaired and run the same command. Check whether the same call now returns an open descriptor.",
      "hint": "Look for an openat() call involving conf near the end of the trace. Earlier calls belong to program startup.",
      "explanation": "The failing run opens conf/setting and gets ENOENT. The repaired run opens conf/settings and gets a nonnegative descriptor.",
      "transfer": "How would you include read() and close() in the trace to follow that descriptor?",
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
      "intro": "Relative paths start at the process’s working directory when openat() receives AT_FDCWD. Include directory changes to see where a relative path was resolved.",
      "question": "Why can the same relative path succeed in one run and fail in another?",
      "task": "Compare chdir() and openat() in both cases. In your notes, write the path each process tries relative to the exercise directory.",
      "hint": "The relative filename does not change. Look for the preceding call that changes the directory.",
      "explanation": "The failing process changes into work and tries work/conf/settings. The repaired process stays in the exercise directory and opens conf/settings.",
      "transfer": "What would change if the program used an absolute path or passed an explicit directory descriptor to openat()?",
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
      "intro": "This fixture switches to a service user before trying to open the configuration. The kernel reports a different error for denied access than for a missing path.",
      "question": "What trace line shows that the startup failure is an access problem?",
      "task": "Compare the error and filename across cases. Describe the relevant permission difference in your notes.",
      "hint": "The file conf/private exists. The service user can open conf/public.",
      "explanation": "The request for conf/private gets EACCES. The repaired fixture opens a file readable by the service user. The two errors EACCES and ENOENT require different diagnoses.",
      "transfer": "What additional evidence would help if EACCES came from a parent directory?",
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
      "intro": "A parent can report a child failure without making the failing call itself. strace without -f traces only the initial process.",
      "question": "Which command did the child try, and what evidence did the parent see?",
      "task": "Run once as shown, then add -f and run again. Find the failing execve() and the child exit reported by wait4(). Compare with the repaired case.",
      "hint": "The first trace can show the wait status but lacks the child’s syscall history.",
      "explanation": "The child tries ./missing-helper and gets ENOENT. It exits with status 127. With -f, the trace shows both facts. The repaired child successfully execs /bin/echo.",
      "transfer": "What flag would you use with -f and -o to save a separate file for each traced process?",
      "reference": [
        "Read the strace manual",
        "https://man7.org/linux/man-pages/man1/strace.1.html"
      ]
    },
    {
      "id": "pipeline",
      "section": "Processes and descriptors",
      "title": "Trace where a pipeline sent its bytes",
      "command": "strace -f -yy -e trace=pipe,pipe2,dup2,dup3,write /bin/sh -c 'if [ \"$LAB_VARIANT\" = fixed ]; then printf ping | wc -c; else printf ping >&2 | wc -c; fi' ",
      "intro": "A shell uses descriptors to connect a pipeline. -yy annotates descriptors so you can follow which calls went to the pipe and which went to the terminal.",
      "question": "Why does the broken pipeline print zero even though printf wrote four bytes?",
      "task": "Identify printf’s write() of ping in both cases. Record the descriptor destination and compare the count produced by wc.",
      "hint": "In the failing case the shell redirects printf to standard error. That destination is separate from the pipeline’s input.",
      "explanation": "The failing run sends ping to the terminal and wc reads an empty stream. The repaired run writes ping into the pipe and wc counts four bytes.",
      "transfer": "How would you use -e trace=read to find the corresponding read() without collecting unrelated system calls?",
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
      "intro": "A pipe reader sees EOF only after every descriptor referring to the write end closes. A child can inherit a writer even if it never writes any bytes.",
      "question": "Which process keeps the pipe from reaching EOF?",
      "task": "Follow the pipe identifier from pipe2() through the parent and child close() calls. Compare poll() and read() in the repaired case.",
      "hint": "The fixture uses a second pipe to keep the child alive during the wait. Identify the pipe the parent passes to poll().",
      "explanation": "The parent closes its copy of the main pipe writer. The failing child retains its inherited copy, so poll() times out. Closing it in the repaired run produces POLLHUP and read() returns zero.",
      "transfer": "Why would FD_CLOEXEC help if the child called exec, and why would it leave the fork-only case unchanged?",
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
      "intro": "Nonblocking connect() can return EINPROGRESS. Writability says the attempt completed. SO_ERROR tells you whether the connection succeeded.",
      "question": "Does a writable socket establish that the connection succeeded?",
      "task": "Find the SO_ERROR result in both cases. Check which call appears before a successful connection.",
      "hint": "The failing endpoint reserves a local port without listening on it. The repaired endpoint calls listen().",
      "explanation": "The unsuccessful connection reports ECONNREFUSED, either immediately or through SO_ERROR after poll(). The repaired run reports SO_ERROR zero.",
      "transfer": "If the program saw neither a completion event nor a socket error, what evidence would show its own connect deadline had expired?",
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
      "intro": "An established connection can still have no response. -T adds the duration of each call so you can identify the operation where the application waited.",
      "question": "Did the failing run time out while connecting or while waiting for data?",
      "task": "Find SO_ERROR and the later poll() for POLLIN. Compare the result and duration with the repaired case.",
      "hint": "Connect completion uses POLLOUT. The later wait asks for POLLIN and has its own deadline.",
      "explanation": "SO_ERROR is zero in both runs. The failing POLLIN wait returns zero after its deadline. The repaired server writes a byte and the client receives it. The times are measurements of this guest run.",
      "transfer": "What additional data would you collect to diagnose a slow service outside this isolated guest?",
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
      "intro": "The CLI prints a generic failure. Form a hypothesis, narrow the trace and find evidence that explains the first failed startup step.",
      "question": "What is the first failed startup operation that matters, and why does it fail?",
      "task": "Save the decisive trace line and your diagnosis before opening the worked explanation. Run the repaired case to verify both configuration loading and child startup.",
      "hint": "Compare the calls leading up to the failure. An unrelated startup lookup may also return ENOENT before the application begins.",
      "explanation": "The CLI changes into work and cannot open conf/settings from there. It never gets as far as launching the helper. The repaired run opens configuration from the correct working directory and its child execs /bin/echo.",
      "transfer": "How would you change this CLI’s error reporting so a user could reach the same diagnosis without strace?",
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
