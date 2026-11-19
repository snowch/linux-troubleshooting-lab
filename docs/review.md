# Course review

Learners start with a symptom and a trace question. Each lesson offers a live command, an editable evidence note, a hint, a repaired case and a transfer question. The single-column workbench keeps the command and output together. The control for switching cases retains the same trace command for comparison.

The lab teaches a workflow from reading one syscall to filtering, capturing, summarising and correlating traces. The case pairs cover syscall failures, descriptor lifetime, process and thread waits, and loopback network failures. Two capstones ask for the decisive trace line and confirmation in a repaired run. The exercise paths and timing are controlled fixtures local to the guest.

`npm run check` validates the commands, walkthrough excerpts, reference notes and offline inventory. Both cases of all 25 lessons ran in the packaged Alpine x86 guest with networking disabled. Checks covered exit status and trace evidence. The edited commands for child tracing, pathname and outcome filters, string limits, and summary mode also ran in that guest.

The exercises use the guest’s actual strace executable. Attaching is limited to guest processes. Guest syscall timings include emulator effects, and the trace-file examples print their files before the per-run directory is removed.
