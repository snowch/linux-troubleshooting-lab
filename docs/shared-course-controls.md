# Shared course controls and Linux guest adapter

Copyright © 2026 Christopher Snow.

Use the [course design guide](https://github.com/snowch/cuda-python-lab/blob/main/docs/course-design-guide.md) for presentation and the [verified offline/update design](https://github.com/snowch/cuda-cpp-lab/blob/main/docs/offline-update-design.md) for release safety. This document records the Linux-specific adapter, not a competing visual standard.

## Lesson and header roles

The editable lesson is the primary interface. The header exposes Code runner, App status and Theme. Course lessons combines an inline grouped outline, progress and breadcrumbs; the current section and lesson remain visible when the outline is closed. References use locally packaged official Material Symbols, a topic-specific subtitle and a full-width disclosure. Completion is an explicit reversible mark, separate from execution results. Previous/next cards follow optional resources. The Linux console, resets and file exports stay in optional tools; opening a lesson never boots Linux.

Keep the existing lesson routes, source/draft keys, case selection, notes, excerpts and models. The current program is visible by default, with the existing controls for choosing a source file or jumping to an edit. Wide homepages put the image beside the introduction. Narrow homepages put it after the first action and course outline. Do not hide essential instructions in disclosures or replace actual guest output with illustrative values.

## Runner lifecycle

The existing v86 guest is retained between hash-route lessons in one reading window. Every course keeps its own guest and storage scope. An exclusive Web Lock prevents two windows from silently overwriting the same saved Linux files. Without Web Locks, each window uses an isolated archive and explains how to export it. This adapter does not pretend a Linux guest is a stateless compiler worker.

Header Start prepares the guest and acknowledges its resource explanation. An implicit first Run shows a persistent native modal before loading any guest asset; Escape cancels without starting Linux. Header Start followed by Run does not repeat that modal. Show real image-transfer percentages and indeterminate boot/build progress. CPU and memory are the learner device's resources; there are no invented CPU percentages or whole-browser memory estimates.

Default stopping time is 30 minutes without a run, with persisted 5/15/30/60-minute choices. Never stop an experiment, active shell command, file transfer or restart preparation. A manual shell session disables automatic stopping for that guest: the learner frees memory explicitly when finished. Manual-command completion uses a unique serial marker, not an assumption that output ends with a newline or the default prompt.

Free memory first creates a compressed archive of /root and /tmp in the guest, writes it to a separate IndexedDB database, then reads it back and verifies SHA-256. Only then destroy the guest and release ownership. A successful ordinary experiment also checkpoints those files. Saving failure keeps Linux running, gives persistent feedback and prevents repeated automatic save attempts. Download Linux files exports a standard tar.gz without deleting work. Saved-file recovery offers download and explicit discard; neither action clears lesson drafts, results or completion.

The next start verifies and extracts the archive into a fresh guest. Files survive; running processes, loaded kernel modules, open descriptors, debugger state and RAM do not. Other filesystem paths are outside this archive. Reset Linux explicitly removes temporary and saved guest files, after confirmation, while keeping lesson work. No device-driver code runs on the host kernel. External guest networking remains disabled.

## Offline releases and old open lessons

The build fingerprints its complete manifest and worker contract, pins executable dependencies to releases/<id>/, and publishes exact byte lengths and SHA-256 hashes. Runtime, BIOS, kernel, initrd parts, source files, fonts, icons and licences all live under this course's own Pages scope. Offline completeness includes all declared files, not just visited lessons. The service-worker installation does not download the guest.

Online top-level visits request current HTML; an already-open reading window keeps its pinned dependencies. Version checks are small and automatic. Save offline copy is an explicit full save. Update offline copy stages and verifies a newer complete copy, then offers Restart to update; it does not need a second offline download. Only successful whole-release verification permits Downloaded and ready to use offline. Interrupted updates leave the preceding complete copy usable. Repair reuses verified files. Before publication retain older immutable releases and original raw dependencies for older tabs; retention failure stops deployment.

The previous worker used offline.js, unpinned requests and a completion marker. Its complete legacy cache is preserved. During this one-time protocol migration the new worker may claim legacy clients without reloading them: it preserves their original raw dependencies and accepts their status/download messages. New documents use immutable dependencies. Empty or partial legacy caches are never described as complete. Subsequent worker changes follow the guarded update protocol. Keep src/offline.template.js as a test fixture for this migration, not a second active implementation.

Loading runner files is infrastructure feedback, not a learner program error. Keep the last genuine output and the editor contents. A persistent native alert dialog offers Reload lesson or Stay on lesson, with a dimmed backdrop and keyboard focus return. Do not stack it over another modal. Reload first saves and verifies the reading snapshot; failed storage blocks navigation. Ordinary compiler errors, intentional nonzero exits and valid edited results stay in Run output with their actual classification. No recovery action automatically executes code.

## Restart transaction and saved work

Use PREPARE_RESTART, ABORT_RESTART and COMMIT_RESTART for all affected course windows. Each window saves its own source representation, selected source/case, notes, latest and preceding real outputs, open disclosures, hash route and scroll in a verified IndexedDB record with a per-window session marker. Save full source separately from a displayed editable region so restoration cannot show code that differs from what Run compiles. While preparing, block editing/navigation. Active experiments, composition, manual shell sessions, unavailable source or failed storage veto the restart. Release selection changes only after every window acknowledges. Abort restores interaction; commit reloads the exact selected release and restores work without rerunning it.

The archive, reading snapshot, source drafts, durable output and completion are distinct stores with distinct purposes. Removing a downloaded course copy must not erase any of these stores or another lab. Browser storage and device shutdown can still evict or interrupt work; the UI must not claim an unconditional guarantee of permanence.

## Verification and interpretation

Run npm run check to validate the complete manifest against actual bytes, guest parts, lesson sources, references and examples. Run npm run test:browser for real Chromium journeys. The update fixture exercises the actual worker and snapshot protocol with small releases: complete legacy migration, empty-cache handling, two-window busy/storage veto, exact-release commit and offline reopening. Fixture output is recorded state, not evidence of a compiled Linux example.

The separate real-guest journey saves the complete course before any guest start, closes the browser, stops the HTTP server, reopens the same profile offline, then runs the original and suggested edited experiment. It also checks header Start followed by Run, first-use cancellation, two-window ownership, /root file preservation across Free memory/restart, durable code/output/completion, unvisited lesson source/API notes, keyboard outline control and three widths in both themes. Review adjacent lesson routes and source excerpts as part of content changes. Test guest execution errors separately from infrastructure failures and valid nonzero outcomes.

Passing these functional checks does not establish learning effectiveness or physical Android performance. Retain failed runs honestly, fix the cause, and rerun the affected journey before merging. Never relax an assertion just to make a transfer or a download look successful.

Recovery snapshot identity excludes the operational download and gpu-release query parameters, while keeping lesson hashes, search and step parameters. Recovery may remove those operational parameters before reloading; the same per-window snapshot must still restore. The small-release browser fixture verifies this path.
