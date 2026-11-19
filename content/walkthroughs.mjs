const step = (heading, text, code) => ({ heading, text, code });
const guide = (goal, look, edit, ...steps) => ({ goal, look, edit, steps });

export const walkthroughs = {
  'first-trace': guide(
    'A program says “startup failed”. Start with one question you can answer from the kernel’s evidence. Which path was it trying to open?',
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
    'Find the identity change, then compare EACCES for conf/private with the successful open of conf/public.',
    'variant',
    step('Follow changes in the process identity', 'The trace includes the calls that switch the fixture to its service user. The guest can show the 32-bit syscall names.', 'setuid,setuid32,setgid,setgid32'),
    step('Trace the failing open under that identity', 'The fixture tries one existing configuration file. The error from openat() tells you why that file could not be read.', '"$LAB_BIN/fixture" permission')),
  children: guide(
    'A parent reports that its helper failed. Start with the parent’s trace, then follow the child to locate the failed call.',
    'The parent observes status 127. Adding -f reveals the child’s execve("./missing-helper", …) and ENOENT.',
    'command',
    step('Trace the parent’s waits', 'wait4() reports the child’s exit status. Without -f, the trace shows the parent’s own system calls, even when the failure happened somewhere else.', 'strace -e trace=execve,wait4'),
    step('Start the fixture with a helper process', 'The launch case forks a child. Keep this target and add -f to the strace options for the second run.', '"$LAB_BIN/fixture" launch')),
  pipeline: guide(
    'Follow four bytes of text through a shell pipeline and explain why the consumer might count zero.',
    'Find the write containing ping. The failing writer sends it to the terminal and wc reads zero bytes. The repaired writer sends four bytes into the pipe.',
    'variant',
    step('Follow both sides with descriptor annotations', '-f follows children, and -yy describes what a descriptor refers to. Focus on the write carrying the text.', 'strace -f -yy -e trace=pipe,pipe2,dup2,dup3,write'),
    step('Notice the redirect in the failing case', 'The shell routes the producer’s output to descriptor 2. That leaves the pipe empty for wc, which reads its own standard input.', 'printf ping >&2 | wc -c')),
  'pipe-eof': guide(
    'Explain why an empty pipe has no EOF while a child still owns a copy of its writer.',
    'Identify the pipe the parent polls. Compare its deadline with the repaired POLLHUP and read returning zero.',
    'variant',
    step('Track the pipe across processes', 'pipe2() creates both ends, and close() releases a descriptor. With -f and -yy you can compare the same pipe identifier across parent and child.', 'strace -f -yy -e trace=pipe2,close,poll,read'),
    step('Wait for the end of the stream', 'The case uses poll() to bound the wait. The next read returns zero once the last writer is gone.', '"$LAB_BIN/fixture" pipe')),
  refused: guide(
    'Find out whether a writable socket really connected. The fixture makes both attempts locally inside the guest.',
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
    step('Trace the system calls that separate your hypotheses', 'The starter includes path lookup and process launch calls. Narrow that list if it makes the important evidence easier to see.', 'strace -f -yy -e trace=chdir,openat,execve,wait4'),
    step('Run the complete startup case', 'This fixture combines what you learned about paths and child processes. A failure in an earlier operation can prevent later calls from appearing at all.', '"$LAB_BIN/fixture" startup')),
};
