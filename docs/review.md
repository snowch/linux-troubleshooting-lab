# Course review

Learners start with a symptom and a trace question. Each lesson offers a live command, an editable evidence note, a hint, a repaired case and a transfer question. The single-column workbench keeps the command and output together. The control for switching cases retains the same trace command for comparison.

All nine starter commands and both variants ran in the packaged Alpine x86 guest. Verification covered the expected process status and diagnostic evidence, including ENOENT, EACCES, the child wait status, pipe EOF, SO_ERROR and POLLIN timeout. In the child lesson, testing also used the requested -f edit. The exercise paths and timing are controlled fixtures local to the guest.

`npm run check` validates the built lesson metadata and the offline inventory. The command uses the guest's actual strace executable.
