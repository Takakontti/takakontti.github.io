const TARGET_TOTAL = 484;

const byId = (id) => document.getElementById(id);
const dom = {
  actList: byId("act-list"),
  actKicker: byId("act-kicker"),
  actTitle: byId("act-title"),
  checklist: byId("checklist"),
  completedCount: byId("completed-count"),
  totalCount: byId("total-count"),
  progressPercent: byId("progress-percent"),
  progressFill: byId("progress-fill"),
  progressTrack: document.querySelector(".progress-track"),
  remainingCount: byId("remaining-count"),
  visibleCount: byId("visible-count"),
  characterName: byId("character-name"),
  search: byId("search"),
  hideCompleted: byId("hide-completed"),
  consent: byId("storage-consent"),
  storageStatus: byId("storage-status"),
  allowStorage: byId("allow-storage"),
  denyStorage: byId("deny-storage"),
  exportProgress: byId("export-progress"),
  privacySettings: byId("privacy-settings"),
  nextStep: byId("next-step"),
  resetProgress: byId("reset-progress"),
  consentDescription: byId("consent-description")
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
const TRACKER_PROGRESS_PREFIX = "wraeclast-notes:all-ears:v1:";

const consentCopy = {
  enabled: {
    allow: "Keep local saving enabled",
    deny: "Disable saving and clear progress",
    description: "This tracker does not use cookies. Your character label, checked steps, and hide-checked preference are saved in this browser on this device only; your entered tracker data is not sent to the site operator. GitHub Pages separately logs visitor IP addresses for security. Disabling saving erases this site's saved tracker data from this browser."
  },
  disabled: {
    allow: "Allow local saving",
    deny: "Continue without saving",
    description: "This tracker does not use cookies. If you allow local saving, your character label, checked steps, and hide-checked preference will be stored in this browser on this device; your entered tracker data is not sent to the site operator. GitHub Pages separately logs visitor IP addresses for security."
  }
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function readStoredValue(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function parseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function removeTrackerData() {
  try {
    const progressKeys = Object.keys(localStorage).filter((key) => key.startsWith(TRACKER_PROGRESS_PREFIX));
    [CONSENT_KEY, CHARACTER_KEY, HIDE_KEY, ...progressKeys].forEach((key) => localStorage.removeItem(key));
  } catch {
    // Keep the current visit usable even when browser storage is blocked.
  }
}

async function loadChecklistData() {
  if (!window.ALL_EARS_GZIP_BASE64 || typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot load the checklist data. Please use an up-to-date browser.");
  }

  const binary = atob(window.ALL_EARS_GZIP_BASE64);
  const compressed = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
  const data = JSON.parse(await new Response(stream).text());
  if (data.format !== "takakontti-all-ears-checklist" || !Array.isArray(data.acts)) {
    throw new Error("The checklist data has an unsupported format.");
  }

  return data.acts.map((act) => ({
    number: act.number,
    name: act.name,
    steps: act.steps.map((row, index) => ({
      id: `act-${act.number}-step-${index + 1}`,
      act: act.number,
      sequence: index + 1,
      number: row[0],
      npc: row[1],
      dialogue: row[2],
      condition: row[3],
      branchOptions: (act.choices?.[row[0]] ?? []).map((choice) => ({
        number: choice[0],
        npc: choice[1],
        dialogue: choice[2],
        condition: choice[3],
        note: choice[4]
      }))
    }))
  }));
}

function storageKey(name) {
  return `${TRACKER_PROGRESS_PREFIX}${name.toLocaleLowerCase()}`;
}

function loadCharacter(name) {
  memoryProgress.set(character.toLocaleLowerCase(), new Set(completed));
  character = cleanText(name) || "Exile";
  dom.characterName.value = character;

  if (storageAllowed) {
    try {
      const saved = parseJSON(readStoredValue(storageKey(character), "[]"), []);
      completed = new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : []);
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

  if (!writeStoredValue(storageKey(character), JSON.stringify([...completed]))) {
    storageAllowed = false;
    updateStorageStatus();
    dom.visibleCount.textContent = "Browser storage is unavailable; progress may not be saved.";
  }
}

function updateStorageStatus() {
  dom.storageStatus.lastChild.textContent = storageAllowed ? "Saved on this device" : "Progress is temporary";
  dom.storageStatus.classList.toggle("is-saved", storageAllowed);
}

function showConsent() {
  const copy = storageAllowed ? consentCopy.enabled : consentCopy.disabled;
  dom.allowStorage.textContent = copy.allow;
  dom.denyStorage.textContent = copy.deny;
  dom.consentDescription.textContent = copy.description;
  dom.exportProgress.hidden = !storageAllowed;

  if (!dom.consent.open) dom.consent.showModal();
}

function allowLocalSaving() {
  const consentRecord = JSON.stringify({
    choice: "allowed",
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString()
  });

  try {
    localStorage.setItem(CONSENT_KEY, consentRecord);
    localStorage.setItem(CHARACTER_KEY, character);
    localStorage.setItem(HIDE_KEY, String(hideCompleted));
    const saved = JSON.parse(localStorage.getItem(storageKey(character)) ?? "[]");
    completed = new Set(Array.isArray(saved) ? saved : []);
    storageAllowed = true;
  } catch {
    removeTrackerData();
    storageAllowed = false;
    dom.visibleCount.textContent = "Browser storage is unavailable; progress will remain temporary.";
  }
  memoryProgress.set(character.toLocaleLowerCase(), new Set(completed));
  dom.consent.close();
  dom.exportProgress.hidden = !storageAllowed;
  updateStorageStatus();
  render();
}

function continueWithoutSaving() {
  storageAllowed = false;
  removeTrackerData();
  memoryProgress.clear();
  completed.clear();
  hideCompleted = false;
  dom.hideCompleted.checked = false;
  dom.consent.close();
  dom.exportProgress.hidden = true;
  updateStorageStatus();
  render();
}

function setHideCompleted(hidden) {
  hideCompleted = hidden;
  if (storageAllowed && !writeStoredValue(HIDE_KEY, String(hideCompleted))) {
    storageAllowed = false;
    updateStorageStatus();
  }
  renderChecklist();
}

function totalsForAct(act) {
  const done = act.steps.filter((step) => completed.has(step.id)).length;
  return { done, total: act.steps.length };
}

function renderActNavigation() {
  const allDone = allSteps.filter((step) => completed.has(step.id)).length;
  const allActsButton = `
    <button class="act-button" type="button" data-act="all" aria-current="${activeAct === "all"}">
      <span class="act-name">All acts</span>
      <span class="act-count">${allDone}/${allSteps.length}</span>
    </button>`;
  const actButtons = acts.map((act) => {
    const totals = totalsForAct(act);
    return `
      <button class="act-button" type="button" data-act="${act.number}" aria-current="${activeAct === act.number}">
        <span class="act-name">Act ${act.number}</span>
        <span class="act-count">${totals.done}/${totals.total}</span>
      </button>`;
  }).join("");
  dom.actList.innerHTML = allActsButton + actButtons;
}

function stepMarkup(step) {
  const isComplete = completed.has(step.id);
  const condition = step.condition && `
    <p class="condition"><strong>When:</strong> ${escapeHtml(step.condition)}</p>`;
  const branchOptions = step.branchOptions.length > 0 && `
    <details class="branch-details">
      <summary>Choice details (${step.branchOptions.length})</summary>
      <ul class="branch-list">${step.branchOptions.map(branchOptionMarkup).join("")}</ul>
    </details>`;

  return `
    <article class="step-card${isComplete ? " is-complete" : ""}" id="${step.id}">
      <input class="step-check" type="checkbox" data-step="${step.id}"
        aria-label="Mark ${escapeHtml(step.npc)} — ${escapeHtml(step.dialogue)} complete"
        ${isComplete ? "checked" : ""} />
      <span class="step-number">${String(step.number).padStart(3, "0")}</span>
      <div class="step-copy">
        <div class="step-meta"><span class="step-npc">${escapeHtml(step.npc)}</span></div>
        <p class="step-dialogue">${escapeHtml(step.dialogue)}</p>
        ${condition || ""}
        ${branchOptions || ""}
      </div>
    </article>`;
}

function branchOptionMarkup(option) {
  const condition = option.condition ? ` — ${escapeHtml(option.condition)}` : "";
  const note = option.note ? `<br /><span>${escapeHtml(option.note)}</span>` : "";

  return `<li><strong>${escapeHtml(option.npc)} — ${escapeHtml(option.dialogue)}</strong>${condition}${note}</li>`;
}

function renderChecklist() {
  const query = cleanText(dom.search.value).toLocaleLowerCase();
  const selectedActs = activeAct === "all" ? acts : acts.filter((act) => act.number === activeAct);
  const selectedSteps = selectedActs.flatMap((act) => act.steps);
  const filteredOut = hideCompleted
    ? selectedSteps.filter((step) => completed.has(step.id)).length
    : 0;
  const visibleSteps = selectedSteps.filter((step) => {
    if (hideCompleted && completed.has(step.id)) return false;
    if (!query) return true;

    const searchableText = [
      step.npc,
      step.dialogue,
      step.condition,
      ...step.branchOptions.flatMap((option) => [option.npc, option.dialogue, option.condition, option.note])
    ].join(" ").toLocaleLowerCase();

    return searchableText.includes(query);
  });

  if (activeAct === "all") {
    dom.actKicker.textContent = `ALL ACTS · ${allSteps.length} CONVERSATIONS`;
    dom.actTitle.textContent = "The full journey";
  } else {
    const act = acts.find((item) => item.number === activeAct);
    dom.actKicker.textContent = `ACT ${act.number} · ${act.steps.length} CONVERSATIONS`;
    dom.actTitle.textContent = act.name;
  }
  dom.visibleCount.textContent = query
    ? `${visibleSteps.length} matching ordered steps${hideCompleted ? ` · ${filteredOut} checked hidden` : ""}`
    : `${visibleSteps.length} ordered steps${hideCompleted ? ` · ${filteredOut} checked hidden` : ""}`;
  const emptyMessage = hideCompleted && !query && filteredOut > 0
    ? "All steps in this view are checked. Turn off “Hide checked” to review them."
    : "No matching conversations. Try another NPC, dialogue title, or act.";
  dom.checklist.innerHTML = visibleSteps.length
    ? visibleSteps.map(stepMarkup).join("")
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
    acts = await loadChecklistData();
    allSteps = acts.flatMap((act) => act.steps);
    if (!allSteps.length) throw new Error("No ordered dialogue steps were found in the local guide.");
    dom.totalCount.textContent = allSteps.length;
    if (allSteps.length !== TARGET_TOTAL) {
      dom.visibleCount.textContent = `Loaded ${allSteps.length} entries; the guide describes ${TARGET_TOTAL}. Please check the source copy.`;
    }
    const consentRecord = parseJSON(readStoredValue(CONSENT_KEY, "null"), null);
    const rememberedConsent = consentRecord?.choice === "allowed";
    if (rememberedConsent) {
      storageAllowed = true;
      const savedCharacter = readStoredValue(CHARACTER_KEY, "Exile") || "Exile";
      hideCompleted = readStoredValue(HIDE_KEY) === "true";
      dom.hideCompleted.checked = hideCompleted;
      updateStorageStatus();
      dom.exportProgress.hidden = false;
      loadCharacter(savedCharacter);
    } else {
      updateStorageStatus();
      dom.exportProgress.hidden = true;
      loadCharacter("Exile");
      showConsent();
    }
  } catch (error) {
    dom.checklist.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
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
  if (storageAllowed && !writeStoredValue(CHARACTER_KEY, nextName)) storageAllowed = false;
  loadCharacter(nextName);
  updateStorageStatus();
});

dom.hideCompleted.addEventListener("change", () => setHideCompleted(dom.hideCompleted.checked));
dom.allowStorage.addEventListener("click", allowLocalSaving);
dom.denyStorage.addEventListener("click", continueWithoutSaving);
dom.privacySettings.addEventListener("click", showConsent);
dom.exportProgress.addEventListener("click", () => {
  if (!storageAllowed) return;
  const consentRecord = readStoredValue(CONSENT_KEY, "null");
  const backup = {
    format: "takakontti-all-ears-progress",
    version: 1,
    exportedAt: new Date().toISOString(),
    character,
    completedStepIds: [...completed],
    hideCompleted,
    consentRecord: parseJSON(consentRecord, null)
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

dom.nextStep.addEventListener("click", () => {
  const next = allSteps.find((step) => !completed.has(step.id));
  if (!next) return;
  activeAct = next.act;
  dom.search.value = "";
  render();
  requestAnimationFrame(() => document.getElementById(next.id)?.scrollIntoView({ behavior: "smooth", block: "center" }));
});

dom.resetProgress.addEventListener("click", () => {
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