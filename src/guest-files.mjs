// Copyright © 2026 Christopher Snow. Guest files are separate from downloads and lesson drafts.
let releaseOwner,
  isolatedKey,
  isolationAnnounced = false;
function storageKey(slug) {
  if (navigator.locks) return slug;
  if (!isolatedKey) {
    try {
      isolatedKey = sessionStorage.getItem("linux-lab:guest-window");
      if (!isolatedKey) {
        isolatedKey = crypto.randomUUID();
        sessionStorage.setItem("linux-lab:guest-window", isolatedKey);
      }
    } catch {
      isolatedKey = crypto.randomUUID();
    }
  }
  if (!isolationAnnounced) {
    isolationAnnounced = true;
    dispatchEvent(
      new CustomEvent("lab-storage-unavailable", {
        detail:
          "This browser cannot coordinate Linux between windows. Saved Linux files belong to this window; download a backup before closing it.",
      }),
    );
  }
  return slug + ":window:" + isolatedKey;
}
export async function acquireGuestOwnership(slug) {
  if (releaseOwner || !navigator.locks) return;
  await new Promise((resolve, reject) => {
    navigator.locks
      .request(
        "linux-lab:" + slug + ":guest",
        { ifAvailable: true },
        async (lock) => {
          if (!lock) {
            reject(
              Error(
                "Linux is already running in another window of this lab. Free memory there before starting it here.",
              ),
            );
            return;
          }
          await new Promise((release) => {
            releaseOwner = release;
            resolve();
          });
        },
      )
      .catch(reject);
  });
}
export function releaseGuestOwnership() {
  releaseOwner?.();
  releaseOwner = undefined;
}
const request = (operation) =>
  new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error);
  });
async function database() {
  const open = indexedDB.open("linux-lab-guest-files-v1", 1);
  open.onupgradeneeded = () => open.result.createObjectStore("archives");
  return request(open);
}
async function hash(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function guestCommand(vm, code, timeout = 60000) {
  const marker = "__FILES_" + crypto.randomUUID().replaceAll("-", "") + "_";
  let line = "";
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        finish(
          Error(
            "Linux did not finish saving its files. The guest is kept running.",
          ),
        ),
      timeout,
    );
    function finish(error) {
      clearTimeout(timer);
      vm.remove_listener("serial0-output-byte", receive);
      error ? reject(error) : resolve();
    }
    function receive(byte) {
      if (byte === 10) {
        if (line.startsWith(marker)) {
          const exit = line.slice(marker.length);
          finish(
            exit === "0"
              ? null
              : Error("Linux file transfer failed (status " + exit + ")."),
          );
        }
        line = "";
      } else if (byte !== 13)
        line = (line + String.fromCharCode(byte)).slice(-300);
    }
    vm.add_listener("serial0-output-byte", receive);
    vm.serial0_send(`\n( ${code} ); printf '\\n${marker}%s\\n' "$?"\n`);
  });
}
export async function savedGuestFiles(slug) {
  let db;
  try {
    db = await database();
  } catch (error) {
    dispatchEvent(
      new CustomEvent("lab-storage-unavailable", {
        detail:
          "Linux files cannot be saved in this browser. Keep this tab open and export important files before leaving.",
      }),
    );
    return null;
  }
  try {
    const value = await request(
      db.transaction("archives").objectStore("archives").get(storageKey(slug)),
    );
    if (!value) return null;
    if (
      value.schema !== 1 ||
      !(value.bytes instanceof Uint8Array) ||
      (await hash(value.bytes)) !== value.sha256
    )
      throw Error(
        "The saved Linux files could not be verified. Open Code runner to download the saved files before discarding them.",
      );
    return value;
  } finally {
    db.close();
  }
}
export async function captureGuestFiles(vm) {
  await guestCommand(vm, "tar -czf /exchange/guest-work.tar.gz -C / root tmp");
  const bytes = await vm.read_file("guest-work.tar.gz");
  if (
    !(bytes instanceof Uint8Array) ||
    !bytes.byteLength ||
    bytes.byteLength > 256 * 1024 * 1024
  )
    throw Error(
      "The Linux work archive is empty or exceeds 256 MB. Export important files before freeing memory.",
    );
  return bytes;
}
export async function saveGuestFiles(vm, slug) {
  const bytes = await captureGuestFiles(vm);
  const value = {
    schema: 1,
    bytes,
    sha256: await hash(bytes),
    savedAt: Date.now(),
  };
  const db = await database();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("archives", "readwrite");
      tx.objectStore("archives").put(value, storageKey(slug));
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () =>
        reject(tx.error || Error("The browser could not save Linux files."));
    });
  } finally {
    db.close();
  }
  const check = await savedGuestFiles(slug);
  if (check?.sha256 !== value.sha256)
    throw Error("The browser did not retain the Linux work archive.");
  return value;
}
export async function restoreGuestFiles(vm, slug) {
  const value = await savedGuestFiles(slug);
  if (!value) return false;
  await vm.create_file("guest-work-restore.tar.gz", value.bytes);
  await guestCommand(vm, "tar -xzf /exchange/guest-work-restore.tar.gz -C /");
  return true;
}
export async function clearGuestFiles(slug) {
  const db = await database();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("archives", "readwrite");
      tx.objectStore("archives").delete(storageKey(slug));
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function rawSavedGuestFiles(slug) {
  const db = await database();
  try {
    const saved = await request(
      db.transaction("archives").objectStore("archives").get(storageKey(slug)),
    );
    if (!(saved?.bytes instanceof Uint8Array) || !saved.bytes.byteLength)
      throw Error("There are no saved Linux files for this lab.");
    return saved.bytes;
  } finally {
    db.close();
  }
}
