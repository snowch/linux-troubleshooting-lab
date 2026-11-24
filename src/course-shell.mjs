// Copyright © 2026 Christopher Snow. Common course chrome; execution stays in the lab adapter.
import { materialSymbol as icon } from "./material-symbols.mjs";
import { saveReadingState } from "./experiment-state.mjs";
import { mountRuntimeRecovery } from "./runtime-recovery.mjs";
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function mountCourseShell({ course, references, api }) {
  window.labWorkbench = api;
  const $ = (id) => document.getElementById(id),
    prefix = "linux-lab:" + course.slug + ":";
  const read = (name) => {
    try {
      return localStorage.getItem(prefix + name);
    } catch {
      return null;
    }
  };
  const write = (name, value) => {
    try {
      localStorage.setItem(prefix + name, value);
      return localStorage.getItem(prefix + name) === value;
    } catch {
      return false;
    }
  };
  let acknowledged = read("runner-intro:1") === "1",
    lastUsed = Date.now(),
    idle = Number(read("runner-idle")) || 30,
    stopping = false,
    idleBlocked = false,
    origin;
  if (![5, 15, 30, 60].includes(idle)) idle = 30;
  const dialog = document.createElement("dialog");
  dialog.id = "code-runner-dialog";
  dialog.setAttribute("aria-labelledby", "runner-title");
  dialog.innerHTML =
    '<div class="status-heading"><h2 id="runner-title">Code runner</h2><button type="button" data-close>Close</button></div><p id="runner-detail" role="status"></p><progress id="runner-progress" aria-label="Code runner activity" hidden></progress><p>Linux and its build tools use this device’s CPU and memory. Keeping the guest ready makes later runs faster.</p><p>Free memory saves files in /root and /tmp, then stops Linux. The next start restores those files in a fresh guest; running processes and loaded kernel state are not restored. Your lesson code and results are kept.</p><label for="runner-idle">Stop after time without a run</label><select id="runner-idle"><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option></select><p id="runner-idle-note">Automatic stopping waits for experiments to finish. After manual shell use, free memory yourself when the shell session is finished.</p><details id="saved-files-tools"><summary>Saved Linux files</summary><p>Download a copy before discarding saved guest files. Lesson source, results and completion marks are separate.</p><button type="button" data-download-saved>Download saved Linux files</button><button type="button" data-clear-saved>Discard saved Linux files</button></details><p id="runner-error" role="alert"></p><div class="status-actions"><button type="button" class="primary" data-start>Start runner</button><button type="button" data-free>Free memory</button><button type="button" data-download-files>Download Linux files</button></div>';
  document.body.append(dialog);
  const intro = document.createElement("dialog");
  intro.id = "runner-intro";
  intro.setAttribute("aria-labelledby", "runner-intro-title");
  intro.innerHTML =
    '<h2 id="runner-intro-title">Code runs on your device</h2><p>The Linux guest uses this device’s CPU and memory. It stays ready between lessons and normally stops after ' +
    idle +
    ' minutes without a run.</p><p>Your source and results are kept. Files in /root and /tmp are saved before stopping and restored into a fresh guest. Use Code runner in the header to change the time or free memory sooner.</p><div class="status-actions"><button type="button" class="primary" data-continue>Continue run</button><button type="button" data-cancel>Back to lesson</button></div>';
  document.body.append(intro);
  const attention = document.createElement("aside");
  attention.id = "runner-attention";
  attention.hidden = true;
  attention.setAttribute("role", "status");
  document.querySelector("body>header").after(attention);
  function showAttention(message) {
    attention.replaceChildren(document.createTextNode(message + " "));
    const control = document.createElement("button");
    control.textContent = "Code runner";
    control.type = "button";
    control.onclick = open;
    attention.append(control);
    attention.hidden = false;
  }
  addEventListener("lab-storage-unavailable", (event) =>
    showAttention(event.detail),
  );
  const recovery = mountRuntimeRecovery({
    save: saveReadingState,
    runLabel: "Run in Linux",
  });
  function acknowledge() {
    acknowledged = true;
    write("runner-intro:1", "1");
  }
  function open() {
    origin = document.activeElement;
    update();
    dialog.showModal();
    dialog.querySelector("[data-close]").focus();
  }
  function close() {
    dialog.close();
    origin?.focus({ preventScroll: true });
  }
  $("code-runner-open").onclick = open;
  dialog.querySelector("[data-close]").onclick = close;
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.querySelector("#runner-idle").value = String(idle);
  dialog.querySelector("#runner-idle").onchange = (event) => {
    idle = Number(event.target.value);
    write("runner-idle", String(idle));
    lastUsed = Date.now();
  };
  async function start() {
    acknowledge();
    lastUsed = Date.now();
    $("runner-error").textContent = "";
    try {
      await api.start();
    } catch (error) {
      $("runner-error").textContent = error.message;
      if (
        /fetch|network|HTTP|manifest|could not load|WebAssembly/i.test(
          error.message,
        )
      )
        recovery.open();
    } finally {
      update();
    }
  }
  async function free(automatic = false) {
    if (
      stopping ||
      api.state().busy ||
      (automatic && (!api.state().idleEligible || idleBlocked))
    )
      return;
    stopping = true;
    update();
    try {
      await api.freeMemory();
      $("runner-error").textContent = "";
      idleBlocked = false;
    } catch (error) {
      idleBlocked = automatic;
      $("runner-error").textContent = "Linux is kept running: " + error.message;
      showAttention(
        "Linux could not save its files. It is kept running. Open Code runner to retry when you are ready.",
      );
      if (!automatic && !dialog.open) open();
    } finally {
      stopping = false;
      update();
    }
  }
  dialog.querySelector("[data-download-saved]").onclick = async () => {
    try {
      await api.downloadSavedFiles();
      $("runner-error").textContent =
        "A copy was downloaded. The saved guest files are unchanged.";
    } catch (error) {
      $("runner-error").textContent = error.message;
    }
  };
  dialog.querySelector("[data-clear-saved]").onclick = async () => {
    if (
      !confirm(
        "Discard saved Linux guest files? Your lesson source, results and completion marks will be kept.",
      )
    )
      return;
    try {
      await api.discardSavedFiles();
      $("runner-error").textContent =
        "Saved Linux files discarded. The next start uses a fresh guest.";
    } catch (error) {
      $("runner-error").textContent = error.message;
    }
  };
  dialog.querySelector("[data-download-files]").onclick = async () => {
    try {
      await api.downloadFiles();
      $("runner-error").textContent = "";
    } catch (error) {
      $("runner-error").textContent = error.message;
    }
  };
  dialog.querySelector("[data-start]").onclick = start;
  dialog.querySelector("[data-free]").onclick = () => free();
  function update() {
    const state = api.state();
    $("saved-files-tools").hidden = state.ready || state.busy || stopping;
    $("runner-summary").textContent = stopping ? "Saving files" : state.phase;
    document.getElementById("runner-progress").hidden =
      !stopping && !state.busy;
    $("runner-detail").textContent = stopping
      ? "Saving Linux files before freeing memory."
      : state.detail ||
        {
          Stopped: "Stopped. Your next run starts Linux.",
          Ready: "Ready for another run.",
          Starting: "Preparing Linux.",
          Running: "An experiment is running.",
        }[state.phase] ||
        state.phase;
    dialog.querySelector("[data-start]").disabled =
      state.phase !== "Stopped" || stopping;
    dialog.querySelector("[data-free]").disabled =
      !state.ready || state.busy || stopping;
    dialog.querySelector("[data-download-files]").disabled =
      !state.ready || state.busy || stopping;
  }
  window.labControls = {
    confirmStart: async () => {
      lastUsed = Date.now();
      if (acknowledged) return true;
      const previous = document.activeElement;
      return new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          intro.close();
          intro.removeEventListener("cancel", cancel);
          intro.querySelector("[data-continue]").onclick = null;
          intro.querySelector("[data-cancel]").onclick = null;
          if (value) acknowledge();
          else previous?.focus({ preventScroll: true });
          resolve(value);
        };
        const cancel = (event) => {
          event.preventDefault();
          finish(false);
        };
        intro.querySelector("[data-continue]").onclick = () => finish(true);
        intro.querySelector("[data-cancel]").onclick = () => finish(false);
        intro.addEventListener("cancel", cancel);
        intro.showModal();
        intro.querySelector("[data-continue]").focus();
      });
    },
    changed: update,
    activity: () => {
      lastUsed = Date.now();
      update();
    },
    fileFailure: (error) => {
      idleBlocked = true;
      showAttention(
        "Linux files could not be saved: " +
          error.message +
          " Keep this tab open and export important files.",
      );
    },
    loadFailure: () => recovery.open(),
  };
  const expire = () => {
    if (
      Date.now() - lastUsed >= idle * 60000 &&
      api.state().ready &&
      !api.isBusy()
    )
      void free(true);
  };
  setInterval(expire, 30000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) expire();
  });
  // Inline navigation combines progress and breadcrumbs without replacing any hash route.
  const navigation = $("lesson-navigation"),
    picker = $("lesson-picker");
  picker.hidden = true;
  navigation.querySelector("label")?.setAttribute("hidden", "");
  const locationRow = document.createElement("div");
  locationRow.className = "course-location-row";
  locationRow.innerHTML =
    '<button type="button" id="course-toggle" aria-controls="course-panel" aria-expanded="false">Course lessons ' +
    icon("expand_more") +
    '</button><span id="course-progress"></span><nav id="course-breadcrumbs" aria-label="Breadcrumb"></nav>';
  navigation.prepend(locationRow);
  const panel = document.createElement("div");
  panel.id = "course-panel";
  panel.hidden = true;
  const groups = Map.groupBy(course.lessons, (l) => l.section);
  panel.innerHTML =
    '<a href="#overview">Course overview</a><div class="course-outline-grid">' +
    [...groups]
      .map(
        ([section, items]) =>
          "<section><h2>" +
          esc(section) +
          "</h2><ol>" +
          items
            .map(
              (item) =>
                '<li><a href="#' +
                esc(item.id) +
                '">' +
                esc(item.title) +
                '</a><span role="img" aria-label="Completed" data-completion="' +
                esc(item.id) +
                '" hidden>' +
                icon("check") +
                "</span></li>",
            )
            .join("") +
          "</ol></section>",
      )
      .join("") +
    "</div>";
  navigation.append(panel);
  function closeOutline() {
    panel.hidden = true;
    $("course-toggle").setAttribute("aria-expanded", "false");
  }
  $("course-toggle").onclick = () => {
    panel.hidden = !panel.hidden;
    $("course-toggle").setAttribute("aria-expanded", String(!panel.hidden));
  };
  navigation.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.querySelector("dialog:modal")) {
      event.preventDefault();
      closeOutline();
      $("course-toggle").focus();
    }
  });
  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeOutline();
  });
  let savedComplete;
  try {
    savedComplete = JSON.parse(read("complete:v1") || "[]");
  } catch {
    savedComplete = [];
  }
  const completed = new Set(Array.isArray(savedComplete) ? savedComplete : []);
  const completion = document.createElement("section");
  completion.className = "lesson-completion";
  completion.innerHTML =
    '<label><input type="checkbox" id="lesson-complete"> Mark lesson complete</label><p id="completion-status">Saved in this browser.</p>';
  $("next-lesson").before(completion);
  $("lesson-complete").onchange = () => {
    const current = api.currentLesson();
    if (!current) return;
    $("lesson-complete").checked
      ? completed.add(current.id)
      : completed.delete(current.id);
    $("completion-status").textContent = write(
      "complete:v1",
      JSON.stringify([...completed]),
    )
      ? "Saved in this browser."
      : "This mark is kept in this tab only. Browser storage is unavailable.";
    renderRoute();
  };
  function renderRoute() {
    const current = api.currentLesson();
    closeOutline();
    $("course-progress").textContent =
      completed.size + " / " + course.lessons.length + " complete";
    for (const n of panel.querySelectorAll("[data-completion]"))
      n.hidden = !completed.has(n.dataset.completion);
    for (const a of panel.querySelectorAll("li a")) {
      if (a.hash === "#" + current?.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    if (!current) return;
    $("course-breadcrumbs").innerHTML =
      '<a href="#overview">' +
      esc(current.section) +
      '</a><span aria-hidden="true">/</span><span aria-current="page">' +
      esc(current.title) +
      "</span>";
    $("lesson-complete").checked = completed.has(current.id);
    const refs = $("lesson-references"),
      summary = refs.querySelector("summary");
    summary.innerHTML =
      icon("menu_book") +
      '<span class="resource-copy"><strong>References</strong><span>' +
      (references[current.id] || []).map((r) => esc(r.title)).join(" · ") +
      "</span></span>" +
      icon("chevron_right", "resource-chevron");
    refs.classList.add("resource-row");
    const next = $("next-lesson");
    next.classList.add("page-navigation");
    next.innerHTML = "";
    const index = course.lessons.indexOf(current);
    for (const [offset, label] of [
      [-1, "Previous lesson"],
      [1, "Next lesson"],
    ]) {
      const target = course.lessons[index + offset];
      const a = document.createElement("a");
      a.href = target ? "#" + target.id : "#overview";
      a.innerHTML =
        "<small>" +
        (target ? label : "Course overview") +
        "</small><strong>" +
        esc(target?.title || "Choose a lesson") +
        "</strong>";
      next.append(a);
    }
  }
  addEventListener("lab-lesson-change", renderRoute);
  renderRoute();
  const art = document.querySelector(".course-cover"),
    hero = document.querySelector(".course-hero"),
    outline = document.querySelector("#overview > nav");
  if (art && hero && outline) {
    const query = matchMedia("(max-width:850px)"),
      arrange = () => {
        if (query.matches) outline.after(art);
        else hero.append(art);
      };
    query.addEventListener("change", arrange);
    arrange();
  }
  update();
  window.dispatchEvent(new Event("lab-workbench-ready"));
}
