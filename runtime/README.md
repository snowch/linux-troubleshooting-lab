# Browser Linux guest

The workbench runs Alpine Linux x86 in [v86](https://github.com/copy/v86), a WebAssembly-based PC emulator. Every lab uses the same Linux 6.18.64 kernel, GCC and matching Kbuild headers. The app transfers editable files over a guest-only virtio 9P share. Exercises run on loopback or local kernel interfaces. The emulator has no external network relay.

`files/` contains the static runtime. `guest-*.bin` are consecutive chunks of a LZ4-compressed Linux initramfs. The kernel, BIOS, WebAssembly and archive chunks load from the course’s own origin. Starting a new guest discards its temporary files.

Run `sh runtime/rebuild.sh` from an x86-64 Linux checkout to reproduce the guest archive from Alpine packages. The host needs Python 3, curl and liblz4. Alpine stable mirrors can rotate old package versions. `packages.tsv` lists the published guest's package versions, licences, source package names and corresponding build recipes. Each recipe links to its upstream sources and carries Alpine’s patches and build instructions. Neither the packaged kernel nor package executables are patched here.

The emulator comes from [v86 0.5.473](https://www.npmjs.com/package/v86/v/0.5.473), licensed under BSD-2-Clause. See [its bundled notice](files/v86-LICENSE.txt). The BIOS images are from the [v86 BIOS directory](https://github.com/copy/v86/tree/315b2b0b758703ef0e6cc7b4088d6068f83f3c20/bios) and use [SeaBIOS](https://www.seabios.org/) and [SeaVGABIOS](https://www.seabios.org/SeaVGABIOS) under LGPL-3.0.

The tracing lesson bundles the [BSD-3-Clause strace executable](../examples/STRACE-LICENSE.txt) from Alpine x86 package `strace-6.17-r0`. The matching shared libraries are included in the guest. See the [Alpine build recipe](https://gitlab.alpinelinux.org/alpine/aports/-/tree/491872d49266e28cd63814f78851e7ab44930bc8/main/strace).
