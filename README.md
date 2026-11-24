# Linux Troubleshooting with strace Lab

[Open the lab](https://snowch.github.io/linux-troubleshooting-lab/).

Use real `strace` to find evidence for Linux failures in 25 short lessons.

- Read return values and errors, then filter by syscall, outcome or path. Follow files, permissions, child processes and inherited pipe descriptors.
- Attach to a running guest process. Adjust string display, save trace files with timestamps, follow individual process traces and compare syscall summaries.
- Diagnose interrupted reads, pending signals, futex timeouts, descriptor exhaustion, failed writes and memory mappings, and terminal requests on the wrong descriptor.
- Distinguish a refused loopback connection from a reply timeout. Use two capstones to diagnose startup and export failures from trace evidence.

Each lesson has an editable trace command, a failing and repaired fixture, space to record evidence, a hint and a worked diagnosis. Switch cases to reread their latest output during the visit. Browser storage saves commands and notes per lesson when available. Use **Download command and notes** to keep a separate copy. The isolated Alpine Linux guest runs in WebAssembly. It has no external network relay.

The lab traces processes inside the guest. Use a native Linux session to attach to processes on your own machine or measure production timings. The saved-trace exercises display their trace files before the guest removes the run directory.

Choose **App status → Save offline copy** while connected and wait for **Downloaded and ready to use offline**. Allow roughly 145 MB of browser storage, then reopen the same URL in the same browser profile. The trace tool, fixtures, Linux image and lessons are included.

## Develop

Use Node.js 22 or later. Run `npm run check` to build and validate the site or `npm run dev` to serve it locally. GitHub Actions publishes `dist/` to Pages. See [the guest notes](runtime/README.md) for runtime and package sources.
