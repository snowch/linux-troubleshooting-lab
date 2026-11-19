function man(page, note, title) {
  const [name, section] = page.split('.');
  return {
    title: title ?? `${name}(${section})`,
    url: `https://man7.org/linux/man-pages/man${section.replace(/const$/, '')}/${page}.html`,
    note
  };
}
function trace(options, note) {
  return man('strace.1', note, 'strace · ' + options);
}

const open = man('open.2', 'openat(AT_FDCWD, path, flags) resolves a relative path from the process’s current directory. A nonnegative return value is a descriptor. ENOENT indicates a missing path or component.', 'openat()');
const chdir = man('chdir.2', 'chdir() changes the working directory used by later relative path lookups. A return value of 0 confirms the change.');
const errors = man('errno.3', 'ENOENT reports a missing path or component. EACCES reports a permission failure, which can include denied search permission on a parent directory.', 'errno · ENOENT and EACCES');
const exec = man('execve.2', 'execve() replaces the running program on success. ENOENT can mean the named file or its interpreter could not be found.');
const wait = man('wait4.2', 'wait4() reports a child’s state change. A decoded exit status of 127 is the fixture’s report of a failed launch. Read the child’s execve() result for the cause.');
const pipe = man('pipe.7', 'A pipe read returns EOF after all references to the write end are closed and queued bytes have been read.', 'Pipe lifetime and EOF');
const poll = man('poll.2', 'A return of 0 means the wait timed out. Inspect revents for readiness, errors or hangups when poll() returns a positive count.');
const setupTrace = trace('filters and child processes', 'Use -e trace= to select calls and -f to include children. With -yy, descriptor annotations help you follow files and sockets across the trace.');
const connect = man('connect.2', 'On a nonblocking socket, EINPROGRESS leaves connection setup pending. Wait for readiness and read SO_ERROR.');
const socketError = man('getsockopt.2', 'A successful getsockopt() return means the query worked. The SO_ERROR value it stores is the connection result. Zero means no pending error.', 'getsockopt(SO_ERROR)');

export const references = {
  'file-flow': [
    trace('descriptor annotations', '-yy shows the path or other identity where available. Use the annotation to follow a descriptor across calls.'),
    open, man('read.2', 'read() returns a byte count or -1 on failure. The repaired case reads the configuration bytes.'),
    man('close.2', 'After close(), the descriptor number is available for reuse.')
  ],
  'filter-failures': [trace('syscall class and status', '%file selects pathname calls. status=failed hides successful ones. Remove it when you need to see what succeeded just before an error.'), open, errors],
  'filter-path': [trace('path filters', '-P filters evidence to calls associated with that path. In this lesson the program passes an absolute pathname, so the spelling in the call matters.'), open],
  'string-limits': [
    trace('string display size', '-s sets the maximum string size printed in the trace. Inspect traces for sensitive data before sharing them.'),
    man('write.2', 'Compare the requested byte count and return value. The string display limit does not change the bytes handed to the kernel.')
  ],
  'attach-process': [
    trace('attach to an existing process', 'Pass -p PID instead of a command to attach to a process that is already running. Here the PID belongs to a process in the Linux guest.'),
    man('ptrace.2', 'Linux checks whether the tracer has permission to observe the target. Attachment stops and resumes the target under tracer control.'),
    man('proc_pid_status.5', 'TracerPid is zero when there is no tracer. The fixture waits until this field becomes nonzero before it opens the configuration.')
  ],
  'save-trace': [
    trace('trace output file', '-o names the trace file. The tracee retains its existing output streams. The example prints the saved file before cleaning up the case.'),
    open, man('write.2', 'The traced program can write to its standard output independently of where strace saves the trace.')
  ],
  'trace-per-process': [trace('per-process traces and timestamps', '-ff with -o writes a file for each traced PID. -ttt adds seconds since the epoch with fractional precision for comparing events.'), exec, wait],
  'syscall-summary': [
    trace('summary mode', '-c prints counts, errors and time per syscall. Its timing columns normally measure system CPU time. Use -w with -c to collect wall-clock syscall latency instead.'),
    open, errors
  ],
  'interrupted-read': [
    trace('interrupted and resumed calls', 'A split line can show a blocked syscall and its later result. ERESTARTSYS is an internal kernel restart result. Look at the subsequent trace and application output.'),
    man('sigaction.2', 'Set SA_RESTART when installing a handler to request automatic restart of eligible calls.'),
    man('signal.7', 'The effect of a caught signal depends on both the syscall and the SA_RESTART setting. Blocking reads from pipes are among the calls that can restart.'),
    man('sigreturn.2', 'The signal-return syscall restores the state from before the handler. Its name can differ by ABI.')
  ],
  'pending-signal': [
    trace('signal syscall names', 'Filter mask changes, sends and waits to see the path from sending a signal to consuming it. The 32-bit runtime can use two names for the timed wait.'),
    man('sigprocmask.2', 'A blocked signal can remain pending. Changing the thread mask controls which signals can be delivered normally.'),
    man('sigwaitinfo.2', 'sigtimedwait() consumes a pending signal from the supplied set. A timeout with no selected pending signal returns EAGAIN.', 'sigtimedwait(), sigwaitinfo()'),
    man('sigpending.2', 'sigpending() reports the pending signals that are currently blocked.')
  ],
  'thread-wait': [
    trace('thread tracing and call durations', '-f follows new threads, and -T prints elapsed time per syscall. Compare wait and wake addresses across thread IDs.'),
    man('futex.2', 'FUTEX_WAIT checks the shared word against its expected value before sleeping. FUTEX_WAKE wakes waiters on that word. The PRIVATE variants tell Linux the word is shared by threads in the same process.'),
    man('clone.2', 'clone() and clone3() create tasks with selectable sharing. CLONE_THREAD puts a worker in the same thread group.')
  ],
  'descriptor-limit': [
    trace('descriptor lifetime', 'Trace the process limit and the calls that allocate and close descriptors. -yy adds the associated device or file where available.'),
    man('getrlimit.2', 'RLIMIT_NOFILE is one greater than the highest descriptor number the process can open. Per-process exhaustion produces EMFILE.', 'RLIMIT_NOFILE'),
    open, man('close.2', 'close() releases the descriptor slot. The next open may reuse its number.')
  ],
  'space-error': [
    trace('write targets', '-yy displays the path or device associated with the destination descriptor. Keep open, write and sync in the same trace.'),
    man('full.4', 'Writes to /dev/full fail with ENOSPC. This device lets the fixture reproduce the error without filling a filesystem.'),
    man('fsync.2', 'fsync() returns success or an error separately from write(). A successful write alone does not guarantee durable storage.')
  ],
  'memory-limit': [
    trace('selecting memory and resource syscalls', 'Include prlimit64 and mmap2 because a libc wrapper can use a kernel syscall with a different name on x86.'),
    man('getrlimit.2', 'RLIMIT_AS limits virtual address space. A mapping request can return ENOMEM when it would exceed the process limit.', 'RLIMIT_AS'),
    man('mmap.2', 'Check the requested byte count and mapping flags. mmap() returns MAP_FAILED on error, and a successful address can be passed to munmap().')
  ],
  'terminal-control': [
    trace('decoding ioctl requests', 'strace decodes many ioctl request names. -yy adds the descriptor type so you can see why the requested operation applies or fails.'),
    man('ioctl.2', 'The request code controls how the kernel interprets the descriptor and argument. Unsupported requests can produce ENOTTY.'),
    man('TIOCGWINSZ.2const', 'TIOCGWINSZ queries a terminal’s window size. The guest console can return zero dimensions successfully.')
  ],
  'export-capstone': [
    trace('correlating saved process traces', 'Follow the PID in the parent’s wait result to the file for that worker. Check the path, descriptor and error in its trace.'),
    wait, man('write.2', 'A successful open does not guarantee a successful write. Find the returned byte count or the error for the worker’s write.'),
    man('fsync.2', 'The repaired worker synchronises its report after writing successfully.')
  ],
  'first-trace': [trace('system-call filters', 'Use -e trace=openat to show openat() calls with their file paths, flags, returned descriptors and error names.'), open, errors],
  'working-directory': [trace('filtering several call names', 'Use -e trace=chdir,openat to keep the directory change and subsequent file lookup in the same trace.'), chdir, open],
  permissions: [
    trace('syscall names and ABIs', 'This guest runs a 32-bit Linux ABI. The trace filter keeps both the older and 32-bit user and group ID call names.'),
    man('setuid.2', 'A privileged process can change its user ID with setuid(). The new credentials affect later permission checks.'),
    man('setgid.2', 'setgid() can set process group credentials before the fixture opens a protected file.'),
    errors, man('path_resolution.7', 'Linux checks search permission when walking each directory and checks the requested access on the resulting file.', 'Path lookup and permissions')
  ],
  children: [trace('following forked children', 'Add -f to trace processes spawned by the command. Match a child’s PID to its exit status in the parent’s wait4() call.'), exec, wait],
  pipeline: [
    setupTrace, pipe,
    man('dup.2', 'dup2() or dup3() can attach a specific descriptor number to a pipe end. Track whether standard output (1) or standard error (2) points to the pipe.', 'dup2(), dup3()'),
    man('write.2', 'The first argument identifies the descriptor that receives the bytes. Read its annotation to see where ping went.'),
    man('writev.2', 'writev() sends a list of buffers. Look for the byte count in iov_len beside the buffer shown at iov_base.')
  ],
  'pipe-eof': [setupTrace, pipe, man('close.2', 'Closing a descriptor removes that process’s reference. Check other processes for another open descriptor referring to the same pipe end.'), poll],
  refused: [trace('socket descriptor annotations', '-yy decodes socket details when available. Compare listen() and connect() on the same loopback port.'), man('listen.2', 'listen() marks a bound stream socket as accepting connections.'), connect, socketError, poll],
  deadline: [trace('time spent in a call', '-T displays the time spent in each call. Compare the final poll() duration after confirming SO_ERROR is zero.'), connect, socketError, poll],
  capstone: [setupTrace, chdir, open, exec, wait]
};
