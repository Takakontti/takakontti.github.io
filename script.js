const GUIDE_URL = "../Guide_All%20Ears%20achievement%20_%20PoE%20Wiki.html";
const TARGET_TOTAL = 484;
const ACT_NAMES = {
  1: "The Twilight Strand",
  2: "The Forest Encampment",
  3: "The Sarn Encampment",
  4: "Highgate",
  5: "Overseer's Tower",
  6: "Lioneye's Watch",
  7: "The Bridge Encampment",
  8: "The Sarn Encampment",
  9: "Highgate",
  10: "Oriath"
};

const dom = {
  actList: document.querySelector("#act-list"),
  actKicker: document.querySelector("#act-kicker"),
  actTitle: document.querySelector("#act-title"),
  checklist: document.querySelector("#checklist"),
  completedCount: document.querySelector("#completed-count"),
  totalCount: document.querySelector("#total-count"),
  progressPercent: document.querySelector("#progress-percent"),
  progressFill: document.querySelector("#progress-fill"),
  progressTrack: document.querySelector(".progress-track"),
  remainingCount: document.querySelector("#remaining-count"),
  visibleCount: document.querySelector("#visible-count"),
  characterName: document.querySelector("#character-name"),
  search: document.querySelector("#search"),
  hideCompleted: document.querySelector("#hide-completed"),
  consent: document.querySelector("#storage-consent"),
  storageStatus: document.querySelector("#storage-status")
};

let acts = [];
let activeAct = 1;
let completed = new Set();
let character = "Exile";
let allSteps = [];
let storageAllowed = false;
let hideCompleted = false;
const memoryProgress = new Map();
const CONSENT_KEY = "wraeclast-notes:storage-consent:v1";
const CHARACTER_KEY = "wraeclast-notes:all-ears:character";
const HIDE_KEY = "wraeclast-notes:all-ears:hide-completed";
const CONSENT_VERSION = "2026-10-10";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function rowsFromTable(table) {
  const activeSpans = [];
  const output = [];

  for (const row of table.rows) {
    if (row.querySelector("th")) continue;
    const values = [];
    const nextSpans = [];

    activeSpans.forEach((span, column) => {
      if (span && span.remaining > 0) {
        values[column] = span.value;
        if (span.remaining > 1) nextSpans[column] = { value: span.value, remaining: span.remaining - 1 };
      }
    });

    let column = 0;
    for (const cell of row.cells) {
      while (values[column] !== undefined) column += 1;
      const content = cell.cloneNode(true);
      content.querySelectorAll("sup.reference, .reference").forEach((reference) => reference.remove());
      const value = cleanText(content.textContent);
      values[column] = value;
      const spanCount = Number(cell.rowSpan) || 1;
      if (spanCount > 1) nextSpans[column] = { value, remaining: spanCount - 1 };
      column += 1;
    }

    activeSpans.splice(0, activeSpans.length, ...nextSpans);
    if (!/^\d+$/.test(values[0] ?? "")) continue;
    output.push({
      number: Number(values[0]),
      npc: values[1] || "Unknown NPC",
      dialogue: values[2] || "Optional dialogue",
      condition: values[3] || ""
    });
  }
  return output;
}

function readGuide(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const article = doc.querySelector("#mw-content-text .mw-parser-output");
  if (!article) throw new Error("The guide page did not contain its checklist.");

  const children = [...article.children];
  const actHeadings = children.filter((element) => /^Act_\d+$/.test(element.querySelector(".mw-headline")?.id ?? ""));
  const parsedActs = [];

  for (const heading of actHeadings) {
    const actNumber = Number(heading.querySelector(".mw-headline").id.match(/\d+/)[0]);
    const steps = [];
    let subheading = "";
    let sequence = 0;
    const branchOptions = new Map();
    let inBanditSubsection = false;
    let branchNote = "";

    for (let index = children.indexOf(heading) + 1; index < children.length; index += 1) {
      const element = children[index];
      if (element.matches("h3")) break;
      if (element.matches("h4")) {
        subheading = cleanText(element.textContent);
        inBanditSubsection = /deal with the bandits|ruler of highgate/i.test(subheading);
        branchNote = "";
        continue;
      }
      if (inBanditSubsection && element.matches("p") && /^\d+\./.test(cleanText(element.textContent))) {
        branchNote = cleanText(element.textContent);
        continue;
      }
      if (!element.matches("table")) continue;

      const rows = rowsFromTable(element);
      if (inBanditSubsection) {
        for (const row of rows) {
          if (!branchOptions.has(row.number)) branchOptions.set(row.number, []);
          branchOptions.get(row.number).push({ ...row, note: branchNote });
        }
        branchNote = "";
        continue;
      }

      for (const row of rows) {
        sequence += 1;
        steps.push({
          id: `act-${actNumber}-step-${sequence}`,
          act: actNumber,
          sequence,
          number: row.number,
          npc: row.npc,
          dialogue: row.dialogue,
          condition: row.condition,
          branchOptions: []
        });
      }
    }

    for (const step of steps) {
      if (branchOptions.has(step.number)) step.branchOptions = branchOptions.get(step.number);
    }

    if (steps.length) parsedActs.push({ number: actNumber, name: ACT_NAMES[actNumber] ?? `Act ${actNumber}`, steps });
  }

  return parsedActs;
}

function storageKey(name) {
  return `wraeclast-notes:all-ears:v1:${name.toLocaleLowerCase()}`;
}

function loadCharacter(name) {
  memoryProgress.set(character.toLocaleLowerCase(), new Set(completed));
  character = cleanText(name) || "Exile";
  dom.characterName.value = character;
  if (storageAllowed) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(character)) ?? "[]");
      completed = new Set(Array.isArray(saved) ? saved : []);
    } catch {
      completed = new Set();
    }
  } else {
    completed = new Set(memoryProgress.get(character.toLocaleLowerCase()) ?? []);
  }
  memoryProgress.set(character.toLocaleLowerCase(), new Set(completed));
  render();
}

function saveProgress() {
  memoryProgress.set(character.toLocaleLowerCase(), new Set(completed));
  if (!storageAllowed) return;
  try {
    localStorage.setItem(storageKey(character), JSON.stringify([...completed]));
  } catch {
    dom.visibleCount.textContent = "Browser storage is unavailable; progress may not be saved.";
  }
}

function updateStorageStatus() {
  dom.storageStatus.innerHTML = `<span aria-hidden="true"></span>${storageAllowed ? "Saved on this device" : "Progress is temporary"}`;
  dom.storageStatus.classList.toggle("is-saved", storageAllowed);
}

function showConsent() {
  const allowButton = document.querySelector("#allow-storage");
  const denyButton = document.querySelector("#deny-storage");
  const consentNote = document.querySelector("#consent-description");
  if (storageAllowed) {
    allowButton.textContent = "Keep local saving enabled";
    denyButton.textContent = "Disable saving and clear progress";
    consentNote.textContent = "This tracker does not use cookies. Your character label, checked steps, and hide-checked preference are saved in this browser on this device only; your entered tracker data is not sent to the site operator. GitHub Pages separately logs visitor IP addresses for security. Disabling saving erases this site's saved tracker data from this browser.";
    document.querySelector("#export-progress").hidden = false;
  } else {
    allowButton.textContent = "Allow local saving";
    denyButton.textContent = "Continue without saving";
    consentNote.textContent = "This tracker does not use cookies. If you allow local saving, your character label, checked steps, and hide-checked preference will be stored in this browser on this device; your entered tracker data is not sent to the site operator. GitHub Pages separately logs visitor IP addresses for security.";
    document.querySelector("#export-progress").hidden = true;
  }
  if (!dom.consent.open) dom.consent.showModal();
}

function allowLocalSaving() {
  storageAllowed = true;
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: "allowed", version: CONSENT_VERSION, timestamp: new Date().toISOString() }));
    localStorage.setItem(CHARACTER_KEY, character);
    localStorage.setItem(HIDE_KEY, String(hideCompleted));
    const saved = JSON.parse(localStorage.getItem(storageKey(character)) ?? "[]");
    completed = new Set(Array.isArray(saved) ? saved : []);
  } catch {
    storageAllowed = false;
    dom.visibleCount.textContent = "Browser storage is unavailable; progress will remain temporary.";
  }
  memoryProgress.set(character.toLocaleLowerCase(), new Set(completed));
  dom.consent.close();
  document.querySelector("#export-progress").hidden = false;
  updateStorageStatus();
  render();
}

function continueWithoutSaving() {
  storageAllowed = false;
  try {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(CHARACTER_KEY);
    localStorage.removeItem(HIDE_KEY);
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("wraeclast-notes:all-ears:v1:")) localStorage.removeItem(key);
    }
  } catch { /* The page still switches to memory-only mode. */ }
  memoryProgress.clear();
  completed.clear();
  hideCompleted = false;
  dom.hideCompleted.checked = false;
  dom.consent.close();
  document.querySelector("#export-progress").hidden = true;
  updateStorageStatus();
  render();
}

function setHideCompleted(hidden) {
  hideCompleted = hidden;
  if (storageAllowed) {
    try { localStorage.setItem(HIDE_KEY, String(hideCompleted)); } catch { /* The in-memory preference still works. */ }
  }
  renderChecklist();
}

function totalsForAct(act) {
  const done = act.steps.filter((step) => completed.has(step.id)).length;
  return { done, total: act.steps.length };
}

function renderActNavigation() {
  const allDone = allSteps.filter((step) => completed.has(step.id)).length;
  const allButton = `<button class="act-button" type="button" data-act="all" aria-current="${activeAct === "all"}"><span class="act-name">All acts</span><span class="act-count">${allDone}/${allSteps.length}</span></button>`;
  const buttons = acts.map((act) => {
    const totals = totalsForAct(act);
    return `<button class="act-button" type="button" data-act="${act.number}" aria-current="${activeAct === act.number}"><span class="act-name">Act ${act.number}</span><span class="act-count">${totals.done}/${totals.total}</span></button>`;
  }).join("");
  dom.actList.innerHTML = allButton + buttons;
}

function stepMarkup(step) {
  const isDone = completed.has(step.id);
  const condition = step.condition
    ? `<p class="condition"><strong>When:</strong> ${escapeHtml(step.condition)}</p>`
    : "";
  const branches = step.branchOptions.length
    ? `<details class="branch-details"><summary>Choice details (${step.branchOptions.length})</summary><ul class="branch-list">${step.branchOptions.map((option) => `<li><strong>${escapeHtml(option.npc)} — ${escapeHtml(option.dialogue)}</strong>${option.condition ? ` — ${escapeHtml(option.condition)}` : ""}${option.note ? `<br><span>${escapeHtml(option.note)}</span>` : ""}</li>`).join("")}</ul></details>`
    : "";

  return `<article class="step-card${isDone ? " is-complete" : ""}" id="${step.id}">
    <input class="step-check" type="checkbox" data-step="${step.id}" aria-label="Mark ${escapeHtml(step.npc)} — ${escapeHtml(step.dialogue)} complete" ${isDone ? "checked" : ""} />
    <span class="step-number">${String(step.number).padStart(3, "0")}</span>
    <div class="step-copy"><div class="step-meta"><span class="step-npc">${escapeHtml(step.npc)}</span></div><p class="step-dialogue">${escapeHtml(step.dialogue)}</p>${condition}${branches}</div>
  </article>`;
}

function renderChecklist() {
  const query = cleanText(dom.search.value).toLocaleLowerCase();
  const selectedActs = activeAct === "all" ? acts : acts.filter((act) => act.number === activeAct);
  const filtered = selectedActs.flatMap((act) => act.steps).filter((step) => {
    if (hideCompleted && completed.has(step.id)) return false;
    if (!query) return true;
    return `${step.npc} ${step.dialogue} ${step.condition} ${step.branchOptions.map((item) => `${item.dialogue} ${item.condition}`).join(" ")}`.toLocaleLowerCase().includes(query);
  });

  if (activeAct === "all") {
    dom.actKicker.textContent = `ALL ACTS · ${allSteps.length} CONVERSATIONS`;
    dom.actTitle.textContent = "The full journey";
  } else {
    const act = acts.find((item) => item.number === activeAct);
    dom.actKicker.textContent = `ACT ${act.number} · ${act.steps.length} CONVERSATIONS`;
    dom.actTitle.textContent = act.name;
  }
  const filteredOut = selectedActs.flatMap((act) => act.steps).filter((step) => hideCompleted && completed.has(step.id)).length;
  dom.visibleCount.textContent = query
    ? `${filtered.length} matching ordered steps${hideCompleted ? ` · ${filteredOut} checked hidden` : ""}`
    : `${filtered.length} ordered steps${hideCompleted ? ` · ${filteredOut} checked hidden` : ""}`;
  const emptyMessage = hideCompleted && !query && filteredOut > 0
    ? "All steps in this view are checked. Turn off “Hide checked” to review them."
    : "No matching conversations. Try another NPC, dialogue title, or act.";
  dom.checklist.innerHTML = filtered.length
    ? filtered.map(stepMarkup).join("")
    : `<div class="empty-state"><p>${emptyMessage}</p></div>`;
}

function renderProgress() {
  const done = allSteps.filter((step) => completed.has(step.id)).length;
  const percent = allSteps.length ? Math.round((done / allSteps.length) * 100) : 0;
  const remaining = Math.max(allSteps.length - done, 0);
  dom.completedCount.textContent = done;
  dom.totalCount.textContent = allSteps.length;
  dom.progressPercent.textContent = `${percent}%`;
  dom.progressFill.style.width = `${percent}%`;
  dom.progressTrack.setAttribute("aria-valuemax", String(allSteps.length));
  dom.progressTrack.setAttribute("aria-valuenow", String(done));
  dom.remainingCount.textContent = remaining ? `${remaining} still to find` : "Every conversation heard — achievement complete";
}

function render() {
  renderActNavigation();
  renderProgress();
  renderChecklist();
}

async function start() {
  try {
    const response = await fetch(GUIDE_URL);
    if (!response.ok) throw new Error(`Could not load the local guide (HTTP ${response.status}).`);
    acts = readGuide(await response.text());
    allSteps = acts.flatMap((act) => act.steps);
    if (!allSteps.length) throw new Error("No ordered dialogue steps were found in the local guide.");
    dom.totalCount.textContent = allSteps.length;
    if (allSteps.length !== TARGET_TOTAL) {
      dom.visibleCount.textContent = `Loaded ${allSteps.length} entries; the guide describes ${TARGET_TOTAL}. Please check the source copy.`;
    }
    let rememberedConsent = false;
    try {
      const consentRecord = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null");
      rememberedConsent = consentRecord?.choice === "allowed";
    } catch { /* Storage is unavailable or contains an obsolete consent value; ask and stay in memory. */ }
    if (rememberedConsent) {
      storageAllowed = true;
      let savedCharacter = "Exile";
      try {
        savedCharacter = localStorage.getItem(CHARACTER_KEY) || "Exile";
        hideCompleted = localStorage.getItem(HIDE_KEY) === "true";
      } catch { storageAllowed = false; }
      dom.hideCompleted.checked = hideCompleted;
      updateStorageStatus();
      document.querySelector("#export-progress").hidden = false;
      loadCharacter(savedCharacter);
    } else {
      updateStorageStatus();
      document.querySelector("#export-progress").hidden = true;
      loadCharacter("Exile");
      showConsent();
    }
  } catch (error) {
    dom.checklist.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)} Make sure the downloaded All Ears guide is in this site’s root folder and open the site through a web server.</p></div>`;
    dom.visibleCount.textContent = "Checklist unavailable";
  }
}

dom.actList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-act]");
  if (!button) return;
  activeAct = button.dataset.act === "all" ? "all" : Number(button.dataset.act);
  render();
});

dom.checklist.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-step]");
  if (!checkbox) return;
  if (checkbox.checked) completed.add(checkbox.dataset.step);
  else completed.delete(checkbox.dataset.step);
  saveProgress();
  render();
});

dom.search.addEventListener("input", renderChecklist);
dom.characterName.addEventListener("change", () => {
  const nextName = cleanText(dom.characterName.value) || "Exile";
  if (storageAllowed) {
    try { localStorage.setItem(CHARACTER_KEY, nextName); } catch { /* Storage is optional. */ }
  }
  loadCharacter(nextName);
});

dom.hideCompleted.addEventListener("change", () => setHideCompleted(dom.hideCompleted.checked));
document.querySelector("#allow-storage").addEventListener("click", allowLocalSaving);
document.querySelector("#deny-storage").addEventListener("click", continueWithoutSaving);
document.querySelector("#privacy-settings").addEventListener("click", showConsent);
document.querySelector("#export-progress").addEventListener("click", () => {
  if (!storageAllowed) return;
  const backup = {
    format: "takakontti-all-ears-progress",
    version: 1,
    exportedAt: new Date().toISOString(),
    character,
    completedStepIds: [...completed],
    hideCompleted,
    consentRecord: JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null")
  };
  const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `takakontti-all-ears-${character.toLocaleLowerCase().replace(/[^a-z0-9-]+/g, "-")}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

dom.consent.addEventListener("cancel", (event) => {
  event.preventDefault();
  continueWithoutSaving();
});

document.querySelector("#next-step").addEventListener("click", () => {
  const next = allSteps.find((step) => !completed.has(step.id));
  if (!next) return;
  activeAct = next.act;
  dom.search.value = "";
  render();
  requestAnimationFrame(() => document.getElementById(next.id)?.scrollIntoView({ behavior: "smooth", block: "center" }));
});

document.querySelector("#reset-progress").addEventListener("click", () => {
  if (!completed.size || !window.confirm(`Reset all All Ears progress for ${character}?`)) return;
  completed.clear();
  saveProgress();
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    dom.search.focus();
  }
  if (event.key === "Escape" && document.activeElement === dom.search) {
    dom.search.value = "";
    renderChecklist();
    dom.search.blur();
  }
});

start();