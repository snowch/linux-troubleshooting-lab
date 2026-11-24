// Copyright © 2026 Christopher Snow. Real guest and disconnected-server journeys.
const { chromium, expect } = require("playwright/test");
const { createServer } = require("node:http"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict");
const { createReadStream } = require("node:fs");
(async () => {
  const root = path.resolve("dist"),
    profile = await fs.mkdtemp(path.join(os.tmpdir(), "linux-course-"));
  const server = createServer(async (req, res) => {
    try {
      let name = new URL(req.url, "http://local").pathname;
      if (!name.startsWith("/course/")) throw Error();
      name = name.slice("/course/".length) || "index.html";
      const file = path.resolve(root, name);
      if (!file.startsWith(root + path.sep)) throw Error();
      const info = await fs.stat(file);
      res.writeHead(200, {
        "Content-Type":
          {
            ".html": "text/html",
            ".mjs": "text/javascript",
            ".js": "text/javascript",
            ".css": "text/css",
            ".json": "application/json",
            ".wasm": "application/wasm",
            ".svg": "image/svg+xml",
          }[path.extname(file)] || "application/octet-stream",
        "Content-Length": info.size,
        "Cache-Control": "no-store",
      });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port + "/course/";
  const options = {
    headless: true,
    executablePath: process.env.CHROMIUM || "/usr/bin/chromium",
    viewport: { width: 390, height: 900 },
  };
  let context;
  async function open() {
    context = await chromium.launchPersistentContext(profile, options);
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    return p;
  }
  const example = require("./adapter-case.cjs");
  const errors = [];
  let online = true;
  try {
    let p = await open();
    await p.goto(base + "#" + example.id);
    await expect(p.locator("#source")).toBeEnabled();
    let guestRequests = 0;
    p.on("request", (r) => {
      if (/runtime\/(?:parts|libv86|v86|vmlinuz)/.test(r.url()))
        guestRequests++;
    });
    await p.locator("#run").click();
    await expect(p.locator("#runner-intro")).toBeVisible();
    await p.keyboard.press("Escape");
    assert.equal(
      guestRequests,
      0,
      "Cancelling first-use explanation must not start Linux",
    );
    for (const width of [390, 820, 1440])
      for (const theme of ["light", "dark"]) {
        await p.setViewportSize({ width, height: 1000 });
        await p.evaluate(
          (t) => (document.documentElement.dataset.theme = t),
          theme,
        );
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        for (const id of ["code-runner-open", "app-status-open", "theme"])
          await expect(p.locator("#" + id)).toBeVisible();
      }
    await p.setViewportSize({ width: 390, height: 900 });
    await p.locator("#course-toggle").click();
    await p.locator("#course-panel li a").nth(1).focus();
    await p.keyboard.press("Escape");
    await expect(p.locator("#course-panel")).toBeHidden();
    await expect(p.locator("#course-toggle")).toBeFocused();
    await p.locator("#lesson-complete").check();
    await p.locator("#app-status-open").click();
    await expect(p.locator("#download-update")).toHaveText(
      "Save offline copy",
      { timeout: 60000 },
    );
    await p.locator("#download-update").click();
    await expect(p.locator("#offline-status")).toContainText(
      "Downloaded and ready to use offline",
      { timeout: 300000 },
    );
    await p.locator("#app-status-close").click();
    console.log("Verified complete course saved before any guest start.");
    await context.close();
    context = null;
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    online = false;
    p = await open();
    await context.setOffline(true);
    await p.goto(base + "#" + example.id);
    await expect(p.locator("#source")).toBeEnabled();
    await expect(p.locator("#lesson-complete")).toBeChecked();
    await p.locator("#code-runner-open").click();
    await p.locator("[data-start]").click();
    await expect(p.locator("#runner-summary")).toHaveText("Ready", {
      timeout: 300000,
    });
    await p.locator("#code-runner-dialog [data-close]").click();
    await p.locator("#run").click();
    await expect(p.locator("#runner-summary")).toHaveText("Ready", {
      timeout: 180000,
    });
    await expect(p.locator("#runtime-status")).toHaveText(
      example.originalStatus,
    );
    await expect(p.locator("#terminal")).toContainText(example.original);
    await expect(p.locator("#runner-intro")).toBeHidden();
    console.log(
      "Cold guest run with server stopped:",
      (await p.locator("#terminal").textContent()).trim(),
    );
    await p.locator("#edit-step").click();
    if (example.variant)
      await p.locator("#variant").selectOption(example.variant);
    else {
      const code = await p.locator("#source").inputValue();
      assert.ok(code.includes(example.from));
      await p.locator("#source").fill(code.replace(example.from, example.to));
    }
    await p.locator("#run").click();
    await expect(p.locator("#runner-summary")).toHaveText("Ready", {
      timeout: 180000,
    });
    await expect(p.locator("#runtime-status")).toHaveText(example.editedStatus);
    await expect(p.locator("#terminal")).toContainText(example.edited);
    const authenticOutput = await p.locator("#terminal").textContent();
    const other = await context.newPage();
    await other.goto(base + "#" + example.id);
    await expect(other.locator("#source")).toBeEnabled();
    await other.locator("#code-runner-open").click();
    await other.locator("[data-start]").click();
    await expect(other.locator("#runner-error")).toContainText(
      "another window",
      { timeout: 15000 },
    );
    await expect(other.locator("#runtime-recovery-dialog")).toBeHidden();
    await other.close();
    await p.locator("#guest-tools>summary").click();
    await p.locator("#command").fill("printf kept > /root/offline-proof.txt");
    await p.locator("#shell button").click();
    await expect(p.locator("#command")).toBeEnabled({ timeout: 30000 });
    await p.locator("#code-runner-open").click();
    await p.locator("[data-free]").click();
    await expect(p.locator("#runner-summary")).toHaveText("Stopped", {
      timeout: 120000,
    });
    await p.locator("[data-start]").click();
    await expect(p.locator("#runner-summary")).toHaveText("Ready", {
      timeout: 300000,
    });
    await p.locator("#code-runner-dialog [data-close]").click();
    await p.locator("#command").fill("cat /root/offline-proof.txt");
    await p.locator("#shell button").click();
    await expect(p.locator("#shell-output")).toContainText("kept", {
      timeout: 30000,
    });
    await expect(p.locator("#command")).toBeEnabled();
    await p.locator("#code-runner-open").click();
    await p.locator("[data-free]").click();
    await expect(p.locator("#runner-summary")).toHaveText("Stopped", {
      timeout: 120000,
    });
    await p.locator("#code-runner-dialog [data-close]").click();
    const saved = await p.evaluate(async () => {
      const script = document.querySelector('script[src*="/lab.mjs"]').src;
      return (
        await import(new URL("./experiment-state.mjs", script))
      ).saveReadingState();
    });
    assert.ok(saved);
    await p.reload();
    await expect(p.locator("#source")).toBeEnabled();
    await p.locator("#program").evaluate((n) => (n.open = true));
    if (example.variant)
      await expect(p.locator("#variant")).toHaveValue(example.variant);
    else
      assert.ok((await p.locator("#source").inputValue()).includes(example.to));
    await expect(p.locator("#terminal")).toHaveText(authenticOutput);
    await expect(p.locator("#result-source")).toContainText(
      "Saved earlier result",
    );
    // A previously unvisited hash lesson and its own source/reference material work offline.
    const next = await p.locator("#next-lesson a").last().getAttribute("href");
    await p.goto(base + next);
    await expect(p.locator("#source")).toBeEnabled();
    await p.locator("#lesson-references>summary").click();
    assert.ok((await p.locator("#reference-list li p").count()) > 0);
    await expect(p.locator("#reference-list li p").first()).not.toBeEmpty();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 3 widths × 2 themes; native modal cancellation; explicit start acknowledgement; actual cold/offline starter+experiment; exclusive guest ownership; /root files saved/restored; preserved code, genuine output and completion; unvisited lesson sources/references.",
    );
  } finally {
    await context?.close();
    if (online) {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    }
    await fs.rm(profile, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
