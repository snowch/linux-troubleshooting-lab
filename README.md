# Linux Troubleshooting Lab

[Open the lab](https://snowch.github.io/linux-troubleshooting-lab/).

Use real `strace` to find evidence for Linux failures. Start with files, working directories and permissions. Follow child processes, redirections and inherited pipe descriptors. Diagnose refused connections and response deadlines on loopback. Finish by explaining a CLI that reports only “startup failed”.

Each lesson has an editable trace command, a failing and repaired fixture, space to record evidence, a hint and a worked explanation. Commands and notes are saved per lesson. The isolated Alpine Linux guest runs in WebAssembly. It has no external network relay.

Choose **Download for offline use** while connected and wait for **Available offline**. Allow roughly 145 MB of browser storage, then reopen the same URL in the same browser profile. The trace tool, fixtures, Linux image and lessons are included.

## Develop

Use Node.js 22 or later. Run `npm run check` to build and validate the site or `npm run dev` to serve it locally. GitHub Actions publishes `dist/` to Pages. See [the guest notes](runtime/README.md) for runtime and package sources.
