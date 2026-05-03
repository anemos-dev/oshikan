import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const STORAGE_KEY = "oshikan.v2";
const TERMS_VERSION = 1;

const firebaseConfig = {
  apiKey: "AIzaSyA1iKn4uY1cG4t7zUjt_Q1361I5Cno67XM",
  authDomain: "oshikan-f13ca.firebaseapp.com",
  projectId: "oshikan-f13ca",
  storageBucket: "oshikan-f13ca.firebasestorage.app",
  messagingSenderId: "285596191651",
  appId: "1:285596191651:web:a9ee9f1ced86c27783e816",
  measurementId: "G-YR2QK0SQH7",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const STATUS_OPTIONS = ["気になる", "推し", "本命", "比較中", "保留", "卒業"];
const APPLICATION_STATUS_OPTIONS = ["未応募", "説明会予定", "ES準備中", "ES提出済み", "一次面接", "二次面接", "最終面接", "内定", "辞退", "不合格"];
const CARD_TYPES = ["推しポイント", "モヤモヤ"];
const MOTIVATION_MODES = [
  { value: "outline", label: "骨子" },
  { value: "200", label: "200字" },
  { value: "400", label: "400字" },
  { value: "600", label: "600字" },
  { value: "interview", label: "面接30秒" },
];
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
    termsVersion: 0,
    termsAcceptedAt: "",
    cloudUserId: "",
    cloudLastSyncedAt: "",
    onboardingSeen: false,
    sampleDataAdded: false,
  },
};

const ui = {
  selectedCompanyId: null,
  selectedCardId: null,
  selectedQuestId: null,
};

let state = loadState();
let currentUser = null;
let cloudSaveTimer = null;
let isLoadingCloud = false;

const els = {
  tabButtons: [...document.querySelectorAll(".tab-btn")],
  tabPanels: [...document.querySelectorAll(".tab-panel")],
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  importFileInput: document.getElementById("importFileInput"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  syncStatus: document.getElementById("syncStatus"),
  statCompanies: document.getElementById("statCompanies"),
  statCards: document.getElementById("statCards"),
  statQuests: document.getElementById("statQuests"),
  homeQuestList: document.getElementById("homeQuestList"),
  homeCardList: document.getElementById("homeCardList"),
  todayTodoList: document.getElementById("todayTodoList"),
  addSampleDataBtn: document.getElementById("addSampleDataBtn"),
  companyTableBody: document.getElementById("companyTableBody"),
  companySearch: document.getElementById("companySearch"),
  companyFilterStatus: document.getElementById("companyFilterStatus"),
  companyFilterApplication: document.getElementById("companyFilterApplication"),
  clearCompanyFiltersBtn: document.getElementById("clearCompanyFiltersBtn"),
  companyName: document.getElementById("companyName"),
  companyIndustry: document.getElementById("companyIndustry"),
  companyRole: document.getElementById("companyRole"),
  companyUrl: document.getElementById("companyUrl"),
  companyStatus: document.getElementById("companyStatus"),
  companyApplicationStatus: document.getElementById("companyApplicationStatus"),
  companyDeadlineDate: document.getElementById("companyDeadlineDate"),
  companyNextEventDate: document.getElementById("companyNextEventDate"),
  companyNextEventName: document.getElementById("companyNextEventName"),
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
  motivationModeSelect: document.getElementById("motivationModeSelect"),
  genMotivationBtn: document.getElementById("genMotivationBtn"),
  genInterviewBtn: document.getElementById("genInterviewBtn"),
  genReverseQuestionsBtn: document.getElementById("genReverseQuestionsBtn"),
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
  openTermsBtn: document.getElementById("openTermsBtn"),
  termsModal: document.getElementById("termsModal"),
  termsAgreeCheck: document.getElementById("termsAgreeCheck"),
  termsAcceptBtn: document.getElementById("termsAcceptBtn"),
  termsCloseBtn: document.getElementById("termsCloseBtn"),
  deleteCloudDataBtn: document.getElementById("deleteCloudDataBtn"),
  clearLocalDataBtn: document.getElementById("clearLocalDataBtn"),
  feedbackBtn: document.getElementById("feedbackBtn"),
  openTermsFromPrivacyBtn: document.getElementById("openTermsFromPrivacyBtn"),
  onboardingModal: document.getElementById("onboardingModal"),
  startOnboardingBtn: document.getElementById("startOnboardingBtn"),
  onboardingSampleBtn: document.getElementById("onboardingSampleBtn"),
  skipOnboardingBtn: document.getElementById("skipOnboardingBtn"),
};

init();

async function init() {
  renderStaticSelects();
  bindEvents();
  restoreUiSelections();
  renderAll();
  setTab(state.appState.activeTab || "home", false);
  maybeShowTermsModal();
  await prepareAuth();
  await handleRedirectSignIn();
  watchAuthState();
}

async function prepareAuth() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (err) {
    console.warn("Auth persistence setup failed", err);
  }
}

function renderStaticSelects() {
  els.companyStatus.innerHTML = STATUS_OPTIONS.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  els.companyFilterStatus.innerHTML = `<option value="">すべて</option>${STATUS_OPTIONS.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("")}`;
  els.companyApplicationStatus.innerHTML = APPLICATION_STATUS_OPTIONS.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  els.companyFilterApplication.innerHTML = `<option value="">すべて</option>${APPLICATION_STATUS_OPTIONS.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("")}`;
  els.cardType.innerHTML = CARD_TYPES.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  els.motivationModeSelect.innerHTML = MOTIVATION_MODES.map((m) => `<option value="${m.value}">${escapeHtml(m.label)}</option>`).join("");
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
  [els.companySearch, els.companyFilterStatus, els.companyFilterApplication].forEach((input) => {
    input.addEventListener("input", renderCompanyTable);
    input.addEventListener("change", renderCompanyTable);
  });
  els.clearCompanyFiltersBtn.addEventListener("click", () => {
    els.companySearch.value = "";
    els.companyFilterStatus.value = "";
    els.companyFilterApplication.value = "";
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
  els.genReverseQuestionsBtn.addEventListener("click", generateReverseQuestions);
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
  els.openTermsBtn.addEventListener("click", () => showTermsModal(false));
  els.openTermsFromPrivacyBtn.addEventListener("click", () => showTermsModal(false));
  els.termsAgreeCheck.addEventListener("change", () => {
    els.termsAcceptBtn.disabled = !els.termsAgreeCheck.checked;
  });
  els.termsAcceptBtn.addEventListener("click", acceptTerms);
  els.termsCloseBtn.addEventListener("click", () => hideTermsModal());
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
  els.loginBtn.addEventListener("click", loginWithGoogle);
  els.logoutBtn.addEventListener("click", logoutFromGoogle);
  els.addSampleDataBtn.addEventListener("click", addSampleData);
  els.deleteCloudDataBtn.addEventListener("click", deleteCloudData);
  els.clearLocalDataBtn.addEventListener("click", clearLocalData);
  els.feedbackBtn.addEventListener("click", openFeedback);
  els.startOnboardingBtn.addEventListener("click", () => {
    finishOnboarding();
    setTab("companies", true);
  });
  els.onboardingSampleBtn.addEventListener("click", () => {
    addSampleData();
    finishOnboarding();
  });
  els.skipOnboardingBtn.addEventListener("click", finishOnboarding);
}

function maybeShowTermsModal() {
  if (Number(state.appState.termsVersion || 0) < TERMS_VERSION) {
    showTermsModal(true);
  } else {
    maybeShowOnboarding();
  }
}

function showTermsModal(requireAcceptance) {
  els.termsModal.classList.remove("hidden");
  els.termsModal.dataset.required = requireAcceptance ? "true" : "false";
  els.termsAgreeCheck.checked = false;
  els.termsAcceptBtn.disabled = true;
  els.termsCloseBtn.style.display = requireAcceptance ? "none" : "inline-flex";
}

function hideTermsModal() {
  els.termsModal.classList.add("hidden");
}

function maybeShowOnboarding() {
  if (state.appState.onboardingSeen || hasUserData(state)) return;
  els.onboardingModal.classList.remove("hidden");
}

function finishOnboarding() {
  state.appState.onboardingSeen = true;
  saveState();
  els.onboardingModal.classList.add("hidden");
}

function acceptTerms() {
  state.appState.termsVersion = TERMS_VERSION;
  state.appState.termsAcceptedAt = nowIso();
  saveState();
  hideTermsModal();
  maybeShowOnboarding();
}

function watchAuthState() {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    renderAuthUi();
    if (user) {
      await loadCloudState(user);
    } else {
      setSyncStatus("未ログイン");
    }
  });
}

async function handleRedirectSignIn() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      currentUser = result.user;
      renderAuthUi();
    }
  } catch (err) {
    console.error(err);
    setSyncStatus("ログイン失敗");
    alert(`Googleログインに失敗しました。\n${err.message}`);
  }
}

async function loginWithGoogle() {
  setSyncStatus("ログイン中...");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    currentUser = result.user;
    renderAuthUi();
    await loadCloudState(result.user);
  } catch (err) {
    console.error(err);
    if (shouldFallbackToRedirect(err)) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirectErr) {
        console.error(redirectErr);
        setSyncStatus("ログイン失敗");
        alert(`Googleログインに失敗しました。\n${redirectErr.message}`);
        return;
      }
    }
    setSyncStatus("ログイン失敗");
    alert(`Googleログインに失敗しました。\n${err.message}`);
  }
}

function shouldFallbackToRedirect(err) {
  return ["auth/popup-blocked", "auth/cancelled-popup-request", "auth/operation-not-supported-in-this-environment"].includes(err?.code);
}

async function logoutFromGoogle() {
  try {
    await flushCloudSave();
    await signOut(auth);
  } catch (err) {
    console.error(err);
    alert(`ログアウトに失敗しました。\n${err.message}`);
  }
}

function renderAuthUi() {
  if (currentUser) {
    els.loginBtn.classList.add("hidden");
    els.logoutBtn.classList.remove("hidden");
    setSyncStatus(`${currentUser.displayName || "ログイン中"} と同期`);
  } else {
    els.loginBtn.classList.remove("hidden");
    els.logoutBtn.classList.add("hidden");
  }
}

function setSyncStatus(text) {
  els.syncStatus.textContent = text;
}

async function loadCloudState(user) {
  isLoadingCloud = true;
  setSyncStatus("クラウド確認中...");
  try {
    const ref = cloudDocRef(user.uid);
    const snapshot = await getDoc(ref);
    const localHasData = hasUserData(state);
    const isSameCloudUser = state.appState.cloudUserId === user.uid;

    if (!snapshot.exists()) {
      await saveStateToCloudNow();
      setSyncStatus("クラウドに保存しました");
      return;
    }

    const cloudPayload = snapshot.data();
    const cloudState = normalizeImportedState(cloudPayload.state || {});

    if (localHasData && !isSameCloudUser) {
      const useCloud = confirm(
        "クラウドに保存済みの推しカンデータがあります。\n\nOK: クラウドデータをこの端末に読み込む\nキャンセル: この端末のデータでクラウドを上書きする"
      );
      if (!useCloud) {
        await saveStateToCloudNow();
        setSyncStatus("この端末のデータを同期しました");
        return;
      }
    }

    state = cloudState;
    state.appState.cloudUserId = user.uid;
    state.appState.cloudLastSyncedAt = nowIso();
    saveLocalOnly();
    restoreUiSelections();
    renderAll();
    setTab(state.appState.activeTab || "home", false);
    setSyncStatus("クラウドから読み込みました");
  } catch (err) {
    console.error(err);
    setSyncStatus("同期エラー");
    alert(`クラウド同期に失敗しました。\n${err.message}`);
  } finally {
    isLoadingCloud = false;
  }
}

function cloudDocRef(uid) {
  return doc(db, "users", uid, "appState", "main");
}

function hasUserData(targetState) {
  return (
    targetState.companies.length > 0 ||
    targetState.cards.length > 0 ||
    targetState.quests.length > 0 ||
    Boolean(targetState.profile.strengths || targetState.profile.experiences || targetState.profile.valuesText)
  );
}

function scheduleCloudSave() {
  if (!currentUser || isLoadingCloud) return;
  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(() => {
    saveStateToCloudNow();
  }, 900);
}

async function flushCloudSave() {
  if (!currentUser) return;
  window.clearTimeout(cloudSaveTimer);
  await saveStateToCloudNow();
}

async function saveStateToCloudNow() {
  if (!currentUser) return;
  state.appState.cloudUserId = currentUser.uid;
  state.appState.cloudLastSyncedAt = nowIso();
  saveLocalOnly();
  setSyncStatus("保存中...");
  await setDoc(
    cloudDocRef(currentUser.uid),
    {
      state,
      updatedAt: serverTimestamp(),
      version: 2,
    },
    { merge: true }
  );
  setSyncStatus("保存済み");
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
  renderSampleDataButton();

  const todos = buildTodayTodos();
  els.todayTodoList.innerHTML = todos
    .map((todo) => `<li><span class="todo-badge ${todo.tone}">${escapeHtml(todo.badge)}</span><span>${todo.html}</span></li>`)
    .join("");
  if (!todos.length) {
    els.todayTodoList.innerHTML = "<li><span class=\"todo-badge soft\">OK</span><span>急ぎの予定はありません。気になる企業を1社だけ深掘りしてみましょう。</span></li>";
  }

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

function renderSampleDataButton() {
  const added = Boolean(state.appState.sampleDataAdded);
  els.addSampleDataBtn.disabled = added;
  els.addSampleDataBtn.textContent = added ? "サンプル投入済み" : "サンプルデータを入れる";
  els.onboardingSampleBtn.disabled = added;
  els.onboardingSampleBtn.textContent = added ? "サンプル投入済み" : "サンプルで試す";
}

function buildTodayTodos() {
  const todos = [];
  state.companies.forEach((company) => {
    const deadlineDays = daysUntil(company.deadlineDate);
    if (deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7) {
      todos.push({
        badge: deadlineDays === 0 ? "今日締切" : `${deadlineDays}日後`,
        tone: deadlineDays <= 1 ? "" : "soft",
        sort: deadlineDays,
        html: `${escapeHtml(company.name)} のES締切を確認する（${escapeHtml(company.deadlineDate)}）`,
      });
    }
    const eventDays = daysUntil(company.nextEventDate);
    if (eventDays !== null && eventDays >= 0 && eventDays <= 7) {
      todos.push({
        badge: eventDays === 0 ? "今日予定" : `${eventDays}日後`,
        tone: "calm",
        sort: eventDays + 0.2,
        html: `${escapeHtml(company.name)}: ${escapeHtml(company.nextEventName || "次の予定")}（${escapeHtml(company.nextEventDate)}）`,
      });
    }
    const hasCards = state.cards.some((card) => card.companyId === company.id);
    if (!hasCards && todos.length < 12) {
      todos.push({
        badge: "カード",
        tone: "soft",
        sort: 20,
        html: `${escapeHtml(company.name)} の推しポイントを1つカードにする`,
      });
    }
  });

  state.quests
    .filter((q) => !q.isDone)
    .slice(-8)
    .forEach((quest) => {
      const company = getCompanyById(quest.companyId);
      todos.push({
        badge: "研究",
        tone: "calm",
        sort: 30,
        html: `${escapeHtml(company ? company.name : "不明")}: ${escapeHtml(quest.title)}`,
      });
    });

  return todos.sort((a, b) => a.sort - b.sort).slice(0, 10);
}

function renderCompanyTable() {
  const keyword = els.companySearch.value.trim().toLowerCase();
  const filterStatus = els.companyFilterStatus.value;
  const filterApplication = els.companyFilterApplication.value;
  const sorted = [...state.companies].filter((c) => {
    const haystack = [c.name, c.industry, c.role, c.notes, c.applicationStatus].join(" ").toLowerCase();
    if (keyword && !haystack.includes(keyword)) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterApplication && c.applicationStatus !== filterApplication) return false;
    return true;
  }).sort((a, b) => {
    const order = STATUS_OPTIONS.indexOf(a.status) - STATUS_OPTIONS.indexOf(b.status);
    if (order !== 0) return order;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  els.companyTableBody.innerHTML = sorted
    .map((c) => {
      const selected = c.id === ui.selectedCompanyId ? "selected" : "";
      const nextEvent = formatCompanyNextEvent(c);
      return `<tr class="${selected}" data-id="${c.id}">
        <td data-label="ID">${c.id}</td>
        <td data-label="企業名">${escapeHtml(c.name)}</td>
        <td data-label="分類">${escapeHtml(c.status)}</td>
        <td data-label="業界">${escapeHtml(c.industry)}</td>
        <td data-label="職種">${escapeHtml(c.role)}</td>
        <td data-label="選考">${escapeHtml(c.applicationStatus)}</td>
        <td data-label="次の予定">${escapeHtml(nextEvent)}</td>
        <td data-label="志望度">${c.interest}</td>
      </tr>`;
    })
    .join("");
  if (!sorted.length) {
    els.companyTableBody.innerHTML = `<tr><td data-label="結果" colspan="8">条件に合う企業がありません。</td></tr>`;
  }

  [...els.companyTableBody.querySelectorAll("tr")].forEach((row) => {
    row.addEventListener("click", () => {
      const id = Number(row.dataset.id);
      if (!Number.isFinite(id)) return;
      selectCompany(id);
    });
  });
}

function formatCompanyNextEvent(company) {
  if (company.nextEventDate) {
    return `${company.nextEventDate} ${company.nextEventName || "予定"}`;
  }
  if (company.deadlineDate) {
    return `ES締切 ${company.deadlineDate}`;
  }
  return "-";
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
    applicationStatus: APPLICATION_STATUS_OPTIONS[0],
    deadlineDate: "",
    nextEventDate: "",
    nextEventName: "",
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
  els.companyApplicationStatus.value = c.applicationStatus || APPLICATION_STATUS_OPTIONS[0];
  els.companyDeadlineDate.value = c.deadlineDate || "";
  els.companyNextEventDate.value = c.nextEventDate || "";
  els.companyNextEventName.value = c.nextEventName || "";
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
    applicationStatus: els.companyApplicationStatus.value || APPLICATION_STATUS_OPTIONS[0],
    deadlineDate: els.companyDeadlineDate.value,
    nextEventDate: els.companyNextEventDate.value,
    nextEventName: els.companyNextEventName.value.trim(),
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
        <td data-label="ID">${c.id}</td>
        <td data-label="種類">${escapeHtml(c.cardType)}</td>
        <td data-label="タイトル">${escapeHtml(c.title)}</td>
        <td data-label="情報源">${escapeHtml(c.source || "-")}</td>
        <td data-label="作成日">${escapeHtml(formatDate(c.createdAt))}</td>
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
        <td data-label="ID">${q.id}</td>
        <td data-label="完了">${q.isDone ? "✓" : ""}</td>
        <td data-label="カテゴリ">${escapeHtml(q.category)}</td>
        <td data-label="クエスト" title="${escapeHtml(q.detail || "")}">${escapeHtml(q.title)}</td>
        <td data-label="作成日">${escapeHtml(formatDate(q.createdAt))}</td>
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
  const mode = els.motivationModeSelect.value || "outline";
  const out = buildMotivationOutput(mode, company, plusText, concernText, strengths, experiences);
  els.docsOutput.value = out;
  state.appState.docsDraft = out;
  saveState();
}

function buildMotivationOutput(mode, company, plusText, concernText, strengths, experiences) {
  if (mode === "200") {
    return [
      "志望動機 200字版（たたき台）",
      "=".repeat(60),
      `私が${company.name}を志望する理由は、${plusText}に強く惹かれたためです。`,
      `これまでの経験で培った${strengths}を活かし、${company.role || "志望職種"}として顧客や事業の課題解決に貢献したいと考えています。`,
      `入社後は現場理解を深め、早期に成果を出せる人材を目指します。`,
      "",
      `確認したい懸念: ${concernText}`,
    ].join("\n");
  }
  if (mode === "400" || mode === "600") {
    const extra = mode === "600"
      ? [
          "",
          "さらに深める観点",
          `- ${company.industry || "業界"}の中でなぜこの会社なのか`,
          `- ${experiences} から再現できる行動`,
          `- 入社後1年目に学びたいこと、3年目に担いたいこと`,
        ]
      : [];
    return [
      `志望動機 ${mode}字版（たたき台）`,
      "=".repeat(60),
      `私が${company.name}を志望する理由は、${plusText}に魅力を感じ、自分の価値観や強みと重なる部分が大きいと考えたためです。`,
      `私はこれまで、${experiences}という経験を通じて、${strengths}を磨いてきました。`,
      `この経験は、${company.role || "志望職種"}として相手の課題を捉え、周囲を巻き込みながら成果につなげる場面で活かせると考えています。`,
      `一方で、${concernText}については選考を通じて理解を深めたいです。`,
      "入社後は、まず現場で必要な知識と行動基準を吸収し、短期では任された業務で信頼を積み重ね、中長期では事業成長に直結する課題解決を担いたいです。",
      ...extra,
    ].join("\n");
  }
  if (mode === "interview") {
    return [
      "志望動機 面接30秒版",
      "=".repeat(60),
      `私が${company.name}を志望する理由は、${plusText}に惹かれたからです。`,
      `自分の${strengths}という強みは、${company.role || "志望職種"}で成果を出すうえで活かせると考えています。`,
      "入社後はまず現場で学び、早く信頼される行動を積み重ねたいです。",
      "",
      "深掘りされた時の補足",
      `- 原体験: ${experiences}`,
      `- 確認したい点: ${concernText}`,
    ].join("\n");
  }
  return [
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
}

function generateReverseQuestions() {
  const companyId = toNumberOrNull(els.docsCompanySelect.value);
  if (!companyId) {
    alert("企業を選択してください。");
    return;
  }
  const company = getCompanyById(companyId);
  if (!company) return;
  const concerns = state.cards
    .filter((c) => c.companyId === companyId && c.cardType === "モヤモヤ")
    .slice(-4)
    .map((c) => c.title);
  const pending = state.quests
    .filter((q) => q.companyId === companyId && !q.isDone)
    .slice(-4)
    .map((q) => q.title);
  const lines = [
    "逆質問メーカー",
    "=".repeat(60),
    `企業: ${company.name} / 選考: ${company.applicationStatus}`,
    "",
    "そのまま聞ける質問",
    "1. 入社後3カ月で期待される成果や行動を教えてください。",
    `2. ${company.role || "この職種"}で活躍している若手に共通する姿勢や習慣はありますか？`,
    "3. 配属後に最初につまずきやすいポイントと、乗り越え方を教えてください。",
    "4. チーム内で大切にされているコミュニケーションの取り方を教えてください。",
    "5. 評価される人と伸び悩む人の違いを、可能な範囲で教えてください。",
    "",
    "自分のメモから作った質問",
  ];
  if (concerns.length) {
    concerns.forEach((item, index) => lines.push(`${index + 1}. ${item}について、実際の現場ではどのように捉えられていますか？`));
  } else {
    lines.push("- モヤモヤカードを追加すると、不安を自然な逆質問に変換できます。");
  }
  lines.push("");
  lines.push("調べ残しから作った質問");
  if (pending.length) {
    pending.forEach((item, index) => lines.push(`${index + 1}. ${item}に関連して、選考前に理解しておくべき観点はありますか？`));
  } else {
    lines.push("- 未完了クエストがないため、基本質問を中心に準備できています。");
  }
  const out = lines.join("\n");
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

function addSampleData() {
  if (state.appState.sampleDataAdded || hasSampleCompanies()) {
    state.appState.sampleDataAdded = true;
    saveState();
    renderSampleDataButton();
    alert("サンプルデータはすでに追加済みです。重複を防ぐため、もう一度は追加しません。");
    return;
  }
  const ok = state.companies.length
    ? confirm("サンプル企業・カード・クエストを追加します。現在のデータは残ります。サンプル投入は1回だけです。")
    : true;
  if (!ok) return;
  const today = new Date();
  const samples = [
    {
      name: "ミライ食品",
      industry: "食品・D2C",
      role: "企画職",
      status: "推し",
      applicationStatus: "ES準備中",
      deadlineOffset: 3,
      eventOffset: 10,
      eventName: "説明会",
      plus: ["生活者の小さな困りごとから商品を作る姿勢", "若手でも企画提案できる文化"],
      minus: ["繁忙期の働き方を確認したい"],
    },
    {
      name: "ソラノデザイン",
      industry: "IT・デザイン",
      role: "UXリサーチ",
      status: "本命",
      applicationStatus: "一次面接",
      deadlineOffset: 6,
      eventOffset: 2,
      eventName: "一次面接",
      plus: ["ユーザー観察を重視したプロダクト改善", "チームで仮説検証する進め方"],
      minus: ["配属後の教育体制を知りたい"],
    },
    {
      name: "アオバテック",
      industry: "SaaS",
      role: "カスタマーサクセス",
      status: "比較中",
      applicationStatus: "説明会予定",
      deadlineOffset: 12,
      eventOffset: 5,
      eventName: "オンライン説明会",
      plus: ["顧客の業務改善に長く伴走できる点"],
      minus: ["営業目標とのバランスが気になる"],
    },
  ];

  samples.forEach((sample) => {
    const id = state.meta.nextCompanyId++;
    const now = nowIso();
    state.companies.push({
      id,
      name: sample.name,
      industry: sample.industry,
      role: sample.role,
      url: "",
      status: sample.status,
      applicationStatus: sample.applicationStatus,
      deadlineDate: dateOffset(today, sample.deadlineOffset),
      nextEventDate: dateOffset(today, sample.eventOffset),
      nextEventName: sample.eventName,
      understanding: 3,
      empathy: 4,
      fit: 4,
      anxiety: 2,
      interest: sample.status === "本命" ? 5 : 4,
      notes: "サンプルデータです。使い方を試したら削除してOKです。",
      createdAt: now,
      updatedAt: now,
    });
    sample.plus.forEach((title) => {
      state.cards.push({
        id: state.meta.nextCardId++,
        companyId: id,
        cardType: "推しポイント",
        title,
        source: "サンプル",
        detail: "",
        createdAt: now,
      });
    });
    sample.minus.forEach((title) => {
      state.cards.push({
        id: state.meta.nextCardId++,
        companyId: id,
        cardType: "モヤモヤ",
        title,
        source: "サンプル",
        detail: "",
        createdAt: now,
      });
    });
    ensureQuestTemplates(id);
  });

  state.appState.onboardingSeen = true;
  state.appState.sampleDataAdded = true;
  saveState();
  restoreUiSelections();
  renderAll();
  setTab("home", true);
  alert("サンプルデータを追加しました。");
}

function hasSampleCompanies() {
  const sampleNames = new Set(["ミライ食品", "ソラノデザイン", "アオバテック"]);
  return state.companies.some((company) => sampleNames.has(company.name));
}

async function deleteCloudData() {
  if (!currentUser) {
    alert("クラウドデータを削除するにはGoogleログインが必要です。");
    return;
  }
  const ok = confirm("Firebase上のクラウドデータを削除します。\nこの端末のデータは残ります。続行しますか？");
  if (!ok) return;
  try {
    window.clearTimeout(cloudSaveTimer);
    await deleteDoc(cloudDocRef(currentUser.uid));
    state.appState.cloudUserId = "";
    state.appState.cloudLastSyncedAt = "";
    saveLocalOnly();
    await signOut(auth);
    setSyncStatus("クラウド削除済み");
    alert("クラウドデータを削除し、再保存を防ぐためログアウトしました。この端末のデータは残っています。");
  } catch (err) {
    console.error(err);
    alert(`クラウドデータ削除に失敗しました。\n${err.message}`);
  }
}

function clearLocalData() {
  const ok = confirm("この端末の推しカンデータを削除します。\nクラウドデータは削除されません。必要なら先にJSONエクスポートしてください。");
  if (!ok) return;
  state = deepClone(defaultState);
  ui.selectedCompanyId = null;
  ui.selectedCardId = null;
  ui.selectedQuestId = null;
  saveLocalOnly();
  renderAll();
  setTab("home", false);
  maybeShowOnboarding();
}

function openFeedback() {
  const title = encodeURIComponent("推しカンへのフィードバック");
  const body = encodeURIComponent("困ったこと・ほしい機能:\n\n使っている環境:\n");
  window.open(`https://github.com/anemos-dev/oshikan/issues/new?title=${title}&body=${body}`, "_blank", "noopener");
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
    applicationStatus: APPLICATION_STATUS_OPTIONS.includes(c.applicationStatus) ? c.applicationStatus : APPLICATION_STATUS_OPTIONS[0],
    deadlineDate: normalizeDateInput(c.deadlineDate),
    nextEventDate: normalizeDateInput(c.nextEventDate),
    nextEventName: String(c.nextEventName || ""),
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
    termsVersion: Number(data.appState?.termsVersion || 0),
    termsAcceptedAt: String(data.appState?.termsAcceptedAt || ""),
    cloudUserId: String(data.appState?.cloudUserId || ""),
    cloudLastSyncedAt: String(data.appState?.cloudLastSyncedAt || ""),
    onboardingSeen: Boolean(data.appState?.onboardingSeen),
    sampleDataAdded: Boolean(data.appState?.sampleDataAdded) || next.companies.some((company) => ["ミライ食品", "ソラノデザイン", "アオバテック"].includes(company.name)),
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
  saveLocalOnly();
  scheduleCloudSave();
}

function saveLocalOnly() {
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

function normalizeDateInput(value) {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function dateOffset(baseDate, offsetDays) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function daysUntil(dateText) {
  const normalized = normalizeDateInput(dateText);
  if (!normalized) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [year, month, day] = normalized.split("-").map(Number);
  const targetUtc = Date.UTC(year, month - 1, day);
  return Math.round((targetUtc - todayUtc) / 86400000);
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
