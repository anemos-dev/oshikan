const STORAGE_KEY = "oshikan.v2";

const STATUS_OPTIONS = ["気になる", "推し", "本命", "比較中", "保留", "卒業"];
const CARD_TYPES = ["推しポイント", "モヤモヤ"];
const QUEST_LIBRARY = [
  { title: "主力事業を1つ説明する", detail: "企業の主力事業を自分の言葉で100字以内にまとめる", category: "事業理解" },
  { title: "競合を2社調べる", detail: "同業他社との違いを2つ書く", category: "比較" },
  { title: "社員インタビューを読む", detail: "社員の価値観で共感/違和感を1つずつ書く", category: "カルチャー" },
  { title: "IR/採用ページ確認", detail: "成長戦略または募集背景を1つ確認してメモする", category: "情報収集" },
  { title: "不安ポイントを明文化", detail: "気になる点を2つ記録し、確認質問に変換する", category: "リスク確認" },
];

const defaultState = {
  companies: [],
  cards: [],
  quests: [],
  profile: {
    name: "",
    strengths: "",
    experiences: "",
    valuesText: "",
  },
  weights: {
    growth: 3,
    stability: 3,
    autonomy: 3,
    social: 3,
    culture: 3,
    worklife: 3,
  },
  meta: {
    nextCompanyId: 1,
    nextCardId: 1,
    nextQuestId: 1,
  },
  appState: {
    activeTab: "home",
    lastCompanyId: null,
    cardsCompanyId: null,
    questsCompanyId: null,
    docsCompanyId: null,
    compareIds: [],
    docsDraft: "",
    compareDraft: "",
    ollamaModel: "qwen2.5:7b-instruct",
  },
};

const ui = {
  selectedCompanyId: null,
  selectedCardId: null,
  selectedQuestId: null,
};

let state = loadState();

const els = {
  tabButtons: [...document.querySelectorAll(".tab-btn")],
  tabPanels: [...document.querySelectorAll(".tab-panel")],
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  importFileInput: document.getElementById("importFileInput"),
  statCompanies: document.getElementById("statCompanies"),
  statCards: document.getElementById("statCards"),
  statQuests: document.getElementById("statQuests"),
  homeQuestList: document.getElementById("homeQuestList"),
  homeCardList: document.getElementById("homeCardList"),
  companyTableBody: document.getElementById("companyTableBody"),
  companyName: document.getElementById("companyName"),
  companyIndustry: document.getElementById("companyIndustry"),
  companyRole: document.getElementById("companyRole"),
  companyUrl: document.getElementById("companyUrl"),
  companyStatus: document.getElementById("companyStatus"),
  companyUnderstanding: document.getElementById("companyUnderstanding"),
  companyEmpathy: document.getElementById("companyEmpathy"),
  companyFit: document.getElementById("companyFit"),
  companyAnxiety: document.getElementById("companyAnxiety"),
  companyInterest: document.getElementById("companyInterest"),
  companyUnderstandingValue: document.getElementById("companyUnderstandingValue"),
  companyEmpathyValue: document.getElementById("companyEmpathyValue"),
  companyFitValue: document.getElementById("companyFitValue"),
  companyAnxietyValue: document.getElementById("companyAnxietyValue"),
  companyInterestValue: document.getElementById("companyInterestValue"),
  companyNotes: document.getElementById("companyNotes"),
  companyAddBtn: document.getElementById("companyAddBtn"),
  companyUpdateBtn: document.getElementById("companyUpdateBtn"),
  companyDeleteBtn: document.getElementById("companyDeleteBtn"),
  companyClearBtn: document.getElementById("companyClearBtn"),
  cardsCompanySelect: document.getElementById("cardsCompanySelect"),
  cardTableBody: document.getElementById("cardTableBody"),
  cardType: document.getElementById("cardType"),
  cardTitle: document.getElementById("cardTitle"),
  cardSource: document.getElementById("cardSource"),
  cardDetail: document.getElementById("cardDetail"),
  cardAddBtn: document.getElementById("cardAddBtn"),
  cardUpdateBtn: document.getElementById("cardUpdateBtn"),
  cardDeleteBtn: document.getElementById("cardDeleteBtn"),
  cardClearBtn: document.getElementById("cardClearBtn"),
  questsCompanySelect: document.getElementById("questsCompanySelect"),
  generateQuestBtn: document.getElementById("generateQuestBtn"),
  questTableBody: document.getElementById("questTableBody"),
  questDoneBtn: document.getElementById("questDoneBtn"),
  questUndoneBtn: document.getElementById("questUndoneBtn"),
  questDeleteBtn: document.getElementById("questDeleteBtn"),
  compareChecklist: document.getElementById("compareChecklist"),
  runCompareBtn: document.getElementById("runCompareBtn"),
  compareOutput: document.getElementById("compareOutput"),
  docsCompanySelect: document.getElementById("docsCompanySelect"),
  genMotivationBtn: document.getElementById("genMotivationBtn"),
  genInterviewBtn: document.getElementById("genInterviewBtn"),
  ollamaModelInput: document.getElementById("ollamaModelInput"),
  improveLocalAiBtn: document.getElementById("improveLocalAiBtn"),
  docsOutput: document.getElementById("docsOutput"),
  profileName: document.getElementById("profileName"),
  profileStrengths: document.getElementById("profileStrengths"),
  profileExperiences: document.getElementById("profileExperiences"),
  profileValues: document.getElementById("profileValues"),
  weightInputs: [...document.querySelectorAll("[data-weight]")],
  weightValues: [...document.querySelectorAll("[data-weight-value]")],
  saveProfileBtn: document.getElementById("saveProfileBtn"),
};

init();

function init() {
  renderStaticSelects();
  bindEvents();
  restoreUiSelections();
  renderAll();
  setTab(state.appState.activeTab || "home", false);
}

function renderStaticSelects() {
  els.companyStatus.innerHTML = STATUS_OPTIONS.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  els.cardType.innerHTML = CARD_TYPES.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
}

function bindEvents() {
  els.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab, true));
  });

  bindCompanyRange(els.companyUnderstanding, els.companyUnderstandingValue);
  bindCompanyRange(els.companyEmpathy, els.companyEmpathyValue);
  bindCompanyRange(els.companyFit, els.companyFitValue);
  bindCompanyRange(els.companyAnxiety, els.companyAnxietyValue);
  bindCompanyRange(els.companyInterest, els.companyInterestValue);

  els.companyAddBtn.addEventListener("click", addCompany);
  els.companyUpdateBtn.addEventListener("click", updateCompany);
  els.companyDeleteBtn.addEventListener("click", deleteCompany);
  els.companyClearBtn.addEventListener("click", () => {
    ui.selectedCompanyId = null;
    fillCompanyForm(null);
    renderCompanyTable();
  });

  els.cardsCompanySelect.addEventListener("change", () => {
    state.appState.cardsCompanyId = toNumberOrNull(els.cardsCompanySelect.value);
    ui.selectedCardId = null;
    saveState();
    renderCardsTable();
  });
  els.cardAddBtn.addEventListener("click", addCard);
  els.cardUpdateBtn.addEventListener("click", updateCard);
  els.cardDeleteBtn.addEventListener("click", deleteCard);
  els.cardClearBtn.addEventListener("click", () => {
    ui.selectedCardId = null;
    fillCardForm(null);
    renderCardsTable();
  });

  els.questsCompanySelect.addEventListener("change", () => {
    state.appState.questsCompanyId = toNumberOrNull(els.questsCompanySelect.value);
    ui.selectedQuestId = null;
    saveState();
    renderQuestTable();
  });
  els.generateQuestBtn.addEventListener("click", () => {
    const companyId = toNumberOrNull(els.questsCompanySelect.value);
    if (!companyId) {
      alert("企業を選択してください。");
      return;
    }
    ensureQuestTemplates(companyId);
    saveState();
    renderAll();
    alert("クエストを追加しました。");
  });
  els.questDoneBtn.addEventListener("click", () => updateQuestDone(true));
  els.questUndoneBtn.addEventListener("click", () => updateQuestDone(false));
  els.questDeleteBtn.addEventListener("click", deleteQuest);

  els.runCompareBtn.addEventListener("click", runComparison);
  els.compareOutput.addEventListener("input", () => {
    state.appState.compareDraft = els.compareOutput.value;
    saveState();
  });

  els.genMotivationBtn.addEventListener("click", generateMotivation);
  els.genInterviewBtn.addEventListener("click", generateInterviewSheet);
  els.improveLocalAiBtn.addEventListener("click", improveWithLocalAi);
  els.docsOutput.addEventListener("input", () => {
    state.appState.docsDraft = els.docsOutput.value;
    saveState();
  });
  els.ollamaModelInput.addEventListener("change", () => {
    state.appState.ollamaModel = els.ollamaModelInput.value.trim();
    saveState();
  });

  els.saveProfileBtn.addEventListener("click", saveProfile);
  els.weightInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.weight;
      const value = Number(input.value);
      state.weights[key] = value;
      const out = els.weightValues.find((v) => v.dataset.weightValue === key);
      if (out) out.textContent = String(value);
    });
  });

  els.exportBtn.addEventListener("click", exportJson);
  els.importBtn.addEventListener("click", () => els.importFileInput.click());
  els.importFileInput.addEventListener("change", importJson);
}

function bindCompanyRange(inputEl, valueEl) {
  inputEl.addEventListener("input", () => {
    valueEl.textContent = inputEl.value;
  });
}

function renderAll() {
  renderCompanyTable();
  renderCompanySelects();
  renderCardsTable();
  renderQuestTable();
  renderCompareChecklist();
  renderProfileForm();
  renderHome();
  applyAppDrafts();
}

function setTab(tabName, shouldSave = true) {
  els.tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));
  els.tabPanels.forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${tabName}`));
  state.appState.activeTab = tabName;
  if (shouldSave) saveState();
}

function renderHome() {
  const totalCompanies = state.companies.length;
  const totalCards = state.cards.length;
  const totalQuests = state.quests.length;
  const doneQuests = state.quests.filter((q) => q.isDone).length;

  els.statCompanies.textContent = String(totalCompanies);
  els.statCards.textContent = String(totalCards);
  els.statQuests.textContent = `${doneQuests} / ${totalQuests}`;

  const pendingQuests = [...state.quests]
    .filter((q) => !q.isDone)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 25);
  els.homeQuestList.innerHTML = pendingQuests
    .map((q) => {
      const company = getCompanyById(q.companyId);
      const name = company ? company.name : "不明";
      return `<li>[${escapeHtml(name)}] ${escapeHtml(q.title)}</li>`;
    })
    .join("");
  if (!pendingQuests.length) {
    els.homeQuestList.innerHTML = "<li>未完了クエストはありません。</li>";
  }

  const recentCards = [...state.cards].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 25);
  els.homeCardList.innerHTML = recentCards
    .map((c) => {
      const company = getCompanyById(c.companyId);
      const name = company ? company.name : "不明";
      return `<li>[${escapeHtml(name)}] ${escapeHtml(c.cardType)}: ${escapeHtml(c.title)}</li>`;
    })
    .join("");
  if (!recentCards.length) {
    els.homeCardList.innerHTML = "<li>カードがまだありません。</li>";
  }
}

function renderCompanyTable() {
  const sorted = [...state.companies].sort((a, b) => {
    const order = STATUS_OPTIONS.indexOf(a.status) - STATUS_OPTIONS.indexOf(b.status);
    if (order !== 0) return order;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  els.companyTableBody.innerHTML = sorted
    .map((c) => {
      const selected = c.id === ui.selectedCompanyId ? "selected" : "";
      return `<tr class="${selected}" data-id="${c.id}">
        <td>${c.id}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.status)}</td>
        <td>${escapeHtml(c.industry)}</td>
        <td>${escapeHtml(c.role)}</td>
        <td>${c.interest}</td>
      </tr>`;
    })
    .join("");

  [...els.companyTableBody.querySelectorAll("tr")].forEach((row) => {
    row.addEventListener("click", () => {
      const id = Number(row.dataset.id);
      selectCompany(id);
    });
  });
}

function selectCompany(id) {
  const company = getCompanyById(id);
  if (!company) return;
  ui.selectedCompanyId = id;
  state.appState.lastCompanyId = id;
  fillCompanyForm(company);
  state.appState.cardsCompanyId = id;
  state.appState.questsCompanyId = id;
  state.appState.docsCompanyId = id;
  saveState();
  renderAll();
}

function fillCompanyForm(company) {
  const c = company || {
    name: "",
    industry: "",
    role: "",
    url: "",
    status: STATUS_OPTIONS[0],
    understanding: 0,
    empathy: 0,
    fit: 0,
    anxiety: 0,
    interest: 0,
    notes: "",
  };
  els.companyName.value = c.name;
  els.companyIndustry.value = c.industry;
  els.companyRole.value = c.role;
  els.companyUrl.value = c.url;
  els.companyStatus.value = c.status;
  els.companyUnderstanding.value = String(c.understanding);
  els.companyEmpathy.value = String(c.empathy);
  els.companyFit.value = String(c.fit);
  els.companyAnxiety.value = String(c.anxiety);
  els.companyInterest.value = String(c.interest);
  els.companyUnderstandingValue.textContent = String(c.understanding);
  els.companyEmpathyValue.textContent = String(c.empathy);
  els.companyFitValue.textContent = String(c.fit);
  els.companyAnxietyValue.textContent = String(c.anxiety);
  els.companyInterestValue.textContent = String(c.interest);
  els.companyNotes.value = c.notes;
}

function collectCompanyForm() {
  return {
    name: els.companyName.value.trim(),
    industry: els.companyIndustry.value.trim(),
    role: els.companyRole.value.trim(),
    url: els.companyUrl.value.trim(),
    status: els.companyStatus.value || STATUS_OPTIONS[0],
    understanding: Number(els.companyUnderstanding.value),
    empathy: Number(els.companyEmpathy.value),
    fit: Number(els.companyFit.value),
    anxiety: Number(els.companyAnxiety.value),
    interest: Number(els.companyInterest.value),
    notes: els.companyNotes.value.trim(),
  };
}

function addCompany() {
  const form = collectCompanyForm();
  if (!form.name) {
    alert("企業名を入力してください。");
    return;
  }
  const id = state.meta.nextCompanyId++;
  const now = nowIso();
  const company = {
    id,
    ...form,
    createdAt: now,
    updatedAt: now,
  };
  state.companies.push(company);
  ensureQuestTemplates(id);
  ui.selectedCompanyId = id;
  state.appState.lastCompanyId = id;
  state.appState.cardsCompanyId = id;
  state.appState.questsCompanyId = id;
  state.appState.docsCompanyId = id;
  saveState();
  renderAll();
  alert("企業を追加し、初期クエストを作成しました。");
}

function updateCompany() {
  if (!ui.selectedCompanyId) {
    alert("更新する企業を選択してください。");
    return;
  }
  const idx = state.companies.findIndex((c) => c.id === ui.selectedCompanyId);
  if (idx === -1) return;
  const form = collectCompanyForm();
  if (!form.name) {
    alert("企業名を入力してください。");
    return;
  }
  state.companies[idx] = {
    ...state.companies[idx],
    ...form,
    updatedAt: nowIso(),
  };
  saveState();
  renderAll();
}

function deleteCompany() {
  if (!ui.selectedCompanyId) {
    alert("削除する企業を選択してください。");
    return;
  }
  const company = getCompanyById(ui.selectedCompanyId);
  if (!company) return;
  const ok = confirm(`${company.name} を削除します。\n関連するカードとクエストも削除されます。`);
  if (!ok) return;

  const targetId = ui.selectedCompanyId;
  state.companies = state.companies.filter((c) => c.id !== targetId);
  state.cards = state.cards.filter((c) => c.companyId !== targetId);
  state.quests = state.quests.filter((q) => q.companyId !== targetId);
  ui.selectedCompanyId = null;
  ui.selectedCardId = null;
  ui.selectedQuestId = null;
  if (state.appState.lastCompanyId === targetId) state.appState.lastCompanyId = null;
  if (state.appState.cardsCompanyId === targetId) state.appState.cardsCompanyId = null;
  if (state.appState.questsCompanyId === targetId) state.appState.questsCompanyId = null;
  if (state.appState.docsCompanyId === targetId) state.appState.docsCompanyId = null;
  state.appState.compareIds = state.appState.compareIds.filter((id) => id !== targetId);
  fillCompanyForm(null);
  saveState();
  renderAll();
}

function renderCompanySelects() {
  const sorted = [...state.companies].sort((a, b) => a.name.localeCompare(b.name, "ja"));
  const options = sorted.map((c) => `<option value="${c.id}">${escapeHtml(c.id + ": " + c.name)}</option>`).join("");

  [els.cardsCompanySelect, els.questsCompanySelect, els.docsCompanySelect].forEach((selectEl) => {
    const prev = toNumberOrNull(selectEl.value);
    selectEl.innerHTML = options;
    if (!sorted.length) {
      selectEl.value = "";
      return;
    }
    if (selectEl === els.cardsCompanySelect) {
      const id = validCompanyId(state.appState.cardsCompanyId) || prev || state.appState.lastCompanyId || sorted[0].id;
      selectEl.value = String(id);
      state.appState.cardsCompanyId = id;
    }
    if (selectEl === els.questsCompanySelect) {
      const id = validCompanyId(state.appState.questsCompanyId) || prev || state.appState.lastCompanyId || sorted[0].id;
      selectEl.value = String(id);
      state.appState.questsCompanyId = id;
    }
    if (selectEl === els.docsCompanySelect) {
      const id = validCompanyId(state.appState.docsCompanyId) || prev || state.appState.lastCompanyId || sorted[0].id;
      selectEl.value = String(id);
      state.appState.docsCompanyId = id;
    }
  });
}

function renderCardsTable() {
  const companyId = toNumberOrNull(els.cardsCompanySelect.value);
  if (!companyId) {
    els.cardTableBody.innerHTML = "";
    fillCardForm(null);
    return;
  }
  const list = [...state.cards]
    .filter((c) => c.companyId === companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!list.some((c) => c.id === ui.selectedCardId)) {
    ui.selectedCardId = null;
    fillCardForm(null);
  }
  els.cardTableBody.innerHTML = list
    .map((c) => {
      const selected = c.id === ui.selectedCardId ? "selected" : "";
      return `<tr class="${selected}" data-id="${c.id}">
        <td>${c.id}</td>
        <td>${escapeHtml(c.cardType)}</td>
        <td>${escapeHtml(c.title)}</td>
        <td>${escapeHtml(c.source || "-")}</td>
        <td>${escapeHtml(formatDate(c.createdAt))}</td>
      </tr>`;
    })
    .join("");
  [...els.cardTableBody.querySelectorAll("tr")].forEach((row) => {
    row.addEventListener("click", () => {
      const id = Number(row.dataset.id);
      ui.selectedCardId = id;
      fillCardForm(state.cards.find((c) => c.id === id));
      renderCardsTable();
    });
  });
}

function fillCardForm(card) {
  const c = card || { cardType: CARD_TYPES[0], title: "", source: "", detail: "" };
  els.cardType.value = c.cardType;
  els.cardTitle.value = c.title;
  els.cardSource.value = c.source;
  els.cardDetail.value = c.detail;
}

function addCard() {
  const companyId = toNumberOrNull(els.cardsCompanySelect.value);
  if (!companyId) {
    alert("先に企業を登録してください。");
    return;
  }
  const title = els.cardTitle.value.trim();
  if (!title) {
    alert("カードのタイトルを入力してください。");
    return;
  }
  const card = {
    id: state.meta.nextCardId++,
    companyId,
    cardType: els.cardType.value || CARD_TYPES[0],
    title,
    source: els.cardSource.value.trim(),
    detail: els.cardDetail.value.trim(),
    createdAt: nowIso(),
  };
  state.cards.push(card);
  ui.selectedCardId = card.id;
  saveState();
  renderAll();
}

function updateCard() {
  if (!ui.selectedCardId) {
    alert("更新するカードを選択してください。");
    return;
  }
  const idx = state.cards.findIndex((c) => c.id === ui.selectedCardId);
  if (idx === -1) return;
  const title = els.cardTitle.value.trim();
  if (!title) {
    alert("カードのタイトルを入力してください。");
    return;
  }
  state.cards[idx] = {
    ...state.cards[idx],
    cardType: els.cardType.value || CARD_TYPES[0],
    title,
    source: els.cardSource.value.trim(),
    detail: els.cardDetail.value.trim(),
  };
  saveState();
  renderAll();
}

function deleteCard() {
  if (!ui.selectedCardId) {
    alert("削除するカードを選択してください。");
    return;
  }
  state.cards = state.cards.filter((c) => c.id !== ui.selectedCardId);
  ui.selectedCardId = null;
  fillCardForm(null);
  saveState();
  renderAll();
}

function renderQuestTable() {
  const companyId = toNumberOrNull(els.questsCompanySelect.value);
  if (!companyId) {
    els.questTableBody.innerHTML = "";
    return;
  }
  const list = [...state.quests]
    .filter((q) => q.companyId === companyId)
    .sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  if (!list.some((q) => q.id === ui.selectedQuestId)) ui.selectedQuestId = null;
  els.questTableBody.innerHTML = list
    .map((q) => {
      const selected = q.id === ui.selectedQuestId ? "selected" : "";
      return `<tr class="${selected}" data-id="${q.id}">
        <td>${q.id}</td>
        <td>${q.isDone ? "✓" : ""}</td>
        <td>${escapeHtml(q.category)}</td>
        <td title="${escapeHtml(q.detail || "")}">${escapeHtml(q.title)}</td>
        <td>${escapeHtml(formatDate(q.createdAt))}</td>
      </tr>`;
    })
    .join("");
  [...els.questTableBody.querySelectorAll("tr")].forEach((row) => {
    row.addEventListener("click", () => {
      ui.selectedQuestId = Number(row.dataset.id);
      renderQuestTable();
    });
  });
}

function ensureQuestTemplates(companyId) {
  const existingTitles = new Set(state.quests.filter((q) => q.companyId === companyId).map((q) => q.title));
  QUEST_LIBRARY.forEach((template) => {
    if (existingTitles.has(template.title)) return;
    state.quests.push({
      id: state.meta.nextQuestId++,
      companyId,
      title: template.title,
      detail: template.detail,
      category: template.category,
      isDone: false,
      createdAt: nowIso(),
      doneAt: "",
    });
  });
}

function updateQuestDone(done) {
  if (!ui.selectedQuestId) {
    alert("対象クエストを選択してください。");
    return;
  }
  const idx = state.quests.findIndex((q) => q.id === ui.selectedQuestId);
  if (idx === -1) return;
  state.quests[idx].isDone = done;
  state.quests[idx].doneAt = done ? nowIso() : "";
  saveState();
  renderAll();
}

function deleteQuest() {
  if (!ui.selectedQuestId) {
    alert("削除するクエストを選択してください。");
    return;
  }
  state.quests = state.quests.filter((q) => q.id !== ui.selectedQuestId);
  ui.selectedQuestId = null;
  saveState();
  renderAll();
}

function renderCompareChecklist() {
  const validSet = new Set(state.companies.map((c) => c.id));
  state.appState.compareIds = (state.appState.compareIds || []).filter((id) => validSet.has(id));
  const html = state.companies
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
    .map((c) => {
      const checked = state.appState.compareIds.includes(c.id) ? "checked" : "";
      return `<label><input type="checkbox" value="${c.id}" ${checked}> ${escapeHtml(c.name)} (${escapeHtml(c.status)})</label>`;
    })
    .join("");
  els.compareChecklist.innerHTML = html || "<p>企業を登録すると比較できます。</p>";
  [...els.compareChecklist.querySelectorAll("input[type=checkbox]")].forEach((box) => {
    box.addEventListener("change", () => {
      const id = Number(box.value);
      if (box.checked) {
        if (!state.appState.compareIds.includes(id)) state.appState.compareIds.push(id);
      } else {
        state.appState.compareIds = state.appState.compareIds.filter((v) => v !== id);
      }
      saveState();
    });
  });
}

function runComparison() {
  const ids = state.appState.compareIds || [];
  if (ids.length < 2) {
    alert("比較する企業を2社以上選択してください。");
    return;
  }
  const companies = ids.map((id) => getCompanyById(id)).filter(Boolean);
  const w = state.weights;
  const ranked = companies
    .map((c) => {
      const score =
        c.fit * w.culture +
        c.understanding * w.growth +
        c.empathy * w.social +
        c.interest * w.autonomy +
        (5 - c.anxiety) * w.stability +
        Math.round(((c.fit + c.interest) / 2) * w.worklife);
      return { company: c, score };
    })
    .sort((a, b) => b.score - a.score);

  const lines = [];
  lines.push("比較結果");
  lines.push("=".repeat(65));
  lines.push(`重み: 成長${w.growth} / 安定${w.stability} / 裁量${w.autonomy} / 社会${w.social} / 文化${w.culture} / 働き方${w.worklife}`);
  lines.push("");
  ranked.forEach((entry, index) => {
    const c = entry.company;
    const plus = state.cards
      .filter((card) => card.companyId === c.id && card.cardType === "推しポイント")
      .slice(-2)
      .map((card) => card.title);
    const minus = state.cards
      .filter((card) => card.companyId === c.id && card.cardType === "モヤモヤ")
      .slice(-2)
      .map((card) => card.title);
    lines.push(
      `${index + 1}. ${c.name} | 総合スコア: ${entry.score} | 理解${c.understanding}/共感${c.empathy}/相性${c.fit}/不安${c.anxiety}/志望${c.interest}`
    );
    lines.push(`   推しポイント: ${plus.length ? plus.join(" / ") : "未登録"}`);
    lines.push(`   モヤモヤ: ${minus.length ? minus.join(" / ") : "未登録"}`);
    lines.push("");
  });
  const output = lines.join("\n");
  els.compareOutput.value = output;
  state.appState.compareDraft = output;
  saveState();
}

function generateMotivation() {
  const companyId = toNumberOrNull(els.docsCompanySelect.value);
  if (!companyId) {
    alert("企業を選択してください。");
    return;
  }
  const company = getCompanyById(companyId);
  if (!company) return;
  const plus = state.cards
    .filter((c) => c.companyId === companyId && c.cardType === "推しポイント")
    .slice(-4)
    .map((c) => c.title);
  const concerns = state.cards
    .filter((c) => c.companyId === companyId && c.cardType === "モヤモヤ")
    .slice(-2)
    .map((c) => c.title);

  const plusText = plus.length ? plus.join("、") : "（推しポイント未登録）";
  const concernText = concerns.length ? concerns.join("、") : "特になし";
  const strengths = state.profile.strengths || "（プロフィール未入力）";
  const experiences = state.profile.experiences || "（プロフィール未入力）";

  const out = [
    "志望動機の骨子（たたき台）",
    "=".repeat(60),
    `対象企業: ${company.name} / ${company.industry} / 想定職種: ${company.role}`,
    "",
    "1. 結論",
    `貴社を志望する理由は、${plusText} に強く惹かれ、自分の強みを活かして価値提供できると考えるためです。`,
    "",
    "2. 惹かれた理由（企業理解）",
    `- 理解度: ${company.understanding} / 5`,
    `- 共感している点: ${plusText}`,
    `- 事前に確認したい懸念: ${concernText}`,
    "",
    "3. 自分の経験との接続",
    `- 強み: ${strengths}`,
    `- 経験: ${experiences}`,
    "-> 上記経験を、志望職種でどう再現するかを2-3文で補足してください。",
    "",
    "4. 入社後にやりたいこと",
    "入社後は現場理解を深めながら短期で成果を出し、中長期では事業成長に直結する課題解決を担いたいです。",
  ].join("\n");
  els.docsOutput.value = out;
  state.appState.docsDraft = out;
  saveState();
}

function generateInterviewSheet() {
  const companyId = toNumberOrNull(els.docsCompanySelect.value);
  if (!companyId) {
    alert("企業を選択してください。");
    return;
  }
  const company = getCompanyById(companyId);
  if (!company) return;
  const plus = state.cards
    .filter((c) => c.companyId === companyId && c.cardType === "推しポイント")
    .slice(-3)
    .map((c) => c.title);
  const minus = state.cards
    .filter((c) => c.companyId === companyId && c.cardType === "モヤモヤ")
    .slice(-1)
    .map((c) => c.title);
  const pending = state.quests
    .filter((q) => q.companyId === companyId && !q.isDone)
    .slice(-3)
    .map((q) => q.title);

  const lines = [];
  lines.push("面接前30秒復習シート");
  lines.push("=".repeat(60));
  lines.push(`企業: ${company.name} | 分類: ${company.status}`);
  lines.push(
    `理解/共感/相性/不安/志望: ${company.understanding}/${company.empathy}/${company.fit}/${company.anxiety}/${company.interest}`
  );
  lines.push("");
  lines.push("好きな理由 3つ");
  if (plus.length) {
    plus.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
  } else {
    lines.push("1. （推しポイントを追加すると精度が上がります）");
  }
  lines.push("");
  lines.push("確認したい懸念 1つ");
  lines.push(`1. ${minus[0] || "（モヤモヤ未登録）"}`);
  lines.push("");
  lines.push("逆質問候補");
  if (pending.length) {
    pending.forEach((item, i) => lines.push(`${i + 1}. ${item} に関して、現場ではどう運用されていますか？`));
  } else {
    lines.push("1. 配属後3カ月で期待される成果を教えてください。");
    lines.push("2. 活躍している若手の共通点を教えてください。");
    lines.push("3. 評価において重視される行動を教えてください。");
  }
  const out = lines.join("\n");
  els.docsOutput.value = out;
  state.appState.docsDraft = out;
  saveState();
}

async function improveWithLocalAi() {
  const draft = els.docsOutput.value.trim();
  if (!draft) {
    alert("先に志望動機骨子または面接復習シートを生成してください。");
    return;
  }
  const model = els.ollamaModelInput.value.trim() || "qwen2.5:7b-instruct";
  state.appState.ollamaModel = model;
  saveState();

  const prompt =
    "あなたは就活の言語化コーチです。以下の文章を、誠実で具体的な日本語に改善してください。" +
    "推測で企業情報を増やさず、元の内容の根拠から外れないでください。" +
    "出力は『改善版』と『改善ポイント3点』の2部構成にしてください。\n\n原文:\n" +
    draft;

  els.improveLocalAiBtn.disabled = true;
  const oldText = els.improveLocalAiBtn.textContent;
  els.improveLocalAiBtn.textContent = "改善中...";
  try {
    const improved = await callOllama(prompt, model);
    els.docsOutput.value = `${draft}\n\n---\n\n${improved}`;
    state.appState.docsDraft = els.docsOutput.value;
    saveState();
  } catch (err) {
    alert(
      `ローカルAI接続に失敗しました。\n\n${err.message}\n\n` +
        "Ollamaを使う場合はローカルで `ollama serve` を起動してください。"
    );
  } finally {
    els.improveLocalAiBtn.disabled = false;
    els.improveLocalAiBtn.textContent = oldText;
  }
}

async function callOllama(prompt, model) {
  const res = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0.3 },
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = (data.response || "").trim();
  if (!text) throw new Error("空の応答が返されました。");
  return text;
}

function renderProfileForm() {
  els.profileName.value = state.profile.name;
  els.profileStrengths.value = state.profile.strengths;
  els.profileExperiences.value = state.profile.experiences;
  els.profileValues.value = state.profile.valuesText;
  els.weightInputs.forEach((input) => {
    const key = input.dataset.weight;
    const value = Number(state.weights[key] || 3);
    input.value = String(value);
    const out = els.weightValues.find((v) => v.dataset.weightValue === key);
    if (out) out.textContent = String(value);
  });
  els.ollamaModelInput.value = state.appState.ollamaModel || "qwen2.5:7b-instruct";
}

function saveProfile() {
  state.profile = {
    name: els.profileName.value.trim(),
    strengths: els.profileStrengths.value.trim(),
    experiences: els.profileExperiences.value.trim(),
    valuesText: els.profileValues.value.trim(),
  };
  state.weights = {
    growth: Number(findWeightInput("growth").value),
    stability: Number(findWeightInput("stability").value),
    autonomy: Number(findWeightInput("autonomy").value),
    social: Number(findWeightInput("social").value),
    culture: Number(findWeightInput("culture").value),
    worklife: Number(findWeightInput("worklife").value),
  };
  saveState();
  alert("プロフィールを保存しました。");
}

function findWeightInput(key) {
  return els.weightInputs.find((i) => i.dataset.weight === key);
}

function applyAppDrafts() {
  if (!els.compareOutput.value) {
    els.compareOutput.value = state.appState.compareDraft || "";
  }
  if (!els.docsOutput.value) {
    els.docsOutput.value = state.appState.docsDraft || "";
  }
}

function exportJson() {
  const payload = {
    ...state,
    exportedAt: nowIso(),
    version: 2,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `oshikan-export-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const normalized = normalizeImportedState(parsed);
      const ok = confirm("現在のデータを読み込みデータで置き換えます。続行しますか？");
      if (!ok) return;
      state = normalized;
      ui.selectedCompanyId = null;
      ui.selectedCardId = null;
      ui.selectedQuestId = null;
      saveState();
      restoreUiSelections();
      renderAll();
      setTab(state.appState.activeTab || "home", false);
      alert("インポートが完了しました。");
    } catch (err) {
      alert(`JSONの読み込みに失敗しました。\n${err.message}`);
    } finally {
      els.importFileInput.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function restoreUiSelections() {
  const id = validCompanyId(state.appState.lastCompanyId);
  ui.selectedCompanyId = id;
  if (id) {
    const company = getCompanyById(id);
    if (company) fillCompanyForm(company);
  } else {
    fillCompanyForm(null);
  }
}

function normalizeImportedState(data) {
  const next = deepClone(defaultState);
  const companies = Array.isArray(data.companies) ? data.companies : [];
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const quests = Array.isArray(data.quests) ? data.quests : [];

  next.companies = companies.map((c) => ({
    id: Number(c.id),
    name: String(c.name || ""),
    industry: String(c.industry || ""),
    role: String(c.role || ""),
    url: String(c.url || ""),
    status: STATUS_OPTIONS.includes(c.status) ? c.status : STATUS_OPTIONS[0],
    understanding: clampInt(c.understanding, 0, 5),
    empathy: clampInt(c.empathy, 0, 5),
    fit: clampInt(c.fit, 0, 5),
    anxiety: clampInt(c.anxiety, 0, 5),
    interest: clampInt(c.interest, 0, 5),
    notes: String(c.notes || ""),
    createdAt: String(c.createdAt || nowIso()),
    updatedAt: String(c.updatedAt || nowIso()),
  })).filter((c) => Number.isFinite(c.id) && c.id > 0);

  const validCompanyIds = new Set(next.companies.map((c) => c.id));

  next.cards = cards
    .map((c) => ({
      id: Number(c.id),
      companyId: Number(c.companyId),
      cardType: CARD_TYPES.includes(c.cardType) ? c.cardType : CARD_TYPES[0],
      title: String(c.title || ""),
      source: String(c.source || ""),
      detail: String(c.detail || ""),
      createdAt: String(c.createdAt || nowIso()),
    }))
    .filter((c) => Number.isFinite(c.id) && c.id > 0 && validCompanyIds.has(c.companyId) && c.title);

  next.quests = quests
    .map((q) => ({
      id: Number(q.id),
      companyId: Number(q.companyId),
      title: String(q.title || ""),
      detail: String(q.detail || ""),
      category: String(q.category || ""),
      isDone: Boolean(q.isDone),
      createdAt: String(q.createdAt || nowIso()),
      doneAt: String(q.doneAt || ""),
    }))
    .filter((q) => Number.isFinite(q.id) && q.id > 0 && validCompanyIds.has(q.companyId) && q.title);

  next.profile = {
    name: String(data.profile?.name || ""),
    strengths: String(data.profile?.strengths || ""),
    experiences: String(data.profile?.experiences || ""),
    valuesText: String(data.profile?.valuesText || ""),
  };
  next.weights = {
    growth: clampInt(data.weights?.growth, 1, 5, 3),
    stability: clampInt(data.weights?.stability, 1, 5, 3),
    autonomy: clampInt(data.weights?.autonomy, 1, 5, 3),
    social: clampInt(data.weights?.social, 1, 5, 3),
    culture: clampInt(data.weights?.culture, 1, 5, 3),
    worklife: clampInt(data.weights?.worklife, 1, 5, 3),
  };

  const maxCompanyId = next.companies.reduce((m, c) => Math.max(m, c.id), 0);
  const maxCardId = next.cards.reduce((m, c) => Math.max(m, c.id), 0);
  const maxQuestId = next.quests.reduce((m, q) => Math.max(m, q.id), 0);
  next.meta = {
    nextCompanyId: Math.max(maxCompanyId + 1, Number(data.meta?.nextCompanyId) || 1),
    nextCardId: Math.max(maxCardId + 1, Number(data.meta?.nextCardId) || 1),
    nextQuestId: Math.max(maxQuestId + 1, Number(data.meta?.nextQuestId) || 1),
  };

  next.appState = {
    ...defaultState.appState,
    ...data.appState,
    lastCompanyId: validCompanyIds.has(Number(data.appState?.lastCompanyId)) ? Number(data.appState.lastCompanyId) : null,
    cardsCompanyId: validCompanyIds.has(Number(data.appState?.cardsCompanyId)) ? Number(data.appState.cardsCompanyId) : null,
    questsCompanyId: validCompanyIds.has(Number(data.appState?.questsCompanyId)) ? Number(data.appState.questsCompanyId) : null,
    docsCompanyId: validCompanyIds.has(Number(data.appState?.docsCompanyId)) ? Number(data.appState.docsCompanyId) : null,
    compareIds: Array.isArray(data.appState?.compareIds)
      ? data.appState.compareIds.map((id) => Number(id)).filter((id) => validCompanyIds.has(id))
      : [],
    activeTab: typeof data.appState?.activeTab === "string" ? data.appState.activeTab : "home",
    docsDraft: String(data.appState?.docsDraft || ""),
    compareDraft: String(data.appState?.compareDraft || ""),
    ollamaModel: String(data.appState?.ollamaModel || "qwen2.5:7b-instruct"),
  };
  return next;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return deepClone(defaultState);
  try {
    const parsed = JSON.parse(raw);
    return normalizeImportedState(parsed);
  } catch (_err) {
    return deepClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCompanyById(id) {
  return state.companies.find((c) => c.id === id) || null;
}

function validCompanyId(value) {
  const id = Number(value);
  if (!Number.isFinite(id)) return null;
  return state.companies.some((c) => c.id === id) ? id : null;
}

function nowIso() {
  return new Date().toISOString();
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ja-JP");
}

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function clampInt(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
