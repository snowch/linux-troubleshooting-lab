# Sourced by the workbench to prepare a fresh case directory.
mkdir -p "$LAB_BIN"
if [ ! -x "$LAB_BIN/fixture" ]; then
    echo 'Building the lab fixtures in Linux…'
    cp /exchange/strace-fixtures.c "$LAB_BIN/fixtures.c"
    cp /exchange/strace-diagnostics.c "$LAB_BIN/diagnostics.c"
    gcc -std=c11 -Wall -Wextra -Werror -pthread "$LAB_BIN/fixtures.c" "$LAB_BIN/diagnostics.c" -o "$LAB_BIN/fixture.next"
    mv "$LAB_BIN/fixture.next" "$LAB_BIN/fixture"
fi
if [ ! -x "$LAB_BIN/strace" ]; then
    cp /exchange/strace-strace-x86 "$LAB_BIN/strace"
    chmod 755 "$LAB_BIN/strace"
fi
mkdir -m 755 "$LAB_WORK"
cd "$LAB_WORK"
mkdir -m 755 conf work
printf 'ready\n' > conf/settings
cp conf/settings conf/public
cp conf/settings conf/private
chmod 644 conf/settings conf/public
chmod 600 conf/private
