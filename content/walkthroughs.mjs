const step = (heading, text, code) => ({ heading, text, code });
const guide = (goal, look, edit, ...steps) => ({ goal, look, edit, steps });

export const walkthroughs = {
  "file-flow": guide(
    "Follow a configuration file from open to close. Use descriptor annotations to pick out the reads belonging to that file.",
    "Find the openat() for conf/setting. It returns -1, so there is no corresponding read on that file.",
    "variant",
    step("Show the descriptor’s path", "-yy annotates a descriptor with its associated file when that information is available.", "strace -yy"),
    step("Keep the calls for the file’s lifetime", "Track the same descriptor through creation, use and release. Startup can open other files first.", "-e trace=openat,read,close")
  ),
  "filter-failures": guide(
    "Narrow a noisy trace by system call class and by outcome. Look for the path tied to the application symptom.",
    "Locate the failed conf/setting lookup. Other failures can belong to ordinary startup probes.",
    "command",
    step("Select a syscall class", "%file includes pathname-taking calls such as openat() and chdir().", "-e trace=%file"),
    step("Select a syscall outcome", "status=failed keeps only calls with a kernel-reported error. It can hide context needed to explain the failure.", "-e status=failed")
  ),
  "filter-path": guide(
    "Filter on the expected configuration path, then test whether a spelling mistake can make the trace appear empty.",
    "The failing program reports startup failed. The expected configuration path has no matching line.",
    "command",
    step("Supply an absolute path", "LAB_WORK holds the absolute path to the current case directory. An absolute path starts at /. Use -P to keep calls associated with that path.", "-P \"$LAB_WORK/conf/settings\""),
    step("Limit the operations", "Intersect the path filter with the calls for opening, reading and closing.", "-e trace=openat,read,close")
  ),
  "string-limits": guide(
    "A trace can shorten string arguments even when the program writes the entire message. Inspect how much detail the trace shows.",
    "The write line shows a shortened string and a return value larger than eight. The application prints the full message.",
    "command",
    step("Limit the printed argument", "-s sets how many bytes strace prints for string arguments. The lab uses sample text only.", "strace -s 8"),
    step("Keep one output call in view", "Filter on write() so the argument and return value are easy to compare.", "-e trace=write")
  ),
  "attach-process": guide(
    "Start a guest process before starting the tracer. The fixture waits for an attachment before opening its configuration file.",
    "Find the attachment message and the later openat() for the configuration. The fixture’s earlier startup can be absent.",
    "variant",
    step("Start the program in the background", "A PID is the number Linux assigns to a process. The shell puts the PID of the background guest process in $!.", "\"$LAB_BIN/fixture\" attach &\npid=$!"),
    step("Attach to the recorded PID", "Use -p for a process already running. Attachment depends on ptrace permissions.", "strace -e trace=openat -p \"$pid\"")
  ),
  "save-trace": guide(
    "Write the trace to a file so the program’s output and the diagnostic evidence can be read separately.",
    "The program prints startup failed first. The saved file contains the openat() failure and process-exit line.",
    "variant",
    step("Send tracer output to a file", "The trace file is separate from the program’s standard output.", "strace -o calls.log"),
    step("Review the saved evidence", "The file is printed before this run’s temporary directory is removed. Copy any traces you want to keep into Trace evidence and diagnosis.", "cat calls.log")
  ),
  "trace-per-process": guide(
    "Follow a parent and child while writing their traces to separate files. Use the timestamps and child PID to place events in order.",
    "Find the child’s missing-helper ENOENT and match its file suffix to the PID returned by wait4() in the parent’s file.",
    "variant",
    step("Follow children and name each file", "-ff follows new processes and writes one trace per process when used with -o. The -ttt option adds a timestamp in seconds from a common starting point so you can compare the files.", "strace -ff -ttt -o trace"),
    step("Read files with their PID suffixes intact", "The loop prints the name of each trace before its contents.", "printf '\\n%s\\n' \"$file\"\n    cat \"$file\"")
  ),
  "syscall-summary": guide(
    "Count calls before examining every line. Both cases can read their required file, but one makes repeated unnecessary probes.",
    "Find the openat row. The failing case attempts the optional path twelve times and still completes the required read.",
    "command",
    step("Collect a summary table", "-c aggregates call counts, errors and time. It omits individual arguments and the order of events.", "strace -c"),
    step("Count the operations under investigation", "Include file opens, reads and closes so the repeated probes can be compared with completed reads.", "-e trace=openat,read,close")
  ),
  "interrupted-read": guide(
    "A process waits for a pipe read. SIGUSR1 invokes a handler, a function that responds to the signal. The SA_RESTART flag asks Linux to retry eligible calls when the handler returns.",
    "Find the parent’s blocked read and SIGUSR1 delivery. The failing program reports that its read was interrupted.",
    "variant",
    step("Follow the writer that sends the signal", "-f shows the child’s kill() and write() alongside the parent’s trace.", "strace -f"),
    step("Keep the signal setup and I/O in view", "rt_sigaction installs the handler and flags. sigreturn or rt_sigreturn marks the return from the handler.", "-e trace=read,write,kill,rt_sigaction,sigreturn,rt_sigreturn")
  ),
  "pending-signal": guide(
    "The program blocks normal delivery of SIGUSR1 and sends the signal to itself. The undelivered signal is pending. The wait’s argument determines which signal it can collect.",
    "Find the call that blocks SIGUSR1, the wait for SIGUSR2 and the later pending set with SIGUSR1.",
    "variant",
    step("Trace both waiting ABI names", "The 32-bit guest can use the older system call or the time64 version, which accepts 64-bit time values.", "rt_sigtimedwait,rt_sigtimedwait_time64"),
    step("Observe the mask and pending set", "The selected calls show what was blocked, sent and still queued at the end.", "kill,rt_sigprocmask,rt_sigpending")
  ),
  "thread-wait": guide(
    "A thread is an execution path inside a process. Here two threads share one memory word. A futex wait can pause the reader until the worker wakes it or the deadline expires.",
    "Find the timed FUTEX_WAIT_PRIVATE and its ETIMEDOUT result. Check whether a worker woke that same address.",
    "variant",
    step("Trace threads and measure each call", "-f includes the worker. -T reports elapsed call time, which can include time spent blocked.", "strace -f -T"),
    step("Keep creation and futex operations", "Track the worker ID and futex address. Startup may try one clone API before using another.", "-e trace=clone,clone3,futex")
  ),
  "descriptor-limit": guide(
    "A process opens the same device repeatedly. Follow the descriptor lifetime to distinguish a process limit from a device failure.",
    "Find the first open of /dev/null that fails with EMFILE. Earlier opens return distinct descriptor numbers.",
    "variant",
    step("Decode the resource setup and descriptor activity", "The trace shows the process limit and the calls that accumulate or release descriptors.", "-e trace=open,openat,close,setrlimit,prlimit64"),
    step("Separate kernel error from device identity", "Descriptor annotations identify /dev/null on successful opens and subsequent closes.", "strace -yy")
  ),
  "space-error": guide(
    "A report can open a destination successfully and still fail to write. The guest uses /dev/full to reproduce the error without consuming disk space.",
    "Find a successful open of /dev/full followed by a write that returns ENOSPC.",
    "variant",
    step("Identify the destination of a write", "-yy identifies /dev/full or the report path next to the descriptor.", "strace -yy"),
    step("Follow the entire write attempt", "A trace that includes open, write and fsync identifies the stage that failed.", "-e trace=open,openat,write,fsync,close")
  ),
  "memory-limit": guide(
    "A process sets a small virtual address-space limit and requests a buffer. Inspect the mapping size and its result.",
    "Find the 32 MiB mapping that fails with ENOMEM after RLIMIT_AS is set.",
    "variant",
    step("Observe the process limit", "The libc call can use prlimit64 or setrlimit. Both names are useful in the trace filter.", "setrlimit,prlimit64"),
    step("Recognise the x86 mapping syscall", "On 32-bit Linux the trace can show mmap2 for a libc mmap() call.", "mmap,mmap2,munmap")
  ),
  "terminal-control": guide(
    "An ioctl() call requests a special operation from an open descriptor. TIOCGWINSZ asks for the terminal’s dimensions. Identify what kind of file receives that request here.",
    "Find the ioctl on the descriptor for conf/settings and its ENOTTY result.",
    "variant",
    step("Show what the descriptor refers to", "-yy attaches path or device information to the descriptor in the ioctl line.", "strace -yy"),
    step("Keep opens, controls and closes together", "Follow the descriptor and the named ioctl request to the kernel’s reported result.", "-e trace=open,openat,ioctl,close")
  ),
  "export-capstone": guide(
    "An export process reports a generic failure after waiting for its worker. Build a diagnosis from the saved traces rather than assuming the parent caused the error.",
    "Parent and worker traces are separate. Follow the child PID to a successful open and later failed write on the same descriptor.",
    "variant",
    step("Capture evidence per process", "The timestamps and PID suffixes connect the parent’s wait status to the child’s operations.", "strace -ff -ttt -o trace"),
    step("Gather the file and process evidence", "Keep descriptor annotations and the key syscalls for determining whether the worker reached sync.", "-yy -e trace=open,openat,write,fsync,close,wait4")
  ),
  'first-trace': guide(
    'strace shows system calls, the requests a program makes to the Linux kernel. A successful openat() returns a file descriptor, the number the program uses for the open file.',
    'Find the openat() line with conf/setting. The return value is -1 and ENOENT means the path was not found.',
    'variant',
    step('Ask for only the calls relevant to the symptom', 'The program reads configuration at startup. This filter keeps openat() calls in view while skipping unrelated work.', 'strace -e trace=openat'),
    step('Give strace a program to start', '$LAB_BIN points to the directory containing the lab fixtures. The argument file chooses the missing-path case.', '"$LAB_BIN/fixture" file')),
  'working-directory': guide(
    'Compare two attempts to open the same relative filename. Look one call earlier to see where the lookup began.',
    'The failing process changes into work before openat() returns ENOENT. The relative filename remains conf/settings.',
    'variant',
    step('Include directory changes in the filter', 'chdir() can change the meaning of a relative path for subsequent calls. Keep it visible beside openat().', 'strace -e trace=chdir,openat'),
    step('Select the working-directory fixture', 'Both runs use the same configuration name. The selected case determines which directory the fixture enters.', '"$LAB_BIN/fixture" cwd')),
  permissions: guide(
    'Tell a path that is missing apart from a path that exists but cannot be read by the program’s user.',
    'Find the process’s change to user 65534. Compare EACCES (permission denied) for conf/private with the descriptor returned for conf/public.',
    'variant',
    step('Follow changes in the process identity', 'The trace includes the calls that switch the fixture to its service user. The guest can show the 32-bit syscall names.', 'setuid,setuid32,setgid,setgid32'),
    step('Trace the failing open under that identity', 'The fixture tries one existing configuration file. The error from openat() tells you why that file could not be read.', '"$LAB_BIN/fixture" permission')),
  children: guide(
    'A process is a running program. The process that starts another is its parent. Start with the parent’s trace, then follow its child to locate the failed call.',
    'The parent observes status 127. Adding -f reveals the child’s execve("./missing-helper", …) and ENOENT.',
    'command',
    step('Trace the parent’s waits', 'wait4() reports the child’s exit status. Without -f, the trace shows the parent’s own system calls, even when the failure happened somewhere else.', 'strace -e trace=execve,wait4'),
    step('Start the fixture with a helper process', 'The launch case forks a child. Keep this target and add -f to the strace options for the second run.', '"$LAB_BIN/fixture" launch')),
  pipeline: guide(
    'Follow four bytes of text through a shell pipeline and explain why the consumer might count zero.',
    'Find write() or writev() carrying ping. Check iov_len=4 and the descriptor annotation. If output interleaves, locate iov_base=\"0\" or iov_base=\"4\" to read the count sent by wc. iov_base displays the buffer contents here.',
    'variant',
    step('Follow both sides with descriptor annotations', '-f follows children, and -yy describes what a descriptor refers to. Focus on the write carrying the text.', 'strace -f -yy -e trace=pipe,pipe2,dup2,dup3,write,writev'),
    step('Notice the redirect in the failing case', 'The shell routes the producer’s output to descriptor 2. That leaves the pipe empty for wc, which reads its own standard input.', 'printf ping >&2 | wc -c')),
  'pipe-eof': guide(
    'Explain why an empty pipe has no EOF while a child still owns a copy of its writer.',
    'EOF means end of file or stream. Find the pipe in the parent’s poll() arguments. If the call is split across lines, match the continued poll line by the process number. The repaired read returns zero once all writers are closed and any queued bytes have been read.',
    'variant',
    step('Track the pipe across processes', 'pipe2() creates both ends, and close() releases a descriptor. With -f and -yy you can compare the same pipe identifier across parent and child.', 'strace -f -yy -e trace=pipe2,close,poll,read'),
    step('Wait for the end of the stream', 'The case uses poll() to bound the wait. The next read returns zero once the last writer is gone.', '"$LAB_BIN/fixture" pipe')),
  refused: guide(
    'Both endpoints use loopback, an address that sends traffic back inside the guest. Find out whether a ready-to-write event proves the client connected.',
    'Find ECONNREFUSED in the failing trace and SO_ERROR zero in the repaired one. In the repaired trace, identify the call that starts listening.',
    'variant',
    step('Keep the calls from setup through completion', 'The filter includes both the server setup and the client’s wait. A writable event can also report that connection setup failed.', 'strace -yy -e trace=bind,listen,connect,poll,getsockopt'),
    step('Compare a bound port with and without a listener', 'The failing case binds a local port without listening. The repaired case listens on that port, so the client can connect.', '"$LAB_BIN/fixture" refused')),
  deadline: guide(
    'An application is connected but reports a timeout. Locate the specific wait that expired.',
    'Both cases report SO_ERROR zero. Compare the later POLLIN waits. The failed case reaches its deadline, while the repaired case reads R.',
    'variant',
    step('Include call durations in the trace', '-T prints how long each call took in the guest. Use it beside the event type and return value to tell setup from a response wait.', 'strace -T -yy -e trace=connect,poll,getsockopt,accept4,read,write'),
    step('Run the reply-deadline fixture', 'The server accepts the connection in both cases. The selected case controls whether it sends the expected byte.', '"$LAB_BIN/fixture" deadline')),
  capstone: guide(
    'Produce a short diagnosis for a CLI that prints only “startup failed”. Find the first call that blocks the application’s own startup and collect evidence that the repair worked.',
    'Record the failing call and its context before opening the explanation. In the repaired run, check both configuration loading and child startup.',
    'command',
    step('Trace the system calls that separate your hypotheses', 'The starter includes both path lookup and helper launch. Temporarily focus on the path lookup before restoring the starter to confirm that the helper ran.', 'strace -f -yy -e trace=chdir,openat,execve,wait4'),
    step('Run the complete startup case', 'This fixture combines what you learned about paths and child processes. A failure in an earlier operation can prevent later calls from appearing at all.', '"$LAB_BIN/fixture" startup')),
};
