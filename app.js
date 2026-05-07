// =====================================================
// 出欠管理アプリ
// =====================================================

// ----- 定数 -----
const STATUS_TYPES = [
  { code: 'present',   label: '出席' },
  { code: 'absent',    label: '欠席' },
  { code: 'tardy',     label: '遅刻' },
  { code: 'early',     label: '早退' },
  { code: 'suspended', label: '出停' },
  { code: 'mourning',  label: '忌引' },
  { code: 'official',  label: '公欠' },
  { code: 'abroad',    label: '留学' },
  { code: 'leave',     label: '休学' },
];
const STATUS_LABEL = Object.fromEntries(STATUS_TYPES.map(s => [s.code, s.label]));

// 状態のアイコン文字
const STATUS_ICON = {
  present: '出', absent: '欠', tardy: '遅', early: '早',
  suspended: '停', mourning: '忌', official: '公', abroad: '留', leave: '休',
};

const PRIMARY_STATUSES   = ['present','absent','tardy','early'];
const SECONDARY_STATUSES = ['suspended','mourning','official','abroad','leave'];

const WEEKDAYS = ['月','火','水','木','金','土'];

const HOLIDAY_KEYWORDS = [
  '元日','成人の日','建国記念の日','建国記念日','天皇誕生日','春分の日','昭和の日',
  '憲法記念日','みどりの日','こどもの日','海の日','山の日','敬老の日','秋分の日',
  'ｽﾎﾟｰﾂの日','スポーツの日','体育の日','文化の日','勤労感謝の日','振替休日','国民の休日'
];

const DEFAULT_RULES = {
  '1': [
    { keyword: '始業式', kind: 'noclass' },
    { keyword: 'ｵﾘｴﾝﾃｰｼｮﾝ', kind: 'noclass' },
    { keyword: 'オリエンテーション', kind: 'noclass' },
    { keyword: '水曜授業', kind: 'changed' },
    { keyword: '振替休日', kind: 'holiday' },
    { keyword: '1･2年自宅学習日', kind: 'holiday' },
    { keyword: '1・2年自宅学習日', kind: 'holiday' },
    { keyword: '中間試験', kind: 'noclass' },
    { keyword: 'GTEC', kind: 'noclass' },
    { keyword: '2年駒大ｶﾞｲﾀﾞﾝｽ', kind: 'noclass' },
    { keyword: '自宅学習日', kind: 'noclass' },
    { keyword: '林間学校', kind: 'noclass' },
    { keyword: '終業式', kind: 'noclass' },
    { keyword: '月曜授業', kind: 'changed' },
    { keyword: '短縮授業', kind: 'changed' },
    { keyword: '午前授業', kind: 'changed' },
    { keyword: '都民の日', kind: 'holiday' },
    { keyword: '駒大高祭 開会式', kind: 'noclass' },
    { keyword: '駒大高祭 1日目', kind: 'noclass' },
    { keyword: '駒大高祭 2日目', kind: 'noclass' },
    { keyword: '駒大高祭 閉会式', kind: 'noclass' },
    { keyword: 'ﾏﾗｿﾝ大会', kind: 'noclass' },
    { keyword: 'マラソン大会', kind: 'noclass' },
    { keyword: '開校記念日(通常授業)', kind: 'changed' },
    { keyword: '開校記念日休校', kind: 'holiday' },
    { keyword: '開校記念日', kind: 'holiday' },
    { keyword: '1･2年進研模試', kind: 'noclass' },
    { keyword: '陸上競技大会', kind: 'noclass' },
    { keyword: '到達度ﾃｽﾄ', kind: 'noclass' },
    { keyword: '推薦入試', kind: 'holiday' },
    { keyword: '併願優遇入試', kind: 'holiday' },
    { keyword: '分野別ｶﾞｲﾀﾞﾝｽ', kind: 'changed' },
    { keyword: '一般入試', kind: 'holiday' },
    { keyword: '学年末試験', kind: 'noclass' },
    { keyword: '1年家庭学習日', kind: 'holiday' },
    { keyword: '成績通知', kind: 'noclass' },
    { keyword: '卒業式', kind: 'holiday' },
    { keyword: '2年永平寺拝登', kind: 'holiday' },
  ],
  '2': [
    { keyword: '始業式', kind: 'noclass' },
    { keyword: 'ｵﾘｴﾝﾃｰｼｮﾝ', kind: 'noclass' },
    { keyword: 'オリエンテーション', kind: 'noclass' },
    { keyword: '水曜授業', kind: 'changed' },
    { keyword: '振替休日', kind: 'holiday' },
    { keyword: '1･2年自宅学習日', kind: 'holiday' },
    { keyword: '1・2年自宅学習日', kind: 'holiday' },
    { keyword: '中間試験', kind: 'noclass' },
    { keyword: 'GTEC', kind: 'noclass' },
    { keyword: '2年永平寺拝登', kind: 'noclass' },
    { keyword: '2年駒大ｶﾞｲﾀﾞﾝｽ', kind: 'noclass' },
    { keyword: '自宅学習日', kind: 'noclass' },
    { keyword: '終業式', kind: 'noclass' },
    { keyword: '月曜授業', kind: 'changed' },
    { keyword: '短縮授業', kind: 'changed' },
    { keyword: '午前授業', kind: 'changed' },
    { keyword: '都民の日', kind: 'holiday' },
    { keyword: '駒大高祭 開会式', kind: 'noclass' },
    { keyword: '駒大高祭 1日目', kind: 'noclass' },
    { keyword: '駒大高祭 2日目', kind: 'noclass' },
    { keyword: '駒大高祭 閉会式', kind: 'noclass' },
    { keyword: 'ﾏﾗｿﾝ大会', kind: 'noclass' },
    { keyword: 'マラソン大会', kind: 'noclass' },
    { keyword: '開校記念日(通常授業)', kind: 'changed' },
    { keyword: '開校記念日休校', kind: 'holiday' },
    { keyword: '開校記念日', kind: 'holiday' },
    { keyword: '1･2年進研模試', kind: 'noclass' },
    { keyword: '陸上競技大会', kind: 'noclass' },
    { keyword: '到達度ﾃｽﾄ', kind: 'noclass' },
    { keyword: '推薦入試', kind: 'holiday' },
    { keyword: '併願優遇入試', kind: 'holiday' },
    { keyword: '分野別ｶﾞｲﾀﾞﾝｽ', kind: 'changed' },
    { keyword: '一般入試', kind: 'holiday' },
    { keyword: '学年末試験', kind: 'noclass' },
    { keyword: '2年校内試験', kind: 'noclass' },
    { keyword: '成績通知', kind: 'noclass' },
    { keyword: '卒業式', kind: 'holiday' },
    { keyword: '修学旅行', kind: 'noclass' },
  ],
  '3': [
    { keyword: '始業式', kind: 'noclass' },
    { keyword: 'ｵﾘｴﾝﾃｰｼｮﾝ', kind: 'noclass' },
    { keyword: 'オリエンテーション', kind: 'noclass' },
    { keyword: '水曜授業', kind: 'changed' },
    { keyword: '振替休日', kind: 'holiday' },
    { keyword: '3年卒業生ｶﾞｲﾀﾞﾝｽ', kind: 'noclass' },
    { keyword: '中間試験', kind: 'noclass' },
    { keyword: 'GTEC', kind: 'noclass' },
    { keyword: '3年自宅学習日', kind: 'holiday' },
    { keyword: '自宅学習日', kind: 'noclass' },
    { keyword: '終業式', kind: 'noclass' },
    { keyword: '月曜授業', kind: 'changed' },
    { keyword: '短縮授業', kind: 'changed' },
    { keyword: '午前授業', kind: 'changed' },
    { keyword: '都民の日', kind: 'holiday' },
    { keyword: '駒大高祭 開会式', kind: 'noclass' },
    { keyword: '駒大高祭 1日目', kind: 'noclass' },
    { keyword: '駒大高祭 2日目', kind: 'noclass' },
    { keyword: '駒大高祭 閉会式', kind: 'noclass' },
    { keyword: 'ﾏﾗｿﾝ大会', kind: 'noclass' },
    { keyword: 'マラソン大会', kind: 'noclass' },
    { keyword: '開校記念日(通常授業)', kind: 'changed' },
    { keyword: '開校記念日休校', kind: 'holiday' },
    { keyword: '開校記念日', kind: 'holiday' },
    { keyword: '3年校内試験', kind: 'noclass' },
    { keyword: '陸上競技大会', kind: 'noclass' },
    { keyword: '到達度ﾃｽﾄ', kind: 'noclass' },
    { keyword: '3年進路別学習', kind: 'noclass' },
    { keyword: '推薦入試', kind: 'holiday' },
    { keyword: '併願優遇入試', kind: 'holiday' },
    { keyword: '分野別ｶﾞｲﾀﾞﾝｽ', kind: 'changed' },
    { keyword: '一般入試', kind: 'holiday' },
    { keyword: '学年末試験', kind: 'noclass' },
    { keyword: '成績通知', kind: 'noclass' },
    { keyword: '卒業式', kind: 'noclass' },
  ]
};

// ----- ストレージ -----
const STORAGE_KEY = 'attendance-app-v1';
const THEME_KEY = 'attendance-app-theme';

function defaultState() {
  return {
    config: { year: 2026, grade: '1', classLetter: 'A', saturdayClass: true, periods: 6 },
    students: [],
    timetable: { 月: [], 火: [], 水: [], 木: [], 金: [], 土: [] },
    calendar: [],
    rules: JSON.parse(JSON.stringify(DEFAULT_RULES)),
    attendance: {},
    overrides: {},
  };
}
function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch (e) { return defaultState(); }
}
function saveAll() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    markSaved();
    updateStorageIndicator();
  } catch (e) {
    toast('保存失敗（容量超過の可能性）: ' + e.message, 'error');
    updateStorageIndicator();
  }
}
let state = loadAll();

// 旧形式の移行
(function migrate() {
  let dirty = false;
  if (state.config && !state.config.grade && state.config.className) {
    const cn = state.config.className;
    if (cn.includes('1') || cn.includes('１') || cn.includes('一')) state.config.grade = '1';
    else if (cn.includes('2') || cn.includes('２') || cn.includes('二')) state.config.grade = '2';
    else if (cn.includes('3') || cn.includes('３') || cn.includes('三')) state.config.grade = '3';
    else state.config.grade = '1';
    const m = cn.match(/[A-Z]/);
    state.config.classLetter = m ? m[0] : 'A';
    delete state.config.className;
    dirty = true;
  }
  if (!state.config.grade) { state.config.grade = '1'; dirty = true; }
  if (!state.config.classLetter) { state.config.classLetter = 'A'; dirty = true; }
  for (const date in state.attendance) {
    for (const no in state.attendance[date]) {
      const a = state.attendance[date][no];
      if (Array.isArray(a.periods)) {
        if (a.status === 'tardy' && a.periods.length > 0) {
          a.period = Math.max(...a.periods) + 1;
          a.during = false;
        } else if (a.status === 'early' && a.periods.length > 0) {
          a.period = Math.min(...a.periods);
          a.during = false;
        }
        delete a.periods;
        dirty = true;
      }
    }
  }
  if (dirty) saveAll();
})();

// ----- ユーティリティ -----
function toast(msg, type='') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show ' + type;
  setTimeout(() => { el.className = type; }, 2200);
}
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function ymd(d) {
  if (typeof d === 'string') return d;
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function parseYmd(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
const WEEKDAY_JP = ['日','月','火','水','木','金','土'];
function weekdayJp(d) { const dt = (typeof d === 'string') ? parseYmd(d) : d; return WEEKDAY_JP[dt.getDay()]; }
function getClassName() { return `${state.config.grade}年${state.config.classLetter}組`; }
function currentGrade() { return state.config.grade || '1'; }
function previousDate(dateStr) { const d = parseYmd(dateStr); d.setDate(d.getDate()-1); return ymd(d); }

function markSaved() {
  const el = document.getElementById('saved-indicator');
  if (!el) return;
  const t = new Date();
  el.textContent = `✓ 自動保存 ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
}

// =====================================================
// ストレージ容量モニタ
// =====================================================
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024; // 5MB（保守的な目安）

function getStorageUsage() {
  // localStorage は UTF-16 で保存されるため、文字数 * 2 が概算バイト数
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      total += (key.length + (val ? val.length : 0)) * 2;
    }
  } catch (e) {}
  return total;
}
function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}
function updateStorageIndicator() {
  const usage = getStorageUsage();
  const pct = (usage / STORAGE_LIMIT_BYTES) * 100;
  const ind = document.getElementById('storage-indicator');
  if (ind) {
    ind.textContent = `📦 ${formatBytes(usage)} (${pct.toFixed(1)}%)`;
    ind.classList.remove('s-warn', 's-danger');
    if (pct >= 95) ind.classList.add('s-danger');
    else if (pct >= 80) ind.classList.add('s-warn');
  }
  // データ管理タブの詳細表示も更新
  if (currentViewName === 'data') renderStorageDetails();
}
function getBreakdown() {
  const items = [
    { key: 'attendance', label: '出欠記録' },
    { key: 'calendar',   label: '行事カレンダー' },
    { key: 'overrides',  label: '当日上書き' },
    { key: 'rules',      label: 'ルール' },
    { key: 'students',   label: '生徒名簿' },
    { key: 'timetable',  label: '時間割' },
    { key: 'config',     label: '設定' },
  ];
  const out = [];
  for (const it of items) {
    const v = state[it.key];
    if (v === undefined) continue;
    const json = JSON.stringify(v) || '';
    out.push({ ...it, bytes: json.length * 2 });
  }
  out.sort((a, b) => b.bytes - a.bytes);
  return out;
}
function renderStorageDetails() {
  const usage = getStorageUsage();
  const pct = (usage / STORAGE_LIMIT_BYTES) * 100;
  const fill = document.getElementById('storage-bar-fill');
  if (fill) {
    fill.style.width = Math.min(pct, 100) + '%';
    fill.textContent = `${pct.toFixed(1)}%`;
    fill.classList.remove('s-warn', 's-danger');
    if (pct >= 95) fill.classList.add('s-danger');
    else if (pct >= 80) fill.classList.add('s-warn');
  }
  const sizeEl = document.getElementById('storage-size-display');
  if (sizeEl) sizeEl.textContent = formatBytes(usage);
  const ul = document.getElementById('storage-breakdown');
  if (ul) {
    const items = getBreakdown();
    const totalBreakdown = items.reduce((s, it) => s + it.bytes, 0) || 1;
    ul.innerHTML = items.map(it => {
      const itemPct = (it.bytes / totalBreakdown) * 100;
      return `<li>
        <span class="label">${it.label}</span>
        <span><span class="size">${formatBytes(it.bytes)}</span><span class="pct">(${itemPct.toFixed(1)}%)</span></span>
      </li>`;
    }).join('');
  }
}

// =====================================================
// 年度アーカイブ
// =====================================================
function getAcademicYearOf(dateStr) {
  // 4月始まり: 4-12月はその年、1-3月は前年
  const [y, m] = dateStr.split('-').map(Number);
  return m >= 4 ? y : y - 1;
}
function getArchivableYears() {
  const years = new Set();
  for (const date in state.attendance) years.add(getAcademicYearOf(date));
  for (const date in state.overrides)  years.add(getAcademicYearOf(date));
  return [...years].sort();
}
async function archiveYear(year) {
  const start = `${year}-04-01`;
  const end = `${year+1}-03-31`;
  const yearAttendance = {}, yearOverrides = {};
  for (const d in state.attendance) if (d >= start && d <= end) yearAttendance[d] = state.attendance[d];
  for (const d in state.overrides)  if (d >= start && d <= end) yearOverrides[d]  = state.overrides[d];
  const attCount = Object.keys(yearAttendance).length;
  const ovCount = Object.keys(yearOverrides).length;
  if (attCount === 0 && ovCount === 0) {
    toast(`${year}年度には記録がありません`, 'error');
    return;
  }
  const archive = {
    _archive: true,
    archivedAt: new Date().toISOString(),
    archivedYear: year,
    config: state.config,
    students: state.students,
    timetable: state.timetable,
    rules: state.rules,
    calendar: state.calendar,
    attendance: yearAttendance,
    overrides: yearOverrides,
  };
  const json = JSON.stringify(archive, null, 2);
  const filename = `attendance-${year}年度-${getClassName()}-${ymd(new Date())}.json`;

  // 1) 保存先選択ダイアログ（対応ブラウザ）
  let saved = false;
  let savedAt = '';
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'JSONファイル', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      savedAt = handle.name;
      saved = true;
    } catch (e) {
      if (e.name === 'AbortError') return; // ユーザがキャンセル
      console.warn('FSA error:', e);
    }
  }
  // 2) フォールバック: ダウンロード（ブラウザ設定で保存先選択可）
  if (!saved) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    savedAt = filename + '（ダウンロード）';
  }

  // 削除確認
  const msg = `保存しました: ${savedAt}\n\nローカルストレージから ${year}年度 のデータを削除しますか？\n  ・出欠記録 ${attCount}日分\n  ・当日上書き ${ovCount}日分\n（クラス情報・名簿・時間割・ルール・カレンダーは残ります）`;
  if (!confirm(msg)) {
    toast('ファイル保存のみ完了（削除はスキップ）', 'success');
    return;
  }
  for (const d of Object.keys(yearAttendance)) delete state.attendance[d];
  for (const d of Object.keys(yearOverrides))  delete state.overrides[d];
  saveAll();
  toast(`${year}年度をアーカイブしました`, 'success');
  refreshCurrentView();
}

function renderDataView() {
  renderStorageDetails();
}

// =====================================================
// 年度更新ウィザード
// =====================================================
const WIZARD_STEPS = [
  { id: 1, title: '概要' },
  { id: 2, title: 'アーカイブ' },
  { id: 3, title: 'クラス情報' },
  { id: 4, title: '生徒名簿' },
  { id: 5, title: '時間割' },
  { id: 6, title: 'カレンダー' },
  { id: 7, title: '完了' },
];
let wizardStep = 1;
const wizardApplied = { step2:false, step3:false, step4:false, step5:false, step6:false };

function renderYearUpdate() {
  // プログレスバー
  const progEl = document.getElementById('wizard-progress');
  progEl.innerHTML = WIZARD_STEPS.map(s => {
    let cls = '';
    if (s.id === wizardStep) cls = 'active';
    else if (s.id < wizardStep) cls = 'done';
    return `<div class="step ${cls}" data-step="${s.id}"><span class="step-num">${s.id}</span>${escapeHtml(s.title)}</div>`;
  }).join('');
  progEl.querySelectorAll('.step').forEach(el => {
    el.onclick = () => { wizardStep = parseInt(el.dataset.step); renderYearUpdate(); };
  });
  // 各ステップ
  const c = document.getElementById('wizard-content');
  switch (wizardStep) {
    case 1: renderWizardStep1(c); break;
    case 2: renderWizardStep2(c); break;
    case 3: renderWizardStep3(c); break;
    case 4: renderWizardStep4(c); break;
    case 5: renderWizardStep5(c); break;
    case 6: renderWizardStep6(c); break;
    case 7: renderWizardStep7(c); break;
  }
  // ナビボタン
  const back = document.getElementById('wizard-back');
  const skip = document.getElementById('wizard-skip');
  const next = document.getElementById('wizard-next');
  back.disabled = (wizardStep === 1);
  if (wizardStep === 1 || wizardStep === 7) skip.style.display = 'none';
  else skip.style.display = '';
  if (wizardStep === 7) {
    next.textContent = '🏠 ホームへ戻る';
    next.classList.add('primary');
  } else {
    next.textContent = '次へ ▶';
  }
  back.onclick = () => { if (wizardStep > 1) { wizardStep--; renderYearUpdate(); } };
  skip.onclick = () => { if (wizardStep < 7) { wizardStep++; renderYearUpdate(); } };
  next.onclick = () => {
    if (wizardStep === 7) {
      // 完了 → ダッシュボード
      wizardStep = 1;
      // applied フラグもリセット
      Object.keys(wizardApplied).forEach(k => wizardApplied[k] = false);
      showView('dashboard');
    } else {
      wizardStep++;
      renderYearUpdate();
    }
  };
}

// Step 1: 概要
function renderWizardStep1(c) {
  const usage = getStorageUsage();
  const attDays = Object.keys(state.attendance).length;
  c.innerHTML = `
    <h3>1. 年度更新の概要</h3>
    <p>これから次年度に切り替えるための準備を進めます。各ステップは独立しているので、不要なステップは「スキップ」してください。</p>
    <div class="wizard-current-info">
      <div><strong>現在の状況</strong></div>
      <ul style="margin:6px 0 0;">
        <li>年度: <strong>${state.config.year}年度</strong></li>
        <li>クラス: <strong>${getClassName()}</strong></li>
        <li>生徒数: <strong>${state.students.length}名</strong></li>
        <li>出欠記録: <strong>${attDays}日分</strong></li>
        <li>カレンダー: <strong>${state.calendar.length}日分</strong></li>
        <li>ストレージ使用量: <strong>${formatBytes(usage)}</strong></li>
      </ul>
    </div>
    <p><strong>進める内容</strong></p>
    <ol>
      <li>過年度データのファイル保存（アーカイブ）と削除</li>
      <li>クラス情報の更新（年度・学年・クラス）</li>
      <li>生徒名簿の更新（Excel取り込み等）</li>
      <li>時間割の更新</li>
      <li>カレンダーCSVの取り込み</li>
    </ol>
    <p class="hint">「次へ ▶」を押して開始してください。各ステップでは「スキップ」「戻る」が使えます。後から「初期設定」タブで個別に編集することも可能です。</p>
  `;
}

// Step 2: アーカイブ
function renderWizardStep2(c) {
  const years = getArchivableYears();
  let yearOptions = '';
  if (years.length === 0) {
    yearOptions = '<option value="">（記録のある年度はありません）</option>';
  } else {
    yearOptions = years.map(y => `<option value="${y}">${y}年度 (${y}/4 〜 ${y+1}/3)</option>`).join('');
  }
  c.innerHTML = `
    <h3>2. 過年度データのアーカイブ ${wizardApplied.step2 ? '<span class="wizard-applied">✓ 実行済</span>' : ''}</h3>
    <p>過去年度の出欠データをJSONファイルに保存し、ローカルストレージから削除します。<strong>クラス情報・名簿・時間割・ルール・カレンダーは残ります</strong>（次のステップで上書き更新します）。</p>
    <div class="archive-info-box">
      ファイル保存場所は、対応ブラウザ（Chrome/Edge）では選択ダイアログで指定できます。Firefox/Safari等では通常のダウンロード保存になります。
    </div>
    <div class="row">
      <label>アーカイブする年度:
        <select id="wiz-archive-year">${yearOptions}</select>
      </label>
      <button id="wiz-archive-go" class="primary" ${years.length===0?'disabled':''}>📦 アーカイブ実行</button>
    </div>
    <p class="hint" id="wiz-archive-info"></p>
  `;
  if (years.length > 0) {
    const updateInfo = () => {
      const y = parseInt(document.getElementById('wiz-archive-year').value);
      const start = `${y}-04-01`, end = `${y+1}-03-31`;
      let attCount = 0, ovCount = 0;
      for (const d in state.attendance) if (d >= start && d <= end) attCount++;
      for (const d in state.overrides)  if (d >= start && d <= end) ovCount++;
      document.getElementById('wiz-archive-info').textContent = `対象: 出欠記録 ${attCount}日分 / 当日上書き ${ovCount}日分`;
    };
    document.getElementById('wiz-archive-year').onchange = updateInfo;
    updateInfo();
    document.getElementById('wiz-archive-go').onclick = async () => {
      const y = parseInt(document.getElementById('wiz-archive-year').value);
      await archiveYear(y);
      wizardApplied.step2 = true;
      renderYearUpdate();
    };
  }
}

// Step 3: クラス情報
function renderWizardStep3(c) {
  // 次年度の推奨デフォルト
  const nextYear = state.config.year + 1;
  const curGrade = parseInt(state.config.grade);
  const suggestedGrade = curGrade < 3 ? String(curGrade + 1) : '1';
  c.innerHTML = `
    <h3>3. クラス情報の更新 ${wizardApplied.step3 ? '<span class="wizard-applied">✓ 適用済</span>' : ''}</h3>
    <div class="wizard-current-info">
      現在: <strong>${state.config.year}年度 ${getClassName()}</strong>（土曜${state.config.saturdayClass?'授業あり':'休み'}）
    </div>
    <p>次年度の情報を入力してください。「適用」を押すと反映されます。</p>
    <div class="row">
      <label>新しい年度:
        <input type="number" id="wiz-year" min="2020" max="2099" value="${nextYear}">
      </label>
      <label>新しい学年:
        <select id="wiz-grade">
          <option value="1" ${suggestedGrade==='1'?'selected':''}>1年</option>
          <option value="2" ${suggestedGrade==='2'?'selected':''}>2年</option>
          <option value="3" ${suggestedGrade==='3'?'selected':''}>3年</option>
        </select>
      </label>
      <label>新しいクラス:
        <select id="wiz-class-letter"></select>
      </label>
      <label>土曜日に授業:
        <input type="checkbox" id="wiz-saturday" ${state.config.saturdayClass?'checked':''}>
      </label>
    </div>
    <button id="wiz-class-apply" class="primary">この内容で適用</button>
    <p class="hint">適用後も「初期設定」タブから再編集できます。</p>
  `;
  // クラスレターA-M
  const sel = document.getElementById('wiz-class-letter');
  for (let cc = 'A'.charCodeAt(0); cc <= 'M'.charCodeAt(0); cc++) {
    const opt = document.createElement('option');
    opt.value = String.fromCharCode(cc);
    opt.textContent = String.fromCharCode(cc);
    if (opt.value === state.config.classLetter) opt.selected = true;
    sel.appendChild(opt);
  }
  document.getElementById('wiz-class-apply').onclick = () => {
    state.config.year = parseInt(document.getElementById('wiz-year').value);
    state.config.grade = document.getElementById('wiz-grade').value;
    state.config.classLetter = document.getElementById('wiz-class-letter').value;
    state.config.saturdayClass = document.getElementById('wiz-saturday').checked;
    saveAll();
    updateClassInfoBar();
    wizardApplied.step3 = true;
    toast('クラス情報を更新しました', 'success');
    renderYearUpdate();
  };
}

// Step 4: 生徒名簿
function renderWizardStep4(c) {
  c.innerHTML = `
    <h3>4. 生徒名簿の更新 ${wizardApplied.step4 ? '<span class="wizard-applied">✓ 更新済</span>' : ''}</h3>
    <div class="wizard-current-info">
      現在の名簿: <strong>${state.students.length}名</strong>
    </div>
    <p>下記からひとつ選んでください。</p>
    <div class="wizard-choice-block" id="wiz-stu-keep">
      <h4>① 現在の名簿(${state.students.length}名)を維持する</h4>
      <p class="hint" style="margin:0;">担任の継続持ち上がりなど、同じメンバーで進める場合。</p>
    </div>
    <div class="wizard-choice-block" id="wiz-stu-excel">
      <h4>② Excelから新しい名簿を取り込む</h4>
      <p class="hint" style="margin:0;">「番号」「氏名（名前）」列のあるExcelファイルから自動取り込み。プレビューで確認してから登録します。</p>
      <div id="wiz-stu-excel-area" style="margin-top:10px;"></div>
    </div>
    <div class="wizard-choice-block danger" id="wiz-stu-clear">
      <h4>③ 全削除して空から始める</h4>
      <p class="hint" style="margin:0;">既存名簿を削除します（出欠記録は別物として残ります）。</p>
    </div>
  `;
  document.getElementById('wiz-stu-keep').onclick = () => {
    wizardApplied.step4 = true;
    toast('現在の名簿を維持します', 'success');
    renderYearUpdate();
  };
  document.getElementById('wiz-stu-excel').onclick = (e) => {
    if (e.target.closest('#wiz-stu-excel-area')) return;
    showWizardExcelArea();
  };
  document.getElementById('wiz-stu-clear').onclick = () => {
    if (!confirm('生徒名簿を全削除しますか？（出欠記録は残ります）')) return;
    state.students = [];
    saveAll();
    updateClassInfoBar();
    wizardApplied.step4 = true;
    toast('名簿を全削除しました', 'success');
    renderYearUpdate();
  };

  function showWizardExcelArea() {
    const area = document.getElementById('wiz-stu-excel-area');
    area.innerHTML = `
      <input type="file" id="wiz-stu-excel-file" accept=".xlsx,.xls">
      <div id="wiz-stu-preview"></div>
    `;
    document.getElementById('wiz-stu-excel-file').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      // 既存のparseロジックを使う
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          let result = null, usedSheet = null;
          for (const name of wb.SheetNames) {
            const ws = wb.Sheets[name];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            const found = findHeaderRow(rows);
            if (found) { result = { rows, ...found }; usedSheet = name; break; }
          }
          if (!result) { toast('「番号」と「氏名」列が見つかりません', 'error'); return; }
          const { rows, headerRow, noIdx, nameIdx } = result;
          const students = [];
          for (let i = headerRow + 1; i < rows.length; i++) {
            const r = rows[i] || [];
            const noNum = parseInt(r[noIdx]);
            const nameVal = String(r[nameIdx] || '').trim();
            if (isNaN(noNum) || !nameVal) continue;
            students.push({ no: noNum, name: nameVal });
          }
          if (students.length === 0) { toast('生徒データが見つかりません', 'error'); return; }
          students.sort((a, b) => a.no - b.no);
          let prevHtml = `<div class="archive-info-box">「${escapeHtml(usedSheet)}」シートから ${students.length}名検出。</div>`;
          prevHtml += '<div style="max-height:200px; overflow:auto; border:1px solid var(--border); border-radius:4px;"><table><thead><tr><th>No.</th><th>氏名</th></tr></thead><tbody>';
          for (const s of students) prevHtml += `<tr><td>${s.no}</td><td>${escapeHtml(s.name)}</td></tr>`;
          prevHtml += '</tbody></table></div>';
          prevHtml += `<div style="margin-top:8px;"><button id="wiz-stu-confirm" class="primary">この内容で登録</button></div>`;
          document.getElementById('wiz-stu-preview').innerHTML = prevHtml;
          document.getElementById('wiz-stu-confirm').onclick = () => {
            if (state.students.length > 0 && !confirm(`既存${state.students.length}名を上書きして${students.length}名を登録しますか？`)) return;
            state.students = students;
            saveAll();
            updateClassInfoBar();
            wizardApplied.step4 = true;
            toast(`${students.length}名を登録しました`, 'success');
            renderYearUpdate();
          };
        } catch (err) { toast('Excel読込失敗: ' + err.message, 'error'); }
      };
      reader.readAsArrayBuffer(f);
    });
  }
}

// Step 5: 時間割
function renderWizardStep5(c) {
  // 教科一覧
  const subjects = new Set();
  for (const wd of WEEKDAYS) for (const s of (state.timetable[wd] || [])) if (s && s.trim()) subjects.add(s.trim());
  const subjectSummary = subjects.size === 0 ? '（未登録）' : `${subjects.size}教科`;
  c.innerHTML = `
    <h3>5. 時間割の更新 ${wizardApplied.step5 ? '<span class="wizard-applied">✓ 更新済</span>' : ''}</h3>
    <div class="wizard-current-info">
      現在の時間割: <strong>${subjectSummary}</strong> / 標準時限数: <strong>${state.config.periods}</strong>
    </div>
    <p>下記からひとつ選んでください。詳細編集は「初期設定」タブから可能です。</p>
    <div class="wizard-choice-block" id="wiz-tt-keep">
      <h4>① 現在の時間割を維持する</h4>
      <p class="hint" style="margin:0;">同じ教科担当が続く場合など。「初期設定」タブから個別編集も可能です。</p>
    </div>
    <div class="wizard-choice-block danger" id="wiz-tt-clear">
      <h4>② すべてクリアして空から作成する</h4>
      <p class="hint" style="margin:0;">時間割を全削除します。「初期設定」タブの時間割欄に新規入力してください。</p>
    </div>
    <div class="wizard-choice-block" id="wiz-tt-edit">
      <h4>③ 「初期設定」タブで編集する</h4>
      <p class="hint" style="margin:0;">クリックすると初期設定タブに移動します（途中で「年度更新」に戻れます）。</p>
    </div>
  `;
  document.getElementById('wiz-tt-keep').onclick = () => {
    wizardApplied.step5 = true;
    toast('時間割を維持します', 'success');
    renderYearUpdate();
  };
  document.getElementById('wiz-tt-clear').onclick = () => {
    if (!confirm('時間割をすべてクリアしますか？')) return;
    for (const wd of WEEKDAYS) state.timetable[wd] = [];
    saveAll();
    wizardApplied.step5 = true;
    toast('時間割をクリアしました', 'success');
    renderYearUpdate();
  };
  document.getElementById('wiz-tt-edit').onclick = () => {
    showView('setup');
    setTimeout(() => {
      const tt = document.getElementById('timetable-area');
      if (tt) tt.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
}

// Step 6: カレンダー
function renderWizardStep6(c) {
  const calCount = state.calendar.length;
  let dateRange = '';
  if (calCount > 0) {
    dateRange = ` (${state.calendar[0].date} 〜 ${state.calendar[calCount-1].date})`;
  }
  c.innerHTML = `
    <h3>6. カレンダーCSVの更新 ${wizardApplied.step6 ? '<span class="wizard-applied">✓ 更新済</span>' : ''}</h3>
    <div class="wizard-current-info">
      現在のカレンダー: <strong>${calCount}日分</strong>${dateRange}
    </div>
    <p>新年度のカレンダーCSVをアップロードしてください。「行事名,日付」形式またはGoogleカレンダー形式に対応しています。</p>
    <div class="wizard-choice-block" id="wiz-cal-keep">
      <h4>① 現在のカレンダーを維持する</h4>
      <p class="hint" style="margin:0;">既にこの年度のカレンダーが取り込まれている場合。</p>
    </div>
    <div class="wizard-choice-block">
      <h4>② 新しいCSVを取り込む（既存は上書きされます）</h4>
      <input type="file" id="wiz-cal-file" accept=".csv" style="margin-top:8px;">
      <p class="hint" id="wiz-cal-status" style="margin:6px 0 0;"></p>
    </div>
  `;
  document.getElementById('wiz-cal-keep').onclick = () => {
    wizardApplied.step6 = true;
    toast('カレンダーを維持します', 'success');
    renderYearUpdate();
  };
  document.getElementById('wiz-cal-file').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const n = importCalendarCSV(reader.result);
        document.getElementById('wiz-cal-status').textContent = `✓ ${n}日分を取り込みました`;
        wizardApplied.step6 = true;
        toast(`カレンダーを取り込みました（${n}日）`, 'success');
        setTimeout(() => renderYearUpdate(), 600);
      } catch (err) { toast('CSV読込失敗: ' + err.message, 'error'); }
    };
    reader.readAsText(f, 'UTF-8');
  });
}

// Step 7: 完了
function renderWizardStep7(c) {
  const checks = [
    { ok: wizardApplied.step2, label: '過年度データのアーカイブ' },
    { ok: wizardApplied.step3, label: 'クラス情報の更新' },
    { ok: wizardApplied.step4, label: '生徒名簿の更新' },
    { ok: wizardApplied.step5, label: '時間割の更新' },
    { ok: wizardApplied.step6, label: 'カレンダーの更新' },
  ];
  c.innerHTML = `
    <h3>7. 年度更新が完了しました 🎉</h3>
    <p>新年度の準備が完了しました。「ホームへ戻る」を押してください。</p>
    <div class="wizard-current-info">
      <div><strong>新しい状況</strong></div>
      <ul style="margin:6px 0 0;">
        <li>年度: <strong>${state.config.year}年度</strong></li>
        <li>クラス: <strong>${getClassName()}</strong></li>
        <li>生徒数: <strong>${state.students.length}名</strong></li>
        <li>カレンダー: <strong>${state.calendar.length}日分</strong></li>
      </ul>
    </div>
    <p><strong>このウィザードで実施した操作</strong></p>
    <ul>
      ${checks.map(ch => `<li>${ch.ok?'✅':'⏭️'} ${escapeHtml(ch.label)}${ch.ok?'':' (スキップ)'}</li>`).join('')}
    </ul>
    <p class="hint">後から「初期設定」「データ管理」「ルール編集」タブで個別に変更できます。</p>
  `;
}

// ----- 学年期間 -----
function getYearStart() { return new Date(state.config.year, 3, 1); }
function getYearEnd()   { return new Date(state.config.year + 1, 2, 31); }
function detectTermBoundaries() {
  const startDates = [], endDates = [];
  for (const day of state.calendar) {
    const text = day.events.join('|');
    if (text.includes('始業式')) startDates.push(day.date);
    if (text.includes('終業式')) endDates.push(day.date);
  }
  startDates.sort(); endDates.sort();
  return { startDates, endDates };
}
function isInThirdYearTerm3(dateStr) {
  if (currentGrade() !== '3') return false;
  const { startDates } = detectTermBoundaries();
  const term3Start = startDates.find(d => { const m = parseYmd(d).getMonth(); return m === 0 || m === 1; });
  if (!term3Start) return false;
  return dateStr >= term3Start;
}
function isBetweenTerms(dateStr) {
  const { startDates, endDates } = detectTermBoundaries();
  for (const ed of endDates) {
    const next = startDates.find(s => s > ed);
    if (!next) continue;
    if (dateStr > ed && dateStr < next) return true;
  }
  const yearStart = ymd(getYearStart());
  const firstStart = startDates[0];
  if (firstStart && dateStr >= yearStart && dateStr < firstStart) return true;
  const lastEnd = endDates[endDates.length-1];
  const yearEnd = ymd(getYearEnd());
  if (lastEnd && dateStr > lastEnd && dateStr <= yearEnd) {
    if (!startDates.find(s => s > lastEnd)) return true;
  }
  return false;
}
function isHolidayByEvent(events) {
  if (!events) return false;
  const text = events.join('|');
  return HOLIDAY_KEYWORDS.some(k => text.includes(k));
}

// ----- 日付分類 -----
function classifyDate(dateStr) {
  const ov = state.overrides[dateStr];
  if (ov && ov.kind) return { kind: ov.kind, reason: '手動設定', events: getEventsOn(dateStr) };
  const events = getEventsOn(dateStr);
  const dt = parseYmd(dateStr);
  const dow = dt.getDay();
  if (dow === 0) return { kind: 'holiday', reason: '日曜日', events };
  if (dow === 6 && !state.config.saturdayClass) return { kind: 'holiday', reason: '土曜日', events };
  if (isHolidayByEvent(events)) return { kind: 'holiday', reason: '祝日', events };
  const grade = currentGrade();
  const rules = state.rules[grade] || [];
  const matched = [];
  const text = events.join('|');
  for (const r of rules) if (r.keyword && text.includes(r.keyword)) matched.push(r);
  if (matched.length > 0) {
    if (matched.find(r => r.kind === 'holiday')) return { kind: 'holiday', reason: 'ルール: ' + matched.find(r=>r.kind==='holiday').keyword, events };
    if (matched.find(r => r.kind === 'noclass')) return { kind: 'noclass', reason: 'ルール: ' + matched.find(r=>r.kind==='noclass').keyword, events };
    if (matched.find(r => r.kind === 'changed')) return { kind: 'changed', reason: 'ルール: ' + matched.find(r=>r.kind==='changed').keyword, events };
  }
  if (isBetweenTerms(dateStr)) return { kind: 'holiday', reason: '学期間', events };
  if (isInThirdYearTerm3(dateStr)) return { kind: 'holiday', reason: '3年3学期', events };
  return { kind: 'normal', reason: '通常授業', events };
}
function getEventsOn(dateStr) { const d = state.calendar.find(c => c.date === dateStr); return d ? d.events : []; }
function getScheduleOn(dateStr) {
  const ov = state.overrides[dateStr];
  if (ov && Array.isArray(ov.schedule)) return ov.schedule;
  const cls = classifyDate(dateStr);
  if (cls.kind === 'holiday' || cls.kind === 'noclass') return [];
  const wd = weekdayJp(dateStr);
  for (const ev of cls.events) {
    if (ev.includes('月曜授業')) return [...(state.timetable['月'] || [])];
    if (ev.includes('火曜授業')) return [...(state.timetable['火'] || [])];
    if (ev.includes('水曜授業')) return [...(state.timetable['水'] || [])];
    if (ev.includes('木曜授業')) return [...(state.timetable['木'] || [])];
    if (ev.includes('金曜授業')) return [...(state.timetable['金'] || [])];
  }
  return [...(state.timetable[wd] || [])];
}
function getDayPeriodCount(dateStr) {
  const cls = classifyDate(dateStr);
  if (cls.kind === 'holiday' || cls.kind === 'noclass') return 0;
  const sched = getScheduleOn(dateStr);
  if (sched.length > 0) return sched.length;
  return state.config.periods || 6;
}

function periodStatusForDay(att, periodCount) {
  const result = Array(periodCount).fill('present');
  if (!att) return result;
  const { status, period, during } = att;
  if (['absent','suspended','mourning','official','abroad','leave'].includes(status)) {
    return Array(periodCount).fill(status);
  }
  if (status === 'tardy') {
    const p = Math.max(1, period || 1);
    for (let i = 0; i < periodCount; i++) {
      if (i+1 < p) result[i] = 'absent';
      else if (i+1 === p) result[i] = during ? 'tardy' : 'present';
      else result[i] = 'present';
    }
  } else if (status === 'early') {
    const p = Math.max(1, period || periodCount);
    for (let i = 0; i < periodCount; i++) {
      if (i+1 < p) result[i] = 'present';
      else if (i+1 === p) result[i] = during ? 'early' : 'absent';
      else result[i] = 'absent';
    }
  }
  return result;
}

// ----- CSV/カレンダー -----
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let cur = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else inQuote = false; }
      else field += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\r') {}
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else field += c;
    }
  }
  if (field !== '' || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows;
}
function importCalendarCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error('行が不足しています');
  const header = rows[0].map(h => h.trim());
  let subjectIdx = 0, dateIdx = 1;
  const lower = header.map(h => h.toLowerCase());
  if (lower.includes('subject') && lower.includes('start date')) {
    subjectIdx = lower.indexOf('subject');
    dateIdx = lower.indexOf('start date');
  }
  const map = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[subjectIdx] && !r[dateIdx]) continue;
    const subj = (r[subjectIdx] || '').trim();
    const date = normalizeDate((r[dateIdx] || '').trim());
    if (!date) continue;
    if (!map[date]) map[date] = [];
    const items = subj.split(/[,、]/).map(s => s.trim()).filter(Boolean);
    map[date].push(...items);
  }
  state.calendar = Object.keys(map).sort().map(d => ({ date: d, events: map[d] }));
  saveAll();
  return state.calendar.length;
}
function normalizeDate(s) {
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  return '';
}

// =====================================================
// テーマ/Undo
// =====================================================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch(e){}
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(cur === 'light' ? 'dark' : 'light');
}

// Undo履歴（出欠操作のみ）
const UNDO_LIMIT = 15;
const undoStack = [];
function pushUndo(label, dateStr) {
  const before = state.attendance[dateStr] ? JSON.parse(JSON.stringify(state.attendance[dateStr])) : null;
  undoStack.push({ label, dateStr, before, time: new Date() });
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  updateUndoUI();
}
function performUndo() {
  if (undoStack.length === 0) return;
  const u = undoStack.pop();
  if (u.before === null) delete state.attendance[u.dateStr];
  else state.attendance[u.dateStr] = u.before;
  saveAll();
  // 現在表示中のビューを再描画
  refreshCurrentView();
  toast(`「${u.label}」を取り消しました`, 'success');
  updateUndoUI();
}
function updateUndoUI() {
  const btn = document.getElementById('undo-btn');
  if (!btn) return;
  if (undoStack.length === 0) {
    btn.disabled = true;
    btn.textContent = '↶ 元に戻す';
  } else {
    btn.disabled = false;
    const last = undoStack[undoStack.length - 1];
    btn.textContent = `↶ 元に戻す (${last.label})`;
  }
}

// 現在のビュー名を覚えて再描画
let currentViewName = 'dashboard';
function refreshCurrentView() {
  showView(currentViewName);
}

// =====================================================
// ビュー切替
// =====================================================
function showView(name) {
  currentViewName = name;
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const view = document.getElementById('view-' + name);
  if (view) view.classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'dashboard') renderDashboard();
  if (name === 'daily') renderDaily();
  if (name === 'calendar') renderCalendarView();
  if (name === 'monthly') renderMonthly();
  if (name === 'subject') renderSubject();
  if (name === 'setup') renderSetup();
  if (name === 'rules') renderRules();
  if (name === 'data') renderDataView();
  if (name === 'yearupdate') renderYearUpdate();
  window.scrollTo(0, 0);
}
function badge(kind) {
  const map = {
    holiday: '<span class="badge badge-holiday">学校休み</span>',
    noclass: '<span class="badge badge-noclass">授業なし</span>',
    changed: '<span class="badge badge-changed">時間割変更</span>',
    normal:  '<span class="badge badge-normal">通常授業</span>',
  };
  return map[kind] || '';
}

// =====================================================
// 共通: 日情報セクション
// =====================================================
function renderDayInfoSection(dateStr, container) {
  const cls = classifyDate(dateStr);
  container.className = '';
  container.classList.add(cls.kind);
  container.innerHTML = `
    <div>${dateStr} (${weekdayJp(dateStr)}) ${badge(cls.kind)} <strong>${escapeHtml(cls.reason)}</strong></div>
    ${cls.events.length ? `<div style="margin-top:4px;">行事: ${escapeHtml(cls.events.join(' / '))}</div>` : ''}
    <div style="margin-top:8px;">
      <label>当日扱いを変更:
        <select class="kind-override-sel">
          <option value="">（自動判定: ${escapeHtml(cls.reason)}）</option>
          <option value="normal" ${state.overrides[dateStr]?.kind==='normal'?'selected':''}>通常授業にする</option>
          <option value="changed" ${state.overrides[dateStr]?.kind==='changed'?'selected':''}>時間割変更にする</option>
          <option value="noclass" ${state.overrides[dateStr]?.kind==='noclass'?'selected':''}>授業なし（学校あり）にする</option>
          <option value="holiday" ${state.overrides[dateStr]?.kind==='holiday'?'selected':''}>学校休みにする</option>
        </select>
      </label>
      <button class="kind-override-clear small">自動判定に戻す</button>
    </div>
  `;
  container.querySelector('.kind-override-sel').onchange = (e) => {
    const v = e.target.value;
    if (!state.overrides[dateStr]) state.overrides[dateStr] = {};
    if (v) state.overrides[dateStr].kind = v;
    else delete state.overrides[dateStr].kind;
    saveAll();
    refreshCurrentView();
  };
  container.querySelector('.kind-override-clear').onclick = () => {
    if (state.overrides[dateStr]) {
      delete state.overrides[dateStr].kind;
      delete state.overrides[dateStr].schedule;
      if (Object.keys(state.overrides[dateStr]).length === 0) delete state.overrides[dateStr];
    }
    saveAll();
    refreshCurrentView();
  };
}

// =====================================================
// 共通: 時間割編集
// =====================================================
function renderScheduleEditSection(dateStr, container) {
  const cls = classifyDate(dateStr);
  if (cls.kind === 'holiday') {
    container.innerHTML = `<div class="card"><p class="hint">学校休みのため時間割は表示しません。</p></div>`;
    return;
  }
  if (cls.kind === 'noclass') {
    container.innerHTML = `<div class="card"><p class="hint">授業なし（学校あり）のため時間割は表示しません。出停・忌引などの記録は可能です。</p></div>`;
    return;
  }
  const sched = getScheduleOn(dateStr);
  const periodCount = getDayPeriodCount(dateStr);
  let head = '<div class="cell head">時限</div>';
  let body = '<div class="cell head">教科</div>';
  for (let i = 0; i < periodCount; i++) {
    head += `<div class="cell head">${i+1}限</div>`;
    body += `<div class="cell"><input type="text" data-period="${i}" value="${escapeHtml(sched[i]||'')}"></div>`;
  }
  container.innerHTML = `
    <div class="card">
      <h3>当日の時間割（変更可）</h3>
      <div class="row">
        <label>この日の時限数:
          <input type="number" class="day-period-count" min="0" max="10" value="${periodCount}">
        </label>
        <button class="day-period-apply small">時限数を変更</button>
        <button class="day-schedule-save small primary">時間割を保存</button>
        <button class="day-schedule-reset small">通常時間割に戻す</button>
      </div>
      <div class="schedule-grid" style="--periods:${periodCount};">${head}${body}</div>
      <p class="hint">空欄の時限は授業なし扱い。</p>
    </div>
  `;
  container.querySelector('.day-period-apply').onclick = () => {
    const newCount = parseInt(container.querySelector('.day-period-count').value);
    if (isNaN(newCount) || newCount < 0) return;
    const cur = sched.slice();
    cur.length = newCount;
    for (let i = 0; i < newCount; i++) if (cur[i] == null) cur[i] = '';
    if (!state.overrides[dateStr]) state.overrides[dateStr] = {};
    state.overrides[dateStr].schedule = cur;
    saveAll();
    refreshCurrentView();
  };
  container.querySelector('.day-schedule-save').onclick = () => {
    const inputs = container.querySelectorAll('input[data-period]');
    const arr = [];
    inputs.forEach(inp => arr[parseInt(inp.dataset.period)] = inp.value.trim());
    if (!state.overrides[dateStr]) state.overrides[dateStr] = {};
    state.overrides[dateStr].schedule = arr;
    saveAll();
    toast('時間割を保存しました', 'success');
    refreshCurrentView();
  };
  container.querySelector('.day-schedule-reset').onclick = () => {
    if (state.overrides[dateStr]) {
      delete state.overrides[dateStr].schedule;
      if (Object.keys(state.overrides[dateStr]).length === 0) delete state.overrides[dateStr];
    }
    saveAll();
    refreshCurrentView();
  };
}

// =====================================================
// 共通: 出欠カードセクション (検索・一括選択対応)
// =====================================================
let bulkMode = false;
let bulkSelected = new Set();
let searchQuery = '';

function renderAttendanceArea(dateStr, container) {
  const cls = classifyDate(dateStr);
  if (cls.kind === 'holiday') {
    container.innerHTML = '<div class="card"><p class="hint">学校休みのため出欠入力はありません。</p></div>';
    return;
  }
  if (state.students.length === 0) {
    container.innerHTML = '<div class="card warn">先に「初期設定」で生徒を登録してください。</div>';
    return;
  }
  const att = state.attendance[dateStr] || {};

  // カード一覧（HTMLは検索用にすべて生成し、CSSで非表示）
  let cards = '';
  for (const stu of state.students) {
    const a = att[stu.no];
    const s = a?.status || 'present';
    cards += renderStudentCardHtml(stu, a, s);
  }

  // 一括アクションバー
  const bulkBar = bulkMode ? `
    <div class="bulk-action-bar">
      <span>選択中: <strong id="bulk-count-${dateStr}">${bulkSelected.size}</strong> 名</span>
      <select id="bulk-status">
        ${STATUS_TYPES.map(t => `<option value="${t.code}">${t.label}</option>`).join('')}
      </select>
      <button id="bulk-apply" class="primary">選択した生徒に一括適用</button>
      <button id="bulk-clear">選択クリア</button>
      <button id="bulk-cancel">一括モード終了</button>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="card">
      <h3>出欠入力（${state.students.length}名）<span class="hint" style="font-weight:normal;">${bulkMode?'— カードをタップして選択':'— カードをクリックして変更／長押しで個人サマリー'}</span></h3>
      <div class="student-search-bar">
        <input type="search" id="student-search" placeholder="🔍 番号 or 氏名で検索 (例: 16 / たなか)" value="${escapeHtml(searchQuery)}">
        <button id="reset-all-present" class="small">全員「出席」に</button>
        <button class="bulk-toggle ${bulkMode?'active':''}" id="bulk-toggle">${bulkMode?'通常モードに戻す':'☰ 一括選択モード'}</button>
      </div>
      ${cls.kind === 'noclass' ? '<p class="hint">授業なしの日です。出停・忌引・公欠などの記録のみ可能です。</p>' : ''}
      <div class="student-cards" id="student-cards-${dateStr.replace(/-/g,'')}">${cards}</div>
      ${bulkBar}
    </div>
  `;

  // イベント結線
  const cardsContainer = container.querySelector('.student-cards');
  cardsContainer.querySelectorAll('.student-card').forEach(card => {
    bindCardEvents(card, dateStr);
  });

  applySearchFilter(container);

  container.querySelector('#student-search').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    applySearchFilter(container);
  });
  container.querySelector('#reset-all-present').onclick = () => {
    if (!confirm('全員を「出席」にリセットしますか？')) return;
    pushUndo('全員出席にリセット', dateStr);
    delete state.attendance[dateStr];
    saveAll();
    refreshCurrentView();
  };
  container.querySelector('#bulk-toggle').onclick = () => {
    bulkMode = !bulkMode;
    bulkSelected.clear();
    refreshCurrentView();
  };
  if (bulkMode) {
    container.querySelector('#bulk-apply').onclick = () => {
      if (bulkSelected.size === 0) { toast('生徒を選択してください', 'error'); return; }
      const status = container.querySelector('#bulk-status').value;
      pushUndo(`一括: ${bulkSelected.size}名を${STATUS_LABEL[status]}`, dateStr);
      if (!state.attendance[dateStr]) state.attendance[dateStr] = {};
      for (const no of bulkSelected) {
        if (status === 'present') {
          delete state.attendance[dateStr][no];
        } else if (status === 'tardy' || status === 'early') {
          // 一括の場合は時限デフォルト1（後で個別調整）
          state.attendance[dateStr][no] = { status, period: 1, during: true };
        } else {
          state.attendance[dateStr][no] = { status };
        }
      }
      if (Object.keys(state.attendance[dateStr]).length === 0) delete state.attendance[dateStr];
      saveAll();
      bulkSelected.clear();
      refreshCurrentView();
      toast('一括適用しました', 'success');
    };
    container.querySelector('#bulk-clear').onclick = () => { bulkSelected.clear(); refreshCurrentView(); };
    container.querySelector('#bulk-cancel').onclick = () => { bulkMode = false; bulkSelected.clear(); refreshCurrentView(); };
  }
}

function renderStudentCardHtml(stu, a, s) {
  let stat = '';
  if (s === 'tardy' && a) stat = `${a.period||1}限${a.during?'途中':'前'}`;
  else if (s === 'early' && a) stat = `${a.period||1}限${a.during?'途中':'前'}`;
  else if (s !== 'present') stat = STATUS_LABEL[s];
  const icon = STATUS_ICON[s] || '?';
  const isBulkSelected = bulkSelected.has(String(stu.no)) || bulkSelected.has(stu.no);
  return `
    <div class="student-card s-${s} ${bulkMode?'bulk-selectable':''} ${isBulkSelected?'bulk-selected':''}" data-no="${stu.no}" data-name="${escapeHtml(stu.name)}">
      <div class="no-badge">No.${stu.no}</div>
      <div class="stat-icon">${icon}</div>
      <div class="name">${escapeHtml(stu.name)}</div>
      <div class="stat-text">${escapeHtml(stat)}</div>
    </div>
  `;
}

function bindCardEvents(card, dateStr) {
  let pressTimer;
  let longPressed = false;
  const startPress = () => {
    longPressed = false;
    pressTimer = setTimeout(() => {
      longPressed = true;
      openSummaryModal(card.dataset.no);
    }, 600);
  };
  const cancelPress = () => clearTimeout(pressTimer);
  card.addEventListener('mousedown', startPress);
  card.addEventListener('mouseup', cancelPress);
  card.addEventListener('mouseleave', cancelPress);
  card.addEventListener('touchstart', startPress, { passive: true });
  card.addEventListener('touchend', cancelPress);
  card.addEventListener('touchcancel', cancelPress);
  card.addEventListener('contextmenu', (e) => { e.preventDefault(); openSummaryModal(card.dataset.no); });

  card.addEventListener('click', () => {
    if (longPressed) return;
    if (bulkMode) {
      const no = card.dataset.no;
      if (bulkSelected.has(no)) bulkSelected.delete(no);
      else bulkSelected.add(no);
      card.classList.toggle('bulk-selected');
      const cnt = document.getElementById('bulk-count-' + dateStr);
      if (cnt) cnt.textContent = bulkSelected.size;
    } else {
      openStudentModal(card.dataset.no, dateStr);
    }
  });
}

function applySearchFilter(container) {
  const q = (searchQuery || '').trim().toLowerCase();
  container.querySelectorAll('.student-card').forEach(card => {
    if (!q) { card.classList.remove('hidden-by-search'); return; }
    const no = card.dataset.no;
    const name = (card.dataset.name || '').toLowerCase();
    if (String(no).includes(q) || name.includes(q)) card.classList.remove('hidden-by-search');
    else card.classList.add('hidden-by-search');
  });
}

// =====================================================
// ホーム
// =====================================================
function renderDashboard() {
  const today = ymd(new Date());

  // 1. 今日の日情報
  renderDayInfoSection(today, document.getElementById('dash-day-info'));

  // 2. 出欠入力エリア（今日の分を直接表示）
  renderAttendanceArea(today, document.getElementById('dash-attendance-area'));

  // 3. 警告
  const warnings = computeAttendanceWarnings();
  const warnDiv = document.getElementById('dash-warnings');
  if (warnings.length > 0) {
    let html = `<div class="alert-section">
      <h3 style="margin:0 0 8px;">⚠️ 欠席数が1/3に近い生徒（残り3回以下）</h3>`;
    for (const w of warnings.slice(0, 20)) {
      const remainTxt = w.remaining > 0
        ? `あと <strong>${w.remaining}</strong> 回で1/3超過`
        : `<strong>1/3を超過</strong> (${w.absences - w.limit}回オーバー)`;
      html += `<div class="alert-item">No.${w.no} ${escapeHtml(w.name)} / ${escapeHtml(w.subject)}: 欠席 ${w.absences}回 / 授業数 ${w.total}回 → ${remainTxt}</div>`;
    }
    if (warnings.length > 20) html += `<div class="hint">他 ${warnings.length - 20} 件...</div>`;
    html += `</div>`;
    warnDiv.innerHTML = html;
  } else {
    warnDiv.innerHTML = '';
  }

  // 4. 状態
  document.getElementById('dash-status').innerHTML = `
    <div class="card">
      <h3>登録状況</h3>
      <ul>
        <li>クラス: ${getClassName()}（年度: ${state.config.year}）</li>
        <li>生徒数: ${state.students.length}名</li>
        <li>カレンダー登録日数: ${state.calendar.length}日</li>
        <li>出欠記録日数: ${Object.keys(state.attendance).length}日</li>
      </ul>
      ${state.students.length === 0 ? '<p class="warn">まずは「初期設定」タブから生徒・時間割・カレンダーを登録してください。</p>' : ''}
    </div>
  `;
}

function computeAttendanceWarnings() {
  const subjectStats = computeSubjectStatistics();
  const out = [];
  for (const stu of state.students) {
    const stat = subjectStats.perStudent[stu.no] || {};
    for (const subj of subjectStats.subjects) {
      const total = stat[subj]?.total ?? 0;
      const absences = stat[subj]?.absences ?? 0;
      if (total <= 0) continue;
      const limit = Math.floor(total / 3);
      const remaining = limit - absences;
      if (remaining <= 3) out.push({ no: stu.no, name: stu.name, subject: subj, total, absences, limit, remaining });
    }
  }
  out.sort((a,b) => a.remaining - b.remaining);
  return out;
}

// =====================================================
// 教科別統計
// =====================================================
function computeSubjectStatistics() {
  const subjects = new Set();
  for (const wd of WEEKDAYS) for (const s of (state.timetable[wd] || [])) if (s && s.trim()) subjects.add(s.trim());
  for (const ds in state.overrides) {
    const sched = state.overrides[ds].schedule;
    if (Array.isArray(sched)) for (const s of sched) if (s && s.trim()) subjects.add(s.trim());
  }
  const subjectArr = [...subjects].sort();
  const { startDates, endDates } = detectTermBoundaries();
  const terms = [];
  for (const ed of endDates) {
    const sd = startDates.filter(s => s <= ed).pop();
    if (sd) terms.push({ start: sd, end: ed });
  }
  if (currentGrade() === '3') {
    const term3Start = startDates.find(d => parseYmd(d).getMonth() <= 2);
    if (term3Start && !terms.some(t => t.start === term3Start)) {
      const grad = state.calendar.find(c => c.events.some(e => e.includes('卒業式')));
      const end3 = grad ? grad.date : ymd(getYearEnd());
      terms.push({ start: term3Start, end: end3 });
    }
  }
  // 各学期の追加回数: 1学期(4-7月開始) +3, 2学期(9-12月開始) +3, 3学期(1-3月開始) +2
  const termAdd = (termStart) => {
    const m = parseYmd(termStart).getMonth() + 1;
    return (m >= 1 && m <= 3) ? 2 : 3;
  };
  const baseTotals = {};
  for (const subj of subjectArr) {
    let total = 0;
    for (const t of terms) {
      let count = 0;
      for (let d = parseYmd(t.start); d <= parseYmd(t.end); d.setDate(d.getDate()+1)) {
        const ds = ymd(d);
        const cls = classifyDate(ds);
        if (cls.kind === 'holiday' || cls.kind === 'noclass') continue;
        const sched = getScheduleOn(ds);
        for (const s of sched) if (s && s.trim() === subj) count++;
      }
      total += count + termAdd(t.start);
    }
    baseTotals[subj] = total;
  }
  const perStudent = {};
  for (const stu of state.students) {
    const stat = {};
    for (const subj of subjectArr) stat[subj] = { total: baseTotals[subj], absences: 0 };
    for (const ds in state.attendance) {
      const att = state.attendance[ds][stu.no];
      if (!att) continue;
      const cls = classifyDate(ds);
      if (cls.kind === 'holiday' || cls.kind === 'noclass') continue;
      const sched = getScheduleOn(ds);
      const periodCount = sched.length;
      const perPeriod = periodStatusForDay(att, periodCount);
      for (let i = 0; i < periodCount; i++) {
        const subj = (sched[i] || '').trim();
        if (!subj || !stat[subj]) continue;
        const ps = perPeriod[i];
        if (ps === 'absent') stat[subj].absences++;
        else if (ps === 'suspended' || ps === 'mourning' || ps === 'abroad' || ps === 'leave') stat[subj].total--;
      }
    }
    perStudent[stu.no] = stat;
  }
  return { subjects: subjectArr, baseTotals, perStudent };
}

// =====================================================
// 日々入力ビュー
// =====================================================
function renderDaily() {
  const dateInput = document.getElementById('daily-date');
  if (!dateInput.value) dateInput.value = ymd(new Date());
  renderDailyForDate(dateInput.value);
}
function renderDailyForDate(dateStr) {
  renderDayInfoSection(dateStr, document.getElementById('daily-day-info'));
  renderScheduleEditSection(dateStr, document.getElementById('daily-schedule-edit'));
  renderAttendanceListArea(dateStr, document.getElementById('daily-attendance-area'));
}

// =====================================================
// 一覧表形式の出欠入力（日々入力ビュー専用）
// =====================================================
function renderAttendanceListArea(dateStr, container) {
  const cls = classifyDate(dateStr);
  if (cls.kind === 'holiday') {
    container.innerHTML = '<div class="card"><p class="hint">学校休みのため出欠入力はありません。</p></div>';
    return;
  }
  if (state.students.length === 0) {
    container.innerHTML = '<div class="card warn">先に「登録情報」で生徒を登録してください。</div>';
    return;
  }
  const att = state.attendance[dateStr] || {};
  const periodCount = getDayPeriodCount(dateStr);
  const ALLOWED = cls.kind === 'noclass'
    ? ['present','absent','suspended','mourning','official','abroad','leave']
    : STATUS_TYPES.map(s => s.code);

  let rows = '';
  for (const stu of state.students) {
    const a = att[stu.no];
    const s = a?.status || 'present';
    const period = a?.period || 1;
    const during = a?.during !== false;
    let statusOpts = '';
    for (const t of STATUS_TYPES) {
      if (!ALLOWED.includes(t.code)) continue;
      statusOpts += `<option value="${t.code}" ${s===t.code?'selected':''}>${t.label}</option>`;
    }
    const showPeriod = (s === 'tardy' || s === 'early') && periodCount > 0;
    let periodCell = '<span class="hint">－</span>';
    let duringCell = '<span class="hint">－</span>';
    if (showPeriod) {
      let pOpts = '';
      for (let i = 1; i <= periodCount; i++) {
        pOpts += `<option value="${i}" ${period===i?'selected':''}>${i}限</option>`;
      }
      periodCell = `<select data-no="${stu.no}" data-field="period">${pOpts}</select>`;
      duringCell = `<select data-no="${stu.no}" data-field="during">
        <option value="1" ${during?'selected':''}>授業中</option>
        <option value="0" ${!during?'selected':''}>授業前</option>
      </select>`;
    }
    rows += `
      <tr class="daily-row s-${s}" data-no="${stu.no}" data-name="${escapeHtml(stu.name)}">
        <td class="col-no">${stu.no}</td>
        <td class="col-icon"><span class="stat-icon-mini">${STATUS_ICON[s]}</span></td>
        <td class="col-name" title="長押しまたはクリックで個人サマリー" data-action="summary">${escapeHtml(stu.name)}</td>
        <td><select data-no="${stu.no}" data-field="status">${statusOpts}</select></td>
        <td>${periodCell}</td>
        <td>${duringCell}</td>
      </tr>
    `;
  }

  container.innerHTML = `
    <div class="card">
      <h3>出欠入力（${state.students.length}名） — 一覧形式</h3>
      <div class="student-search-bar">
        <input type="search" id="daily-list-search" placeholder="🔍 番号 or 氏名で検索" value="${escapeHtml(searchQuery)}">
        <button id="daily-list-reset" class="small">全員「出席」に</button>
      </div>
      ${cls.kind === 'noclass' ? '<p class="hint">授業なしの日です。出停・忌引・公欠などの記録のみ可能です。</p>' : ''}
      <div style="overflow-x:auto;">
        <table class="daily-list-table">
          <thead>
            <tr>
              <th>No.</th>
              <th></th>
              <th>氏名</th>
              <th>状態</th>
              <th>時限</th>
              <th>授業中/前</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelectorAll('.daily-row select[data-field]').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const no = e.target.dataset.no;
      const field = e.target.dataset.field;
      handleListEdit(dateStr, no, field, e.target.value);
    });
  });
  container.querySelectorAll('.daily-row .col-name').forEach(td => {
    td.addEventListener('click', () => {
      const row = td.closest('.daily-row');
      openSummaryModal(row.dataset.no);
    });
  });
  container.querySelector('#daily-list-search').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    applyDailyListFilter(container);
  });
  applyDailyListFilter(container);
  container.querySelector('#daily-list-reset').onclick = () => {
    if (!confirm('全員を「出席」にリセットしますか？')) return;
    pushUndo('全員出席にリセット', dateStr);
    delete state.attendance[dateStr];
    saveAll();
    refreshCurrentView();
  };
}

function applyDailyListFilter(container) {
  const q = (searchQuery || '').trim().toLowerCase();
  container.querySelectorAll('.daily-row').forEach(row => {
    if (!q) { row.classList.remove('hidden-by-search'); return; }
    const no = row.dataset.no;
    const name = (row.dataset.name || '').toLowerCase();
    if (String(no).includes(q) || name.includes(q)) row.classList.remove('hidden-by-search');
    else row.classList.add('hidden-by-search');
  });
}

function handleListEdit(dateStr, no, field, value) {
  const stu = state.students.find(s => String(s.no) === String(no));
  const stuName = stu ? stu.name : '';
  if (!state.attendance[dateStr]) state.attendance[dateStr] = {};
  const cur = state.attendance[dateStr][no] || { status: 'present' };
  pushUndo(`No.${no} ${stuName}`, dateStr);
  if (field === 'status') {
    if (value === 'present') {
      delete state.attendance[dateStr][no];
    } else if (value === 'tardy' || value === 'early') {
      state.attendance[dateStr][no] = {
        status: value,
        period: cur.period || 1,
        during: cur.during !== false
      };
    } else {
      state.attendance[dateStr][no] = { status: value };
    }
  } else if (field === 'period') {
    if (cur.status === 'tardy' || cur.status === 'early') {
      state.attendance[dateStr][no] = { ...cur, period: parseInt(value) || 1 };
    }
  } else if (field === 'during') {
    if (cur.status === 'tardy' || cur.status === 'early') {
      state.attendance[dateStr][no] = { ...cur, during: value === '1' };
    }
  }
  if (Object.keys(state.attendance[dateStr]).length === 0) delete state.attendance[dateStr];
  saveAll();
  refreshCurrentView();
}

// =====================================================
// 出欠入力モーダル
// =====================================================
let modalCtx = null;

function openStudentModal(stuNo, dateStr) {
  const stu = state.students.find(s => String(s.no) === String(stuNo));
  if (!stu) return;
  const att = (state.attendance[dateStr] && state.attendance[dateStr][stuNo]) || { status: 'present' };
  const periodCount = getDayPeriodCount(dateStr);
  const cls = classifyDate(dateStr);
  modalCtx = {
    stuNo: stu.no,
    stuName: stu.name,
    dateStr,
    status: att.status || 'present',
    period: att.period || 1,
    during: att.during !== false,
    noClassDay: cls.kind === 'noclass',
    periodCount: periodCount || 0,
  };
  document.getElementById('modal-title').textContent = `No.${stu.no} ${stu.name} — ${dateStr} (${weekdayJp(dateStr)})`;
  renderModalBody();
  // 「昨日と同じ」ボタン: 前日にデータがあれば有効
  const yBtn = document.getElementById('modal-yesterday');
  const prev = previousDate(dateStr);
  const prevAtt = state.attendance[prev]?.[stuNo];
  if (prevAtt) {
    yBtn.disabled = false;
    yBtn.textContent = `📋 ${prev}と同じ (${STATUS_LABEL[prevAtt.status]})`;
  } else {
    yBtn.disabled = true;
    yBtn.textContent = '📋 昨日のデータなし';
  }
  document.getElementById('student-modal').classList.remove('hidden');
}
function renderModalBody() {
  const ctx = modalCtx;
  const ALLOWED = ctx.noClassDay
    ? ['present','absent','suspended','mourning','official','abroad','leave']
    : STATUS_TYPES.map(s => s.code);
  const renderPill = (code) => {
    if (!ALLOWED.includes(code)) return '';
    const t = STATUS_TYPES.find(s => s.code === code);
    const icon = STATUS_ICON[code];
    return `<div class="status-pill ${ctx.status===code?'selected':''}" data-status="${code}">
      <span class="icon-disc">${icon}</span>${t.label}
    </div>`;
  };
  let primary = '<div class="status-pills-primary">';
  for (const code of PRIMARY_STATUSES) primary += renderPill(code);
  primary += '</div>';
  let secondary = '<div class="status-pills-secondary">';
  for (const code of SECONDARY_STATUSES) secondary += renderPill(code);
  secondary += '</div>';

  let periodArea = '';
  if ((ctx.status === 'tardy' || ctx.status === 'early') && ctx.periodCount > 0) {
    let pills = '';
    for (let i = 1; i <= ctx.periodCount; i++) {
      pills += `<div class="period-pill ${ctx.period===i?'selected':''}" data-period="${i}">${i}限</div>`;
    }
    const labelOn  = ctx.status === 'tardy' ? '授業中に到着' : '授業中に早退';
    const labelOff = ctx.status === 'tardy' ? '授業前に到着' : '授業前に早退';
    const helpOn  = ctx.status === 'tardy'
      ? 'その時限は遅刻扱い。それ以前は欠席、それ以降は出席。'
      : 'その時限は早退扱い。それ以前は出席、それ以降は欠席。';
    const helpOff = ctx.status === 'tardy'
      ? 'その時限から出席扱い。それ以前は欠席。'
      : 'その時限から欠席扱い。それ以前は出席。';
    periodArea = `
      <div class="period-area">
        <div><strong>${ctx.status==='tardy'?'到着した時限':'早退した時限'}を選択:</strong></div>
        <div class="period-pills">${pills}</div>
        <div class="during-radio">
          <label><input type="radio" name="during" value="1" ${ctx.during?'checked':''}> ${labelOn}</label>
          <label><input type="radio" name="during" value="0" ${!ctx.during?'checked':''}> ${labelOff}</label>
        </div>
        <p class="hint" style="margin:6px 0 0;">${ctx.during?helpOn:helpOff}</p>
      </div>
    `;
  }

  document.getElementById('modal-body').innerHTML = `
    <div class="status-section-label">主要</div>
    ${primary}
    <div class="status-section-label">特殊</div>
    ${secondary}
    ${periodArea}
  `;
  document.querySelectorAll('#student-modal .status-pill').forEach(p => {
    p.onclick = () => { modalCtx.status = p.dataset.status; renderModalBody(); };
  });
  document.querySelectorAll('#student-modal .period-pill').forEach(p => {
    p.onclick = () => { modalCtx.period = parseInt(p.dataset.period); renderModalBody(); };
  });
  document.querySelectorAll('#student-modal input[name="during"]').forEach(r => {
    r.onchange = (e) => { modalCtx.during = (e.target.value === '1'); renderModalBody(); };
  });
}
function closeStudentModal() {
  document.getElementById('student-modal').classList.add('hidden');
  modalCtx = null;
}
function saveStudentModal() {
  const ctx = modalCtx;
  if (!ctx) return;
  pushUndo(`No.${ctx.stuNo} ${ctx.stuName}: ${STATUS_LABEL[ctx.status]}`, ctx.dateStr);
  if (!state.attendance[ctx.dateStr]) state.attendance[ctx.dateStr] = {};
  if (ctx.status === 'present') {
    delete state.attendance[ctx.dateStr][ctx.stuNo];
  } else if (ctx.status === 'tardy' || ctx.status === 'early') {
    state.attendance[ctx.dateStr][ctx.stuNo] = { status: ctx.status, period: ctx.period, during: ctx.during };
  } else {
    state.attendance[ctx.dateStr][ctx.stuNo] = { status: ctx.status };
  }
  if (Object.keys(state.attendance[ctx.dateStr]).length === 0) delete state.attendance[ctx.dateStr];
  saveAll();
  closeStudentModal();
  refreshCurrentView();
  toast('登録しました', 'success');
}
function clearStudentModal() {
  modalCtx.status = 'present';
  saveStudentModal();
}
function applyYesterdayToModal() {
  const ctx = modalCtx;
  if (!ctx) return;
  const prev = previousDate(ctx.dateStr);
  const a = state.attendance[prev]?.[ctx.stuNo];
  if (!a) return;
  ctx.status = a.status;
  if (a.status === 'tardy' || a.status === 'early') {
    ctx.period = a.period || 1;
    ctx.during = a.during !== false;
  }
  renderModalBody();
}

// =====================================================
// 個人サマリー
// =====================================================
function openSummaryModal(stuNo) {
  const stu = state.students.find(s => String(s.no) === String(stuNo));
  if (!stu) return;
  document.getElementById('summary-title').textContent = `📊 No.${stu.no} ${stu.name} の年間サマリー`;

  // 月別カウント
  const monthlyData = {}; // 'YYYY-MM' → { count by status }
  for (const ds in state.attendance) {
    const a = state.attendance[ds][stuNo];
    if (!a) continue;
    const ym = ds.substring(0, 7);
    if (!monthlyData[ym]) monthlyData[ym] = {};
    monthlyData[ym][a.status] = (monthlyData[ym][a.status] || 0) + 1;
  }
  const months = Object.keys(monthlyData).sort();

  // 教科別
  const subjStats = computeSubjectStatistics();
  const sStat = subjStats.perStudent[stuNo] || {};

  // ミニカレンダー（各月）
  let miniCals = '';
  for (const ym of months) {
    const [y, m] = ym.split('-').map(Number);
    miniCals += `<div class="summary-section"><h4>${y}年 ${m}月</h4>${renderMiniCalendar(y, m-1, stuNo)}</div>`;
  }

  // 月別カウント表
  let monthTable = '<table><thead><tr><th>月</th>';
  for (const t of STATUS_TYPES.filter(t => t.code !== 'present')) monthTable += `<th>${t.label}</th>`;
  monthTable += '</tr></thead><tbody>';
  for (const ym of months) {
    monthTable += `<tr><td>${ym}</td>`;
    for (const t of STATUS_TYPES.filter(t => t.code !== 'present')) {
      monthTable += `<td>${monthlyData[ym][t.code] || 0}</td>`;
    }
    monthTable += '</tr>';
  }
  monthTable += '</tbody></table>';

  // 教科別表
  let subjTable = '<table><thead><tr><th>教科</th><th>授業数</th><th>欠席数</th><th>1/3</th><th>残り</th></tr></thead><tbody>';
  for (const subj of subjStats.subjects) {
    const total = sStat[subj]?.total ?? 0;
    const abs = sStat[subj]?.absences ?? 0;
    const limit = Math.floor(total / 3);
    const remaining = limit - abs;
    const over = total > 0 && abs >= total / 3;
    let remainHtml = over ? `<span class="warn">超過</span>` : (remaining <= 3 ? `<span class="warn">残${remaining}</span>` : `残${remaining}`);
    subjTable += `<tr class="${over?'over-third':''}"><td>${escapeHtml(subj)}</td><td>${total}</td><td>${abs}</td><td>${limit}</td><td>${remainHtml}</td></tr>`;
  }
  subjTable += '</tbody></table>';

  document.getElementById('summary-body').innerHTML = `
    <div class="summary-section">
      <h4>月別出欠カウント</h4>
      ${months.length ? monthTable : '<p class="hint">まだ記録がありません。</p>'}
    </div>
    <div class="summary-section">
      <h4>教科別 欠席状況</h4>
      ${subjStats.subjects.length ? subjTable : '<p class="hint">時間割が未登録です。</p>'}
    </div>
    <div class="summary-section">
      <h4>欠席カレンダー</h4>
      ${miniCals || '<p class="hint">記録された月はまだありません。</p>'}
    </div>
  `;
  document.getElementById('summary-modal').classList.remove('hidden');
}
function renderMiniCalendar(year, monthIdx, stuNo) {
  const first = new Date(year, monthIdx, 1);
  const last = new Date(year, monthIdx + 1, 0);
  const startDow = first.getDay();
  let html = '<div class="summary-mini-cal">';
  // ヘッダ
  for (const wd of ['日','月','火','水','木','金','土']) html += `<div class="summary-mini-cal-row-label">${wd}</div>`;
  for (let i = 0; i < startDow; i++) html += '<div class="mc-day empty"></div>';
  for (let d = 1; d <= last.getDate(); d++) {
    const ds = ymd(new Date(year, monthIdx, d));
    const a = state.attendance[ds]?.[stuNo];
    const s = a?.status || 'present';
    const cls = (s === 'present') ? '' : `s-${s}`;
    const icon = a ? STATUS_ICON[s] : '';
    html += `<div class="mc-day ${cls}" title="${ds}: ${a?STATUS_LABEL[s]:'出席'}"><div>${d}</div><div>${icon}</div></div>`;
  }
  html += '</div>';
  return html;
}

// =====================================================
// カレンダー表示
// =====================================================
let calMonthState = null;
function renderCalendarView() {
  if (!calMonthState) {
    const t = new Date();
    calMonthState = { year: t.getFullYear(), month: t.getMonth() };
  }
  drawCalendar();
}
function drawCalendar() {
  const { year, month } = calMonthState;
  document.getElementById('cal-title').textContent = `${year}年 ${month+1}月`;
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const days = last.getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const todayStr = ymd(new Date());
  const dayHeaders = ['日','月','火','水','木','金','土'];
  let html = '<table class="cal-table"><thead><tr>';
  for (let i = 0; i < 7; i++) {
    let cls = i === 0 ? 'sun' : (i === 6 ? 'sat' : '');
    html += `<th class="${cls}">${dayHeaders[i]}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (let i = 0; i < cells.length; i += 7) {
    html += '<tr>';
    for (let j = 0; j < 7; j++) {
      const d = cells[i + j];
      if (!d) { html += '<td class="cal-cell empty"></td>'; continue; }
      const ds = ymd(d);
      const cinfo = classifyDate(ds);
      const k = cinfo.kind;
      const isToday = ds === todayStr;
      const att = state.attendance[ds] || {};
      let stuList = '';
      for (const stu of state.students) {
        const a = att[stu.no];
        if (!a || a.status === 'present') continue;
        const sCls = `stu-${a.status}`;
        let label;
        if (a.status === 'tardy') label = `${stu.name}(遅${a.period||''})`;
        else if (a.status === 'early') label = `${stu.name}(早${a.period||''})`;
        else label = `${stu.name}(${STATUS_LABEL[a.status]})`;
        stuList += `<span class="${sCls}">${escapeHtml(label)}</span>`;
      }
      const dayTag = (k === 'normal') ? '' : `<span class="day-tag">${escapeHtml(cinfo.reason)}</span>`;
      html += `<td class="cal-cell k-${k} ${isToday?'today':''}" data-date="${ds}">
        <span class="day-num">${d.getDate()}</span>
        ${dayTag}
        ${stuList ? `<div class="stu-list">${stuList}</div>` : ''}
      </td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  document.getElementById('cal-grid').innerHTML = html;
  document.querySelectorAll('#cal-grid td.cal-cell[data-date]').forEach(td => {
    td.addEventListener('click', () => {
      const ds = td.dataset.date;
      document.getElementById('daily-date').value = ds;
      showView('daily');
    });
  });
}

// =====================================================
// 月次集計
// =====================================================
function renderMonthly() {
  const inp = document.getElementById('monthly-month');
  if (!inp.value) {
    const t = new Date();
    inp.value = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}`;
  }
  refreshMonthlyTable();
}
function refreshMonthlyTable() {
  const ym = document.getElementById('monthly-month').value;
  if (!ym) return;
  const [y, m] = ym.split('-').map(Number);
  let classDayCount = 0;
  const startD = new Date(y, m - 1, 1), endD = new Date(y, m, 0);
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    const cls = classifyDate(ymd(d));
    if (cls.kind !== 'holiday') classDayCount++;
  }
  const stats = state.students.map(stu => {
    const counts = { suspended:0, mourning:0, official:0, abroad:0, absent:0, tardy:0, early:0, leave:0 };
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const ds = ymd(d);
      const cls = classifyDate(ds);
      if (cls.kind === 'holiday') continue;
      const att = state.attendance[ds];
      if (!att || !att[stu.no]) continue;
      const s = att[stu.no].status;
      if (counts.hasOwnProperty(s)) counts[s]++;
    }
    return { stu, counts };
  });
  const cols = [
    { key:'classDays', label:'授業日数' },
    { key:'suspended', label:'出停' },
    { key:'mourning',  label:'忌引' },
    { key:'official',  label:'公欠' },
    { key:'abroad',    label:'留学' },
    { key:'absent',    label:'欠席' },
    { key:'tardy',     label:'遅刻' },
    { key:'early',     label:'早退' },
    { key:'leave',     label:'休学' },
  ];
  let head = '<tr><th>No.</th><th>氏名</th>';
  for (const c of cols) head += `<th>${c.label}<button class="copy-btn small" data-col="${c.key}">列をコピー</button></th>`;
  head += '</tr>';
  let body = '';
  stats.forEach(({ stu, counts }) => {
    body += `<tr><td>${stu.no}</td><td>${escapeHtml(stu.name)}</td>`;
    for (const c of cols) {
      const v = c.key === 'classDays' ? classDayCount : counts[c.key];
      body += `<td data-col="${c.key}">${v}</td>`;
    }
    body += '</tr>';
  });
  document.getElementById('monthly-table-area').innerHTML = `
    <p class="hint">対象月: ${ym} / 授業日数: <strong>${classDayCount}日</strong></p>
    <table><thead>${head}</thead><tbody>${body}</tbody></table>
  `;
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.col;
      const cells = document.querySelectorAll(`#monthly-table-area td[data-col="${col}"]`);
      const text = Array.from(cells).map(c => c.textContent).join('\n');
      navigator.clipboard.writeText(text).then(() => {
        toast(`「${cols.find(c=>c.key===col).label}」列をコピーしました`, 'success');
      }).catch(() => toast('コピー失敗', 'error'));
    });
  });
}

// =====================================================
// 教科別集計
// =====================================================
let selectedSubject = null;
function renderSubject() {
  const div = document.getElementById('subject-summary');
  if (state.students.length === 0) { div.innerHTML = '<div class="card warn">生徒が未登録です。</div>'; return; }
  const stats = computeSubjectStatistics();
  if (stats.subjects.length === 0) { div.innerHTML = '<div class="card warn">時間割が未登録です。</div>'; return; }
  if (!selectedSubject || !stats.subjects.includes(selectedSubject)) selectedSubject = stats.subjects[0];
  let opts = '';
  for (const subj of stats.subjects) opts += `<option value="${escapeHtml(subj)}" ${subj===selectedSubject?'selected':''}>${escapeHtml(subj)}</option>`;
  const subj = selectedSubject;
  const baseTotal = stats.baseTotals[subj] || 0;
  let body = '';
  for (const stu of state.students) {
    const stat = stats.perStudent[stu.no] || {};
    const total = stat[subj]?.total ?? baseTotal;
    const abs = stat[subj]?.absences ?? 0;
    const limit = Math.floor(total / 3);
    const remaining = limit - abs;
    const over = total > 0 && abs >= total / 3;
    let remainHtml = over ? `<span class="warn">超過 (${abs - limit}回オーバー)</span>` : (remaining <= 3 ? `<span class="warn">残り ${remaining} 回</span>` : `残り ${remaining} 回`);
    body += `<tr class="${over?'over-third':''}"><td>${stu.no}</td><td>${escapeHtml(stu.name)}</td><td style="text-align:right;">${total}</td><td style="text-align:right;">${abs}</td><td style="text-align:right;">${limit}</td><td>${remainHtml}</td></tr>`;
  }
  div.innerHTML = `
    <div class="card">
      <div class="row">
        <label><strong>教科を選択:</strong>
          <select id="subject-select" style="font-size:14px; padding:4px 8px; min-width:180px;">${opts}</select>
        </label>
        <span class="hint">クラス基準の年間授業数: <strong>${baseTotal}回</strong>（1/3=${Math.floor(baseTotal/3)}回）</span>
      </div>
      <p class="hint">年間授業日数 = 1学期(実授業数+3) + 2学期(実授業数+3) + 3学期(実授業数+2)。個人の授業数は、その生徒の <strong>出停・忌引・留学・休学</strong> 分を減算。
      欠席は <strong>「欠席」のみ</strong>カウント（公欠・遅刻・早退は出席扱い）。1/3超過は <span class="warn">赤色</span>。</p>
      <div style="overflow-x:auto;">
        <table>
          <thead><tr><th>No.</th><th>氏名</th><th>授業数</th><th>欠席数</th><th>1/3</th><th>残り回数</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById('subject-select').onchange = (e) => { selectedSubject = e.target.value; renderSubject(); };
}

// =====================================================
// 初期設定
// =====================================================
function renderSetup() {
  const sel = document.getElementById('setup-class-letter');
  if (sel.options.length === 0) {
    for (let c = 'A'.charCodeAt(0); c <= 'M'.charCodeAt(0); c++) {
      const opt = document.createElement('option');
      opt.value = String.fromCharCode(c);
      opt.textContent = String.fromCharCode(c);
      sel.appendChild(opt);
    }
  }
  document.getElementById('setup-year').value = state.config.year;
  document.getElementById('setup-grade').value = state.config.grade;
  document.getElementById('setup-class-letter').value = state.config.classLetter;
  document.getElementById('setup-saturday').checked = state.config.saturdayClass;
  document.getElementById('setup-periods').value = state.config.periods;

  document.getElementById('setup-year').onchange = (e) => { state.config.year = parseInt(e.target.value); saveAll(); updateClassInfoBar(); };
  document.getElementById('setup-grade').onchange = (e) => { state.config.grade = e.target.value; saveAll(); updateClassInfoBar(); };
  document.getElementById('setup-class-letter').onchange = (e) => { state.config.classLetter = e.target.value; saveAll(); updateClassInfoBar(); };
  document.getElementById('setup-saturday').onchange = (e) => { state.config.saturdayClass = e.target.checked; saveAll(); };
  document.getElementById('setup-periods').onchange = (e) => { state.config.periods = parseInt(e.target.value); saveAll(); buildTimetable(); };
  renderStudents();
  buildTimetable();
  refreshCalendarStatus();
  refreshExcelStatus();
}
function renderStudents() {
  const tbody = document.getElementById('students-tbody');
  tbody.innerHTML = state.students.map((s, i) => `
    <tr>
      <td><input type="number" data-i="${i}" data-f="no" value="${escapeHtml(String(s.no))}" style="width:60px;"></td>
      <td><input type="text" data-i="${i}" data-f="name" value="${escapeHtml(s.name)}" style="width:90%;"></td>
      <td><button class="small danger" data-del="${i}">削除</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('input').forEach(inp => {
    inp.onchange = (e) => {
      const i = parseInt(e.target.dataset.i);
      const f = e.target.dataset.f;
      state.students[i][f] = (f === 'no') ? parseInt(e.target.value) : e.target.value;
      saveAll();
    };
  });
  tbody.querySelectorAll('button[data-del]').forEach(b => {
    b.onclick = () => {
      state.students.splice(parseInt(b.dataset.del), 1);
      saveAll();
      renderStudents();
      updateClassInfoBar();
    };
  });
}
function buildTimetable() {
  const div = document.getElementById('timetable-area');
  const periods = state.config.periods;
  for (const wd of WEEKDAYS) {
    if (!state.timetable[wd]) state.timetable[wd] = [];
    state.timetable[wd].length = periods;
  }
  let cells = '<div class="cell head">時限＼曜日</div>';
  for (const wd of WEEKDAYS) cells += `<div class="cell head">${wd}</div>`;
  for (let p = 0; p < periods; p++) {
    cells += `<div class="cell head">${p+1}限</div>`;
    for (const wd of WEEKDAYS) {
      const v = state.timetable[wd][p] || '';
      cells += `<div class="cell"><input type="text" data-wd="${wd}" data-p="${p}" value="${escapeHtml(v)}"></div>`;
    }
  }
  div.innerHTML = `<div class="tt-grid" style="grid-template-columns: 80px repeat(${WEEKDAYS.length}, 1fr);">${cells}</div>`;
  div.querySelectorAll('input').forEach(inp => {
    inp.onchange = (e) => {
      state.timetable[e.target.dataset.wd][parseInt(e.target.dataset.p)] = e.target.value.trim();
      saveAll();
    };
  });
}
function refreshCalendarStatus() {
  const div = document.getElementById('calendar-status');
  if (state.calendar.length === 0) div.innerHTML = '<p class="hint">未登録</p>';
  else {
    const first = state.calendar[0].date, last = state.calendar[state.calendar.length-1].date;
    div.innerHTML = `<p>登録済: ${state.calendar.length}日 (${first} 〜 ${last})</p>`;
  }
}
function refreshExcelStatus() {
  const div = document.getElementById('students-excel-status');
  if (!div) return;
  if (typeof XLSX === 'undefined') {
    div.innerHTML = '<p class="hint warn">※ xlsx.full.min.js が読み込まれていません。同フォルダにあるか確認してください。</p>';
  } else div.innerHTML = '';
}

// Excel生徒取り込み
let pendingStudents = null;
function importStudentsFromExcel(file) {
  if (typeof XLSX === 'undefined') { toast('Excel取り込みライブラリ未読込', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      let result = null, usedSheet = null;
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const found = findHeaderRow(rows);
        if (found) { result = { rows, ...found }; usedSheet = name; break; }
      }
      if (!result) { toast('「番号」と「氏名」(または「名前」) の列が見つかりません', 'error'); return; }
      const { rows, headerRow, noIdx, nameIdx } = result;
      const students = [];
      for (let i = headerRow + 1; i < rows.length; i++) {
        const r = rows[i] || [];
        const noNum = parseInt(r[noIdx]);
        const nameVal = String(r[nameIdx] || '').trim();
        if (isNaN(noNum) || !nameVal) continue;
        students.push({ no: noNum, name: nameVal });
      }
      if (students.length === 0) { toast('生徒データが見つかりませんでした', 'error'); return; }
      students.sort((a, b) => a.no - b.no);
      pendingStudents = { students, sheetName: usedSheet };
      showStudentsPreview();
    } catch (err) { toast('Excel読込失敗: ' + err.message, 'error'); }
  };
  reader.readAsArrayBuffer(file);
}
function findHeaderRow(rows) {
  const NO_KEYS  = ['番号','No','No.','no','no.','出席番号','NO','№'];
  const NAME_KEYS = ['氏名','名前','なまえ','シメイ','Name','name'];
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const r = rows[i] || [];
    let noIdx = -1, nameIdx = -1;
    for (let j = 0; j < r.length; j++) {
      const v = String(r[j] || '').trim();
      if (!v) continue;
      if (noIdx < 0 && NO_KEYS.some(k => v === k || v.includes(k))) noIdx = j;
      if (nameIdx < 0 && NAME_KEYS.some(k => v === k || v.includes(k))) nameIdx = j;
    }
    if (noIdx >= 0 && nameIdx >= 0) return { headerRow: i, noIdx, nameIdx };
  }
  return null;
}
function showStudentsPreview() {
  const box = document.getElementById('students-preview');
  const info = document.getElementById('students-preview-info');
  const tbl = document.getElementById('students-preview-table');
  const { students, sheetName } = pendingStudents;
  info.textContent = `「${sheetName}」シートから ${students.length} 名検出。内容を確認してから「登録」を押してください。`;
  let h = '<table><thead><tr><th>No.</th><th>氏名</th></tr></thead><tbody>';
  for (const s of students) h += `<tr><td>${s.no}</td><td>${escapeHtml(s.name)}</td></tr>`;
  h += '</tbody></table>';
  tbl.innerHTML = h;
  box.classList.remove('hidden');
}
function confirmStudentsPreview() {
  if (!pendingStudents) return;
  if (state.students.length > 0) {
    if (!confirm(`現在の生徒一覧(${state.students.length}名)を上書きして、Excelの${pendingStudents.students.length}名を登録しますか？`)) return;
  }
  state.students = pendingStudents.students;
  saveAll();
  pendingStudents = null;
  document.getElementById('students-preview').classList.add('hidden');
  renderStudents();
  updateClassInfoBar();
  toast('生徒を登録しました', 'success');
}
function cancelStudentsPreview() {
  pendingStudents = null;
  document.getElementById('students-preview').classList.add('hidden');
}

// =====================================================
// ルール編集
// =====================================================
function renderRules() {
  const grade = document.getElementById('rules-grade').value;
  const tbody = document.getElementById('rules-tbody');
  const rules = state.rules[grade] || [];
  tbody.innerHTML = rules.map((r, i) => `
    <tr>
      <td><input type="text" data-i="${i}" data-f="keyword" value="${escapeHtml(r.keyword)}" style="width:100%;"></td>
      <td><input type="radio" name="kind-${i}" value="holiday" ${r.kind==='holiday'?'checked':''} data-i="${i}"></td>
      <td><input type="radio" name="kind-${i}" value="noclass" ${r.kind==='noclass'?'checked':''} data-i="${i}"></td>
      <td><input type="radio" name="kind-${i}" value="changed" ${r.kind==='changed'?'checked':''} data-i="${i}"></td>
      <td><button class="small danger" data-del="${i}">削除</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('input[type="text"]').forEach(inp => {
    inp.onchange = (e) => { state.rules[grade][parseInt(e.target.dataset.i)].keyword = e.target.value; };
  });
  tbody.querySelectorAll('input[type="radio"]').forEach(inp => {
    inp.onchange = (e) => { state.rules[grade][parseInt(e.target.dataset.i)].kind = e.target.value; };
  });
  tbody.querySelectorAll('button[data-del]').forEach(b => {
    b.onclick = () => { state.rules[grade].splice(parseInt(b.dataset.del), 1); renderRules(); };
  });
}

// =====================================================
// イベント結線
// =====================================================
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));

// 日々入力
document.getElementById('daily-date').addEventListener('change', (e) => renderDailyForDate(e.target.value));
document.getElementById('daily-prev').onclick = () => {
  const inp = document.getElementById('daily-date');
  const d = parseYmd(inp.value); d.setDate(d.getDate()-1);
  inp.value = ymd(d); renderDailyForDate(inp.value);
};
document.getElementById('daily-next').onclick = () => {
  const inp = document.getElementById('daily-date');
  const d = parseYmd(inp.value); d.setDate(d.getDate()+1);
  inp.value = ymd(d); renderDailyForDate(inp.value);
};
document.getElementById('daily-today').onclick = () => {
  const inp = document.getElementById('daily-date');
  inp.value = ymd(new Date()); renderDailyForDate(inp.value);
};
document.getElementById('daily-copy-yesterday').onclick = () => {
  const cur = document.getElementById('daily-date').value;
  if (!cur) return;
  const prev = previousDate(cur);
  const prevAtt = state.attendance[prev];
  if (!prevAtt) { toast(`${prev}にデータがありません`, 'error'); return; }
  if (!confirm(`${prev}の出欠状況をすべて${cur}にコピーします。よろしいですか？`)) return;
  pushUndo(`前日(${prev})からコピー`, cur);
  state.attendance[cur] = JSON.parse(JSON.stringify(prevAtt));
  saveAll();
  refreshCurrentView();
  toast('前日と同じ状態にしました', 'success');
};

// モーダル
document.getElementById('modal-cancel').onclick = closeStudentModal;
document.getElementById('modal-clear').onclick = clearStudentModal;
document.getElementById('modal-save').onclick = saveStudentModal;
document.getElementById('modal-yesterday').onclick = applyYesterdayToModal;
document.querySelector('#student-modal .modal-backdrop').addEventListener('click', closeStudentModal);

// 個人サマリー
document.getElementById('summary-close').onclick = () => document.getElementById('summary-modal').classList.add('hidden');
document.querySelector('#summary-modal .modal-backdrop').addEventListener('click', () => document.getElementById('summary-modal').classList.add('hidden'));

// カレンダー
document.getElementById('cal-prev').onclick = () => {
  if (!calMonthState) calMonthState = { year: new Date().getFullYear(), month: new Date().getMonth() };
  calMonthState.month--; if (calMonthState.month < 0) { calMonthState.month = 11; calMonthState.year--; }
  drawCalendar();
};
document.getElementById('cal-next').onclick = () => {
  if (!calMonthState) calMonthState = { year: new Date().getFullYear(), month: new Date().getMonth() };
  calMonthState.month++; if (calMonthState.month > 11) { calMonthState.month = 0; calMonthState.year++; }
  drawCalendar();
};
document.getElementById('cal-today').onclick = () => {
  const t = new Date();
  calMonthState = { year: t.getFullYear(), month: t.getMonth() };
  drawCalendar();
};

// 月次（月変更時に自動更新）
document.getElementById('monthly-month').addEventListener('change', refreshMonthlyTable);

// 初期設定 - 生徒
document.getElementById('students-add').onclick = () => {
  const nextNo = state.students.length > 0 ? Math.max(...state.students.map(s=>s.no))+1 : 1;
  state.students.push({ no: nextNo, name: '' });
  saveAll(); renderStudents(); updateClassInfoBar();
};
document.getElementById('students-clear').onclick = () => {
  if (!confirm('生徒一覧を全削除しますか？')) return;
  state.students = []; saveAll(); renderStudents(); updateClassInfoBar();
};
document.getElementById('students-bulk-toggle').onclick = () => {
  document.getElementById('students-bulk').classList.toggle('hidden');
};
document.getElementById('students-bulk-apply').onclick = () => {
  const text = document.getElementById('students-bulk-text').value;
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^(\d+)[,\s\t]+(.+)$/);
    if (m) state.students.push({ no: parseInt(m[1]), name: m[2].trim() });
    else {
      const nextNo = state.students.length > 0 ? Math.max(...state.students.map(s=>s.no))+1 : 1;
      state.students.push({ no: nextNo, name: line });
    }
  }
  state.students.sort((a,b) => a.no - b.no);
  saveAll(); renderStudents(); updateClassInfoBar();
  document.getElementById('students-bulk-text').value = '';
};
document.getElementById('students-excel').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  importStudentsFromExcel(f); e.target.value = '';
});
document.getElementById('students-preview-confirm').onclick = confirmStudentsPreview;
document.getElementById('students-preview-cancel').onclick = cancelStudentsPreview;

document.getElementById('calendar-csv').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const n = importCalendarCSV(reader.result);
      toast(`カレンダーを取り込みました（${n}日）`, 'success');
      refreshCalendarStatus();
    } catch (err) { toast('CSV読込失敗: ' + err.message, 'error'); }
  };
  reader.readAsText(f, 'UTF-8');
});

document.getElementById('rules-reset').onclick = () => {
  if (!confirm('ルールをデフォルト（駒澤大学高等学校仕様）に戻しますか？')) return;
  state.rules = JSON.parse(JSON.stringify(DEFAULT_RULES));
  saveAll();
  toast('ルールを初期化しました', 'success');
};
document.getElementById('rules-grade').onchange = renderRules;
document.getElementById('rules-add').onclick = () => {
  state.rules[document.getElementById('rules-grade').value].push({ keyword: '', kind: 'noclass' });
  renderRules();
};
document.getElementById('rules-save').onclick = () => {
  saveAll();
  document.getElementById('rules-save-msg').textContent = '保存しました';
  setTimeout(() => { document.getElementById('rules-save-msg').textContent = ''; }, 2000);
};

// データ管理
document.getElementById('data-export').onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `attendance-${ymd(new Date())}.json`; a.click();
  URL.revokeObjectURL(url);
};
document.getElementById('data-import-file').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  if (!confirm('既存の全データを上書きします。よろしいですか？')) { e.target.value=''; return; }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = { ...defaultState(), ...JSON.parse(reader.result) };
      saveAll();
      toast('インポート完了', 'success');
      updateClassInfoBar();
      showView('dashboard');
    } catch (err) { toast('インポート失敗: ' + err.message, 'error'); }
  };
  reader.readAsText(f, 'UTF-8');
});
document.getElementById('data-clear').onclick = () => {
  if (!confirm('本当に全データを削除しますか？この操作は元に戻せません。')) return;
  if (!confirm('もう一度確認します。本当に削除しますか？')) return;
  state = defaultState();
  saveAll();
  toast('全データ削除', 'success');
  updateClassInfoBar();
  showView('dashboard');
};

// ヘッダツール: テーマ・Undo・ストレージ
document.getElementById('theme-toggle').onclick = toggleTheme;
document.getElementById('undo-btn').onclick = performUndo;
document.getElementById('storage-indicator').onclick = () => showView('data');

// スクロール時のヘッダ縮小は無効化（チカチカ防止）

// キーボード: Esc でモーダルを閉じる
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!document.getElementById('student-modal').classList.contains('hidden')) closeStudentModal();
    if (!document.getElementById('summary-modal').classList.contains('hidden')) document.getElementById('summary-modal').classList.add('hidden');
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    performUndo();
  }
});

function updateClassInfoBar() {
  document.getElementById('class-info-bar').textContent = `${state.config.year}年度 / ${getClassName()} / ${state.students.length}名`;
}

// 起動
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
updateClassInfoBar();
showView('dashboard');
markSaved();
updateStorageIndicator();
