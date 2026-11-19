function man(page, note, title) {
  const [name, section] = page.split('.');
  return {
    title: title ?? `${name}(${section})`,
    url: `https://man7.org/linux/man-pages/man${section}/${page}.html`,
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
    man('write.2', 'The first argument identifies the descriptor that receives the bytes. Read its annotation to see where ping went.')
  ],
  'pipe-eof': [setupTrace, pipe, man('close.2', 'Closing a descriptor removes that process’s reference. Check other processes for another open descriptor referring to the same pipe end.'), poll],
  refused: [trace('socket descriptor annotations', '-yy decodes socket details when available. Compare listen() and connect() on the same loopback port.'), man('listen.2', 'listen() marks a bound stream socket as accepting connections.'), connect, socketError, poll],
  deadline: [trace('time spent in a call', '-T displays the time spent in each call. Compare the final poll() duration after confirming SO_ERROR is zero.'), connect, socketError, poll],
  capstone: [setupTrace, chdir, open, exec, wait]
};
