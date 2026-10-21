import { firebaseConfig } from "./firebase-config.js";

const form = document.querySelector("#login-form");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const loginPage = document.querySelector("#login-page");
const loginBranding = document.querySelector("#login-branding");
const dashboardPage = document.querySelector("#dashboard-page");
const dashboardStatus = document.querySelector("#dashboard-status");
const projectResults = document.querySelector("#project-results");
const projectResultsStatus = document.querySelector("#project-results-status");
const navigationButtons = document.querySelectorAll("[data-section]");
const status = document.querySelector("#status");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const panels = document.querySelectorAll("[data-panel]");
const storageKey = "kosu-audit-structure-v1";
const settingsStatus = document.querySelector("#settings-status");
const entryHint = document.querySelector("#entry-hint");
const entryProject = document.querySelector("#entry-project");
const entrySegment = document.querySelector("#entry-segment");
const entryLine = document.querySelector("#entry-line");
const settingsProject = document.querySelector("#settings-project");
const settingsSegment = document.querySelector("#settings-segment");
const settingsLine = document.querySelector("#settings-line");
const importButton = document.querySelector("#import-excel");
const excelFile = document.querySelector("#excel-file");
const structureEditor = document.querySelector("#structure-editor");
const importActions = document.querySelector("#import-actions");
const importSummary = document.querySelector("#import-summary");
let pendingImport = null;
let projects = [];
let structureLoaded = false;
let importing = false;
const auditForm = document.querySelector("#audit-form");
const auditStatus = document.querySelector("#audit-status");
const auditQuestions = document.querySelector("#audit-questions");
const auditChoices = ["OK", "NOK", "NA"];
const checklist = [
  ["Le KOSU objectif et OST sont issus d'une étude de temps (chronométrage).", "Vérifier sur le formulaire Z2 les 10 cycles de chronométrage."],
  ["Le KOSU équivalent est correctement calculé.", "Vérifier le calcul du KOSU équivalent sur le formulaire."],
  ["Les données renseignées sont exactes et complètes.", "Vérifier sur le panneau KOSU : nombre d'opérateurs, temps net de travail, quantité produite et procédure d'escalade."],
  ["Les problèmes rencontrés sur la ligne sont enregistrés sur la feuille de management KOSU.", "Vérifier la partie commentaire présente sur le cahier Kosu."],
  ["Il existe une correspondance entre les dérives observées sur le graphique KOSU et les problèmes décrits sur le plan d'action.", "Vérifier le plan d'action sur le tableau."],
  ["Les objectifs et les résultats KOSU sont affichés et visibles pour le manager et les opérateurs.", "Vérifier l'affichage des graphiques KOSU sur la ligne."],
  ["Le système d'escalade entre le Shift Leader (SL), le Segment Leader (SGL) et le Product Section Manager (PSM) fonctionne correctement.", "Vérifier la présence des signatures de validation sur le tableau KOSU."],
  ["Un tableau KOSU est disponible sur la ligne et le bilan des résultats est renseigné à la fin de chaque poste.", "Vérifier que les données sont mises à jour sur le tableau Team speaker."],
  ["La tendance (courbe d'évolution) du KOSU est analysée et un plan d'amélioration est défini.", "Vérifier le graphique de tendance et le plan d'action associé."],
  ["Le poste goulot est clairement identifié et communiqué à l'ensemble des équipes.", "Vérifier que le poste goulot est identifié dans le plan d'action et communiqué sur le terrain."],
];
let activeAuditKey = null;
let auditReadable = false;
let editingAuditSelection = false;

function updateAuditProgress() {
  const answers = [...auditForm.querySelectorAll("input[type='radio']:checked")].map((input) => input.value);
  const count = answers.length;
  const ok = answers.filter((answer) => answer === "OK").length;
  const nok = answers.filter((answer) => answer === "NOK").length;
  const na = answers.filter((answer) => answer === "NA").length;
  const applicable = ok + nok;
  document.querySelector("#audit-score").textContent = applicable
    ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(ok / applicable * 100)} %`
    : count === checklist.length ? "Non applicable" : "En attente";
  document.querySelector("#audit-score-detail").textContent =
    `${ok} OK / ${applicable} point(s) applicable(s) · ${nok} NOK · ${na} NA exclu(s)` +
    (count < checklist.length ? " · Résultat provisoire" : "");
  document.querySelector("#audit-count").textContent = `${count} / ${checklist.length} points`;
  document.querySelector("#audit-progress").value = count;
  auditForm.querySelectorAll(".audit-question").forEach((group) => {
    group.classList.toggle("is-answered", Boolean(group.querySelector("input:checked")));
  });
}

function refreshProjectResults() {
  projectResults.replaceChildren();
  projectResultsStatus.hidden = false;
  try {
    const averages = new Map();
    let auditCount = 0;
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith("kosu-audit-record-v1:")) continue;
      const record = JSON.parse(localStorage.getItem(key));
      if (
        !record || record.version !== 1 ||
        typeof record.projectId !== "string" || !record.projectId ||
        typeof record.project !== "string" || !record.project.trim() ||
        !Array.isArray(record.answers) || record.answers.length !== checklist.length ||
        !record.answers.every((answer) => auditChoices.includes(answer))
      ) {
        throw new Error(`Enregistrement d'audit invalide (${key}).`);
      }
      auditCount++;
      const applicable = record.answers.filter((answer) => answer !== "NA");
      if (applicable.length === 0) continue;
      const score = applicable.filter((answer) => answer === "OK").length / applicable.length * 100;
      const result = averages.get(record.projectId) ?? { name: record.project, total: 0, count: 0 };
      result.total += score;
      result.count++;
      averages.set(record.projectId, result);
    }

    const results = [...averages.values()].sort((left, right) => left.name.localeCompare(right.name, "fr", { sensitivity: "base" }));
    if (results.length === 0) {
      projectResultsStatus.textContent = auditCount === 0
        ? "Aucun audit enregistré pour le moment."
        : "Aucun résultat calculable : les audits enregistrés ne contiennent aucun point applicable.";
      return;
    }

    projectResultsStatus.hidden = true;
    const formatPercent = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
    for (const result of results) {
      const average = result.total / result.count;
      const item = document.createElement("li");
      item.className = "project-result";
      const heading = document.createElement("div");
      heading.className = "project-result-heading";
      const name = document.createElement("span");
      name.className = "project-result-name";
      name.textContent = result.name;
      const detail = document.createElement("span");
      detail.className = "project-result-detail";
      detail.textContent = `${result.count} audit${result.count === 1 ? "" : "s"}`;
      heading.append(name, detail);
      const bar = document.createElement("progress");
      bar.className = "project-result-bar";
      bar.max = 100;
      bar.value = average;
      bar.setAttribute("aria-label", `Moyenne de conformité de ${result.name} : ${formatPercent.format(average)} %`);
      const value = document.createElement("strong");
      value.className = "project-result-value";
      value.textContent = `${formatPercent.format(average)} %`;
      item.append(heading, bar, value);
      projectResults.append(item);
    }
  } catch (error) {
    console.error("Lecture des résultats par projet impossible :", error);
    projectResults.replaceChildren();
    projectResultsStatus.textContent = "Impossible de lire les audits enregistrés. Vérifiez l'accès aux données locales et l'intégrité des audits.";
  }
}

document.querySelector("#edit-audit-selection").addEventListener("click", () => {
  editingAuditSelection = true;
  refreshChecklist();
  entryProject.focus();
});

document.querySelector("#resume-audit").addEventListener("click", () => {
  editingAuditSelection = false;
  refreshChecklist();
  document.querySelector("#audit-title").focus();
});

function auditSelection() {
  const project = projects.find((item) => item.id === entryProject.value);
  const segment = project?.segments.find((item) => item.id === entrySegment.value);
  const line = segment?.lines.find((item) => item.id === entryLine.value);
  return { project, segment, line };
}

function refreshChecklist() {
  const { project, segment, line } = auditSelection();
  const excluded = Boolean(project && ["cra", "wpa"].includes(nameKey(project.name)));
  document.querySelector("#checklist-notice").hidden = !excluded;
  const key = structureLoaded && project && segment && line && !excluded
    ? `kosu-audit-checklist-v1:${JSON.stringify([project.id, segment.id, line.id])}` : null;
  const showingChecklist = Boolean(key) && !editingAuditSelection;
  auditForm.hidden = !showingChecklist;
  document.querySelector("#entry-selection").hidden = showingChecklist;
  entryHint.hidden = showingChecklist;
  document.querySelector("#resume-audit").hidden = !key || !editingAuditSelection;
  if (key === activeAuditKey) return;
  activeAuditKey = key;
  auditQuestions.replaceChildren();
  auditStatus.textContent = "";
  auditReadable = false;
  if (!key) return;
  document.querySelector("#audit-context").textContent = `${project.name} → ${segment.name} → ${line.name}`;
  const answers = Array(checklist.length).fill("");
  auditReadable = true;
  auditStatus.textContent = "Nouvel audit : renseignez les 10 points avant d'enregistrer.";
  checklist.forEach(([question, guidance], index) => {
    const group = document.createElement("fieldset");
    group.className = "audit-question";
    group.disabled = !auditReadable;
    const legend = document.createElement("legend");
    legend.textContent = `${index + 1}. ${question}`;
    const instruction = document.createElement("p");
    instruction.textContent = guidance;
    const choices = document.createElement("div");
    choices.className = "audit-choices";
    for (const choice of auditChoices) {
      const label = document.createElement("label");
      label.className = `audit-choice audit-${choice.toLowerCase()}`;
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `audit-${index}`;
      input.value = choice;
      input.required = true;
      input.checked = answers[index] === choice;
      const text = document.createElement("span");
      const icon = document.createElement("i");
      icon.className = `bi bi-${choice === "OK" ? "check-circle" : choice === "NOK" ? "x-circle" : "dash-circle"}`;
      icon.setAttribute("aria-hidden", "true");
      text.append(icon, document.createTextNode(` ${choice}`));
      label.append(input, text);
      choices.append(label);
    }
    group.append(legend, instruction, choices);
    auditQuestions.append(group);
  });
  document.querySelector("#save-audit").disabled = !auditReadable;
  updateAuditProgress();
}

auditForm.addEventListener("change", () => {
  if (!activeAuditKey || !auditReadable) return;
  auditStatus.textContent = "Modifications non enregistrées. Cliquez sur Enregistrer pour les conserver.";
  updateAuditProgress();
});

auditForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const { project, segment, line } = auditSelection();
  if (!activeAuditKey || !auditReadable || !structureLoaded || dashboardPage.hidden || !line) {
    auditStatus.textContent = "Enregistrement indisponible. Sélectionnez un projet, un segment et une ligne ou machine valides.";
    return;
  }
  const data = new FormData(auditForm);
  const answers = checklist.map((_, index) => data.get(`audit-${index}`));
  if (!answers.every((answer) => auditChoices.includes(answer))) {
    auditStatus.textContent = "Répondez aux 10 points avec OK, NOK ou NA avant d'enregistrer.";
    auditForm.reportValidity();
    return;
  }
  try {
    const id = crypto.randomUUID();
    localStorage.setItem(`kosu-audit-record-v1:${id}`, JSON.stringify({
      version: 1, id, answers, savedAt: new Date().toISOString(),
      projectId: project.id, segmentId: segment.id, lineId: line.id,
      project: project.name, segment: segment.name, line: line.name,
    }));
  } catch (error) {
    console.error("Enregistrement de la checklist impossible :", error);
    auditStatus.textContent = "Enregistrement impossible. Vérifiez les autorisations et l'espace de stockage. Vos réponses restent affichées pour réessayer.";
    return;
  }
  refreshProjectResults();
  editingAuditSelection = false;
  for (const select of [entryProject, entrySegment, entryLine]) select.value = "";
  refreshStructure();
  dashboardStatus.textContent = `Checklist enregistrée pour ${project.name} → ${segment.name} → ${line.name}. Vous pouvez effectuer une nouvelle sélection.`;
  dashboardStatus.hidden = false;
  entryProject.focus();
});

function nameKey(name) {
  return name.trim().toLocaleLowerCase("fr");
}

function showSettingsMessage(message) {
  settingsStatus.textContent = message;
  settingsStatus.hidden = false;
}

function fillSelect(select, items, placeholder) {
  const previous = select.value;
  select.replaceChildren(new Option(placeholder, ""));
  for (const item of items) select.add(new Option(item.name, item.id));
  select.value = items.some((item) => item.id === previous) ? previous : "";
  select.disabled = items.length === 0;
}

function refreshStructure() {
  importButton.disabled = !structureLoaded || importing || Boolean(pendingImport);
  structureEditor.disabled = importing || Boolean(pendingImport);
  fillSelect(settingsProject, projects, "Choisir un projet");
  const project = projects.find((item) => item.id === settingsProject.value);
  fillSelect(settingsSegment, project?.segments ?? [], project ? "Choisir un segment" : "Choisir d'abord un projet");
  const segment = project?.segments.find((item) => item.id === settingsSegment.value);
  fillSelect(settingsLine, segment?.lines ?? [], segment ? "Choisir une ligne ou machine" : "Choisir d'abord un segment");
  document.querySelector("#segment-parent").textContent = project
    ? `Le nouveau segment sera rattaché au projet « ${project.name} ».`
    : "Ajoutez ou choisissez d'abord un projet.";
  document.querySelector("#line-parent").textContent = segment
    ? `Rattachement : ${project.name} → ${segment.name}.`
    : "Choisissez un segment du projet pour ajouter ses lignes ou machines.";
  document.querySelector("#segment-name").disabled = !project;
  document.querySelector("#segment-form button[type='submit']").disabled = !project;
  document.querySelector("#line-name").disabled = !segment;
  document.querySelector("#line-form button[type='submit']").disabled = !segment;
  document.querySelector("#delete-project").disabled = !structureLoaded || !project;
  document.querySelector("#delete-segment").disabled = !structureLoaded || !segment;
  document.querySelector("#delete-line").disabled = !structureLoaded || !segment?.lines.some((item) => item.id === settingsLine.value);
  fillSelect(entryProject, projects, "Choisir une section / un projet");
  const selectedProject = projects.find((item) => item.id === entryProject.value);
  fillSelect(entrySegment, selectedProject?.segments ?? [], selectedProject ? "Choisir un segment" : "Choisir d'abord une section / un projet");
  const selectedSegment = selectedProject?.segments.find((item) => item.id === entrySegment.value);
  fillSelect(entryLine, selectedSegment?.lines ?? [], selectedSegment ? "Choisir une ligne ou machine" : "Choisir d'abord un segment");
  entryHint.textContent = !structureLoaded
    ? "Les réglages locaux sont indisponibles. Consultez Réglages pour le détail."
    : projects.length === 0
      ? "Configurez vos projets, segments et lignes ou machines dans Réglages."
      : selectedProject && selectedProject.segments.length === 0
        ? "Ce projet n'a pas encore de segment. Ajoutez-en dans Réglages."
        : selectedSegment && selectedSegment.lines.length === 0
          ? "Ce segment n'a pas encore de ligne ou machine. Ajoutez-en dans Réglages."
          : "Sélectionnez une section / un projet, puis un segment et une ligne ou machine.";
  refreshChecklist();
}

function loadStructure() {
  resetPendingImport();
  projects = [];
  structureLoaded = false;
  settingsStatus.hidden = true;
  try {
    const stored = localStorage.getItem(storageKey);
    const data = stored === null ? [] : JSON.parse(stored);
    const validNames = (items) => Array.isArray(items) && items.every((item) =>
      item && typeof item.id === "string" && item.id.length > 0 &&
      typeof item.name === "string" && item.name.trim().length > 0 && item.name.length <= 100
    ) && new Set(items.map((item) => item.id)).size === items.length;
    if (!validNames(data) || !data.every((project) =>
      validNames(project.segments) && project.segments.every((segment) => validNames(segment.lines))
    )) throw new Error("Format des réglages locaux invalide.");
    projects = data;
    structureLoaded = true;
  } catch (error) {
    console.error("Lecture des réglages impossible :", error);
    showSettingsMessage("Impossible de lire les réglages locaux. Vérifiez l'accès au stockage du navigateur. Aucune donnée existante ne sera écrasée.");
  }
  document.querySelector("#project-name").disabled = !structureLoaded;
  document.querySelector("#project-form button[type='submit']").disabled = !structureLoaded;
  refreshStructure();
  refreshProjectResults();
}

for (const select of [entryProject, entrySegment, entryLine, settingsProject, settingsSegment, settingsLine]) {
  select.addEventListener("change", () => {
    if ([entryProject, entrySegment, entryLine].includes(select)) editingAuditSelection = false;
    if (select === entryProject) entrySegment.value = "";
    if (select === settingsProject) {
      settingsSegment.value = "";
      document.querySelector("#segment-name").value = "";
    }
    if (select === settingsProject || select === settingsSegment) document.querySelector("#line-name").value = "";
    if (select === entryProject || select === entrySegment) entryLine.value = "";
    if (select === settingsProject || select === settingsSegment) settingsLine.value = "";
    refreshStructure();
  });
}

for (const level of ["project", "segment", "line"]) {
  document.querySelector(`#delete-${level}`).addEventListener("click", () => {
    if (!structureLoaded) {
      showSettingsMessage("Suppression impossible : les réglages locaux sont indisponibles.");
      return;
    }
    const next = structuredClone(projects);
    const project = next.find((item) => item.id === settingsProject.value);
    const segment = project?.segments.find((item) => item.id === settingsSegment.value);
    const target = level === "project" ? next : level === "segment" ? project?.segments : segment?.lines;
    const selectedId = level === "project" ? settingsProject.value : level === "segment" ? settingsSegment.value : settingsLine.value;
    const index = target?.findIndex((item) => item.id === selectedId) ?? -1;
    if (index < 0) {
      showSettingsMessage("Sélectionnez d'abord l'élément à supprimer.");
      return;
    }
    const item = target[index];
    const description = level === "project"
      ? `le projet « ${item.name} », ses ${item.segments.length} segment(s) et leurs ${item.segments.reduce((total, child) => total + child.lines.length, 0)} ligne(s) ou machine(s)`
      : level === "segment"
        ? `le segment « ${item.name} » du projet « ${project.name} » et ses ${item.lines.length} ligne(s) ou machine(s)`
        : `la ligne ou machine « ${item.name} » de ${project.name} → ${segment.name}`;
    if (!window.confirm(`Supprimer définitivement ${description} ? Cette action est irréversible.`)) return;
    try {
      target.splice(index, 1);
      localStorage.setItem(storageKey, JSON.stringify(next));
      projects = next;
      if (level === "project") document.querySelector("#segment-name").value = "";
      if (level !== "line") document.querySelector("#line-name").value = "";
      refreshStructure();
      showSettingsMessage(`Suppression enregistrée : ${description}.`);
    } catch (error) {
      console.error("Suppression des réglages impossible :", error);
      showSettingsMessage("Suppression non enregistrée. Vérifiez les autorisations et l'espace de stockage du navigateur. Les données sont conservées.");
    }
  });
}

for (const level of ["project", "segment", "line"]) {
  document.querySelector(`#${level}-form`).addEventListener("submit", (event) => {
    event.preventDefault();
    if (!structureLoaded) {
      showSettingsMessage("Les réglages ne peuvent pas être enregistrés tant que le stockage local est indisponible.");
      return;
    }
    const input = document.querySelector(`#${level}-name`);
    const name = input.value.trim();
    if (!name) {
      showSettingsMessage("Saisissez un nom non vide.");
      input.focus();
      return;
    }
    const next = structuredClone(projects);
    const project = next.find((item) => item.id === settingsProject.value);
    const segment = project?.segments.find((item) => item.id === settingsSegment.value);
    const target = level === "project" ? next : level === "segment" ? project?.segments : segment?.lines;
    if (!target) {
      showSettingsMessage("Choisissez d'abord le projet et, pour une ligne ou machine, le segment.");
      return;
    }
    if (target.some((item) => nameKey(item.name) === nameKey(name))) {
      showSettingsMessage("Ce nom existe déjà à cet emplacement.");
      return;
    }
    try {
      const item = { id: crypto.randomUUID(), name };
      target.push(level === "project" ? { ...item, segments: [] } : level === "segment" ? { ...item, lines: [] } : item);
      localStorage.setItem(storageKey, JSON.stringify(next));
      projects = next;
      refreshStructure();
      const select = level === "project" ? settingsProject : level === "segment" ? settingsSegment : settingsLine;
      select.value = item.id;
      refreshStructure();
      input.value = "";
      showSettingsMessage(level === "project"
        ? `Projet « ${name} » enregistré. Ajoutez maintenant ses segments.`
        : level === "segment"
          ? `Segment « ${name} » ajouté au projet « ${project.name} ». Ajoutez maintenant ses lignes ou machines.`
          : `Ligne ou machine « ${name} » ajoutée à ${project.name} → ${segment.name}.`);
      document.querySelector(level === "project" ? "#segment-name" : "#line-name").focus();
    } catch (error) {
      console.error("Enregistrement des réglages impossible :", error);
      showSettingsMessage("Enregistrement impossible. Vérifiez l'espace disponible et les autorisations de stockage du navigateur. Votre ajout n'a pas été enregistré.");
    }
  });
}

importButton.addEventListener("click", () => excelFile.click());

function resetPendingImport() {
  pendingImport = null;
  importActions.hidden = true;
  importSummary.textContent = "";
}

document.querySelector("#cancel-import").addEventListener("click", () => {
  resetPendingImport();
  refreshStructure();
  showSettingsMessage("Import annulé. Les réglages existants sont conservés.");
});

document.querySelector("#save-import").addEventListener("click", () => {
  if (!pendingImport || !structureLoaded || dashboardPage.hidden) {
    showSettingsMessage("Aucun import prêt à être enregistré. Importez un fichier Excel.");
    return;
  }
  if (projects !== pendingImport.original) {
    resetPendingImport();
    refreshStructure();
    showSettingsMessage("Les réglages ont changé. Relancez l'import avant d'enregistrer.");
    return;
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(pendingImport.next));
  } catch (error) {
    console.error("Enregistrement de l'import impossible :", error);
    showSettingsMessage("Impossible d'enregistrer l'import. Les réglages existants sont conservés. Vérifiez le stockage du navigateur puis réessayez, ou annulez.");
    return;
  }
  projects = pendingImport.next;
  resetPendingImport();
  refreshStructure();
  showSettingsMessage("Import enregistré dans ce navigateur. Les listes de Saisie sont mises à jour.");
});

excelFile.addEventListener("change", async () => {
  const file = excelFile.files[0];
  if (!file) return;
  const original = projects;
  importing = true;
  importButton.disabled = true;
  structureEditor.disabled = true;
  showSettingsMessage("Lecture du fichier Excel en cours…");
  try {
    if (!structureLoaded || dashboardPage.hidden) throw new Error("Connectez-vous et chargez les réglages avant d'importer.");
    if (!/\.(xlsx|xls)$/i.test(file.name)) throw new Error("Sélectionnez un fichier Excel .xlsx ou .xls.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Le fichier dépasse la limite de 5 Mo.");
    let xlsx;
    try {
      xlsx = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
    } catch (error) {
      console.error("Chargement du lecteur Excel impossible :", error);
      throw new Error("Impossible de charger le lecteur Excel. Vérifiez l'accès Internet et réessayez.");
    }
    let workbook;
    try {
      workbook = xlsx.read(await file.arrayBuffer(), { type: "array" });
    } catch (error) {
      console.error("Lecture Excel impossible :", error);
      throw new Error("Le fichier Excel est illisible, endommagé ou protégé par un mot de passe.");
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet?.["!ref"]) throw new Error("La première feuille est vide.");
    const range = xlsx.utils.decode_range(sheet["!ref"]);
    if (range.e.r > 10000 || range.e.c > 255) throw new Error("La feuille dépasse la limite de 10 000 lignes de données ou de 256 colonnes.");
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false, blankrows: true, range: 0 });
    const headerIndex = rows.findIndex((row) => row.some((value) => String(value).trim()));
    if (headerIndex < 0) throw new Error("La première feuille est vide.");
    const headers = rows[headerIndex].map((value) => nameKey(String(value)).replace(/\s+/g, " "));
    const aliases = [["section", "projet", "section / projet", "section/projet"], ["segment"], ["ligne ou machine", "ligne / machine", "ligne/machine"]];
    const columns = aliases.map((names) => {
      const matches = headers.flatMap((header, index) => names.includes(header) ? [index] : []);
      if (matches.length !== 1) throw new Error(`La colonne « ${names[0]} » doit apparaître exactement une fois dans l'en-tête.`);
      return matches[0];
    });
    const records = [];
    for (let index = headerIndex + 1; index < rows.length; index++) {
      const row = rows[index];
      if (!row.some((value) => String(value).trim())) continue;
      const names = columns.map((column) => String(row[column] ?? "").trim());
      if (names.some((name) => !name || name.length > 100)) {
        throw new Error(`Ligne Excel ${index + 1} : renseignez Section, Segment et Ligne ou machine (1 à 100 caractères par nom). Aucun import effectué.`);
      }
      if (columns.some((column) => sheet[xlsx.utils.encode_cell({ r: index, c: column })]?.t === "e")) {
        throw new Error(`Ligne Excel ${index + 1} : une cellule contient une erreur Excel. Aucun import effectué.`);
      }
      records.push(names);
    }
    if (!records.length) throw new Error("Aucune ligne de données à importer après l'en-tête.");
    if (projects !== original || !structureLoaded || dashboardPage.hidden) {
      throw new Error("Les réglages ou la session ont changé pendant la lecture. Relancez l'import.");
    }
    const next = structuredClone(projects);
    const counts = [0, 0, 0];
    const projectIndex = new Map(next.map((project) => [nameKey(project.name), project]));
    const segmentIndexes = new Map();
    const lineIndexes = new Map();
    let duplicates = 0;
    for (const [projectName, segmentName, lineName] of records) {
      let project = projectIndex.get(nameKey(projectName));
      if (!project) {
        project = { id: crypto.randomUUID(), name: projectName, segments: [] };
        next.push(project);
        projectIndex.set(nameKey(projectName), project);
        counts[0]++;
      }
      if (!segmentIndexes.has(project.id)) segmentIndexes.set(project.id, new Map(project.segments.map((segment) => [nameKey(segment.name), segment])));
      const segments = segmentIndexes.get(project.id);
      let segment = segments.get(nameKey(segmentName));
      if (!segment) {
        segment = { id: crypto.randomUUID(), name: segmentName, lines: [] };
        project.segments.push(segment);
        segments.set(nameKey(segmentName), segment);
        counts[1]++;
      }
      if (!lineIndexes.has(segment)) lineIndexes.set(segment, new Set(segment.lines.map((line) => nameKey(line.name))));
      const lines = lineIndexes.get(segment);
      if (!lines.has(nameKey(lineName))) {
        segment.lines.push({ id: crypto.randomUUID(), name: lineName });
        lines.add(nameKey(lineName));
        counts[2]++;
      } else duplicates++;
    }
    pendingImport = { next, original };
    importSummary.textContent = `${file.name} : ${counts[0]} section(s), ${counts[1]} segment(s), ${counts[2]} ligne(s) ou machine(s) à ajouter. ${duplicates} doublon(s) ignoré(s).`;
    importActions.hidden = false;
    showSettingsMessage("Import prêt. Cliquez sur « Enregistrer l'import » pour appliquer les ajouts, ou sur « Annuler l'import ». Rien n'est encore enregistré.");
  } catch (error) {
    console.error("Import Excel impossible :", error);
    showSettingsMessage(error instanceof Error ? error.message : "Import impossible. Les réglages existants sont conservés.");
  } finally {
    importing = false;
    refreshStructure();
    excelFile.value = "";
  }
});

window.addEventListener("storage", (event) => {
  if (dashboardPage.hidden) return;
  if (event.key === storageKey || event.key === null) loadStructure();
  else if (event.key?.startsWith("kosu-audit-record-v1:")) refreshProjectResults();
});

const errors = {
  "auth/invalid-credential": "Adresse e-mail ou mot de passe incorrect.",
  "auth/invalid-login-credentials": "Adresse e-mail ou mot de passe incorrect.",
  "auth/user-not-found": "Adresse e-mail ou mot de passe incorrect.",
  "auth/wrong-password": "Adresse e-mail ou mot de passe incorrect.",
  "auth/invalid-email": "Saisissez une adresse e-mail valide.",
  "auth/user-disabled": "Ce compte est désactivé. Contactez votre administrateur.",
  "auth/too-many-requests": "Trop de tentatives. Patientez avant de réessayer.",
  "auth/network-request-failed": "Connexion au serveur impossible. Vérifiez votre connexion Internet.",
  "auth/operation-not-allowed": "La connexion par e-mail et mot de passe doit être activée dans Firebase Authentication.",
  "auth/configuration-not-found": "Firebase Authentication n'est pas encore configuré. Dans la console Firebase, ouvrez Authentication, cliquez sur Commencer et activez E-mail/Mot de passe.",
  "auth/invalid-api-key": "La configuration Firebase est incorrecte. Contactez votre administrateur.",
  "auth/unauthorized-domain": "Ce domaine doit être autorisé dans Firebase Authentication.",
};

let auth;
let signInWithEmailAndPassword;
let signOut;

function showError(message) {
  const target = dashboardPage.hidden ? status : dashboardStatus;
  target.textContent = message;
  target.hidden = false;
}

function clearError() {
  for (const target of [status, dashboardStatus]) {
    target.textContent = "";
    target.hidden = true;
  }
}

navigationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    navigationButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    clearError();
    panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== button.dataset.section; });
    if (button.dataset.section === "Tableau de bord") refreshProjectResults();
    if (button.dataset.section !== "Tableau de bord" && !["Saisie", "Réglages"].includes(button.dataset.section)) {
      dashboardStatus.textContent = `${button.dataset.section} : cette rubrique n'est pas encore configurée.`;
      dashboardStatus.hidden = false;
    }
  });
});

function reportAuthError(error) {
  console.error("Erreur Firebase Authentication :", error);
  showError(errors[error.code] ?? "Une erreur de connexion est survenue. Réessayez ou contactez votre administrateur.");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  if (!auth) {
    showError("La connexion n'est pas disponible. Vérifiez la configuration Firebase et rechargez la page.");
    return;
  }
  loginButton.disabled = true;
  loginButton.querySelector("span").textContent = "Connexion en cours…";
  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    password.value = "";
  } catch (error) {
    reportAuthError(error);
  } finally {
    loginButton.disabled = false;
    loginButton.querySelector("span").textContent = "Se connecter";
  }
});

logoutButton.addEventListener("click", async () => {
  clearError();
  logoutButton.disabled = true;
  try {
    await signOut(auth);
  } catch (error) {
    reportAuthError(error);
  } finally {
    logoutButton.disabled = false;
  }
});

async function initializeAuth() {
  loginButton.disabled = true;
  const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];
  if (requiredKeys.some((key) => typeof firebaseConfig[key] !== "string" || !firebaseConfig[key].trim())) {
    showError("Configuration Firebase manquante : renseignez firebase-config.js pour activer la connexion.");
    return;
  }

  try {
    const [firebaseApp, firebaseAuth] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js"),
    ]);
    auth = firebaseAuth.getAuth(firebaseApp.initializeApp(firebaseConfig));
    signInWithEmailAndPassword = firebaseAuth.signInWithEmailAndPassword;
    signOut = firebaseAuth.signOut;
    firebaseAuth.onAuthStateChanged(auth, (user) => {
      const connected = Boolean(user);
      loginPage.hidden = connected;
      loginBranding.hidden = connected;
      dashboardPage.hidden = !connected;
      document.body.classList.toggle("dashboard-open", connected);
      document.title = connected ? "Kosu Audit" : "Connexion | OPEX LEONI";
      navigationButtons.forEach((button) => {
        const selected = button.dataset.section === "Tableau de bord";
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      clearError();
      panels.forEach((panel) => { panel.hidden = !connected || panel.dataset.panel !== "Tableau de bord"; });
      if (connected) loadStructure();
      else {
        resetPendingImport();
        editingAuditSelection = false;
        activeAuditKey = null;
        auditQuestions.replaceChildren();
        projects = [];
        structureLoaded = false;
        for (const select of [entryProject, entrySegment, entryLine, settingsProject, settingsSegment, settingsLine]) select.value = "";
        for (const level of ["project", "segment", "line"]) document.querySelector(`#${level}-form`).reset();
        refreshStructure();
      }
      loginButton.disabled = false;
      if (!user) password.value = "";
    }, (error) => {
      loginButton.disabled = true;
      reportAuthError(error);
    });
  } catch (error) {
    console.error("Initialisation Firebase impossible :", error);
    showError("Impossible d'initialiser Firebase. Vérifiez la configuration et l'accès Internet, puis rechargez la page.");
  }
}

await initializeAuth();
