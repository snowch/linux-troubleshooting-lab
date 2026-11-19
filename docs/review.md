# Course review

Learners start with a symptom and a trace question. Each lesson offers a live command, an editable evidence note, a hint, a repaired case and a transfer question. The single-column workbench keeps the command and output together. The control for switching cases retains the same trace command for comparison.

The lab teaches a workflow from reading one syscall to filtering, capturing, summarising and correlating traces. The case pairs cover syscall failures, descriptor lifetime, process and thread waits, and loopback network failures. Two capstones ask for the decisive trace line and confirmation in a repaired run. The exercise paths and timing are controlled fixtures local to the guest.

`npm run check` validates the commands, walkthrough excerpts, reference notes and offline inventory. Both cases of all 25 lessons ran in the packaged Alpine x86 guest with networking disabled. Checks covered exit status and trace evidence. The edited commands for child tracing, pathname and outcome filters, string limits, and summary mode also ran in that guest.

In Chromium, all 50 cases also ran with the browser offline after downloading the course. The pathname-filter edit and its evidence note survived a reload.

The exercises use the guest’s actual strace executable. Attaching is limited to guest processes. Guest syscall timings include emulator effects, and the trace-file examples print their files before the per-run directory is removed.

## Learner-facing course review

The opening audit used the published 42a44e0 build. It covered the overview and 25 lessons from the stated starting point of reading a basic shell command. It checked each lesson’s walkthrough, question, starter command, outcome, comparison, notes, worked diagnosis, transfer question and references.

The pipeline starter filtered out the actual writev() call for ping. The updated filter captures it and the walkthrough identifies the descriptor, four-byte buffer and wc count. Some changes lacked a clear control, position or run step. The revised tasks name those actions and the trace fields that answer the question. The workbench makes the trace editor visible in lessons that require a command edit.

The opening workbench retained shared console output when the user switched lesson or case. It also reported unconditional saving and let the virtual hardware capture keyboard activity. The revised workbench labels the case, run and source, restores the relevant output during the visit and puts the interactive shell in a separate disclosure. The status distinguishes guest preparation and interruption from the command’s exit status. A failing fixture can supply useful trace evidence with a nonzero status. Existing command, note and case keys remain available. If storage rejects a write, the current tab retains the work and can export a copy. Hardware input adapters are disabled so the workbench receives keyboard input.

The closing audit repeated the wording and interface checks on the revised course. Validation covered 208 combinations of route, viewport and theme, including Chromium keyboard navigation, retained work and simulated blocked saves. These checks establish functional behaviour. Learner understanding remains unmeasured.
