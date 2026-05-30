/* =====================================================
   【授業】出欠管理アプリ - subject_app.js
   ===================================================== */
(() => {
'use strict';

// ===== 定数 =====
const STORAGE_KEY = 'lesson-attendance-app-v1';
const STATUSES = ['出', '公欠', '出停', '忌引', '欠席'];
// 出=未登録（保存時は空・略），それ以外は記録
const STATUS_CLASS = {
  '出': 'present',
  '公欠': 'official',
  '出停': 'suspended',
  '忌引': 'mourning',
  '欠席': 'absent',
};
const CLASS_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','混在'];
const MAX_PERIOD = 7;

// ===== 状態 =====
let state = null;

// ===== ユーティリティ =====
const $ = (sel, parent=document) => parent.querySelector(sel);
const $$ = (sel, parent=document) => Array.from(parent.querySelectorAll(sel));
const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad2 = (n) => String(n).padStart(2,'0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
};
const currentAY = () => {
  // 4月始まり年度
  const d = new Date();
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
};
const uid = () => 'a' + Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4);
const fmtDate = (s) => {
  if (!s) return '';
  const [y,m,d] = s.split('-');
  return `${y}/${m}/${d}`;
};
const dayOfWeek = (s) => ['日','月','火','水','木','金','土'][new Date(s+'T00:00:00').getDay()];

function toast(msg, type='') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.className = type; }, 2200);
}

// ===== ストレージ =====
const STORAGE_KEY_BACKUP = STORAGE_KEY + '_backup';

function load() {
  // メインキーから読み込み。失敗または空ならバックアップから復元を試みる。
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  if (raw) {
    try { return migrate(JSON.parse(raw)); }
    catch (e) {
      console.error('main parse failed', e);
      // 続けてバックアップ復元を試行
    }
  }
  // === バックアップから復元 ===
  let backup = null;
  try { backup = localStorage.getItem(STORAGE_KEY_BACKUP); } catch (e) {}
  if (backup) {
    try {
      const parsed = migrate(JSON.parse(backup));
      // メインに書き戻し
      try { localStorage.setItem(STORAGE_KEY, backup); } catch(e) {}
      // 起動後にユーザに通知
      window._restoredFromBackup = true;
      return parsed;
    } catch (e) {
      console.error('backup parse failed', e);
    }
  }
  return defaultState();
}

function save() {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, json);
    // === 二重化バックアップ（メインキー破損対策） ===
    try { localStorage.setItem(STORAGE_KEY_BACKUP, json); } catch (e) {}
    updateSavedIndicator();
    updateStorageIndicator();
    updateSafetyIndicators();
  } catch (e) {
    console.error('save failed', e);
    toast('保存に失敗しました（容量上限の可能性）', 'error');
  }
}

function defaultState() {
  return {
    v: 1,
    year: String(currentAY()),
    assignments: [],
    rosters: {},
    attendance: {},
    archives: [],
    lastSavedAt: null,
    lastExportAt: null,
  };
}

function migrate(s) {
  // 将来のバージョン用
  if (!s.v) s = defaultState();
  s.assignments = s.assignments || [];
  s.rosters = s.rosters || {};
  s.attendance = s.attendance || {};
  s.archives = s.archives || [];
  s.year = s.year || String(currentAY());
  if (s.lastExportAt === undefined) s.lastExportAt = null;
  // 各 assignment に termHours フィールドを保証
  s.assignments.forEach(a => {
    if (!a.termHours || typeof a.termHours !== 'object') {
      a.termHours = { 1: '', 2: '', 3: '' };
    } else {
      a.termHours[1] = a.termHours[1] ?? '';
      a.termHours[2] = a.termHours[2] ?? '';
      a.termHours[3] = a.termHours[3] ?? '';
    }
  });
  return s;
}

// ===== 学期判定 =====
// 1学期=4-8月、2学期=9-12月、3学期=1-3月
function getTermForDate(dateStr) {
  if (!dateStr || dateStr.length < 7) return null;
  const m = +dateStr.slice(5, 7);
  if (m >= 4 && m <= 8) return 1;
  if (m >= 9 && m <= 12) return 2;
  if (m >= 1 && m <= 3) return 3;
  return null;
}
function termRange(t) {
  return t === 1 ? '4-8月' : t === 2 ? '9-12月' : t === 3 ? '1-3月' : '';
}
function hasTermHours(asg) {
  const th = asg?.termHours;
  if (!th) return false;
  return [1,2,3].some(k => +th[k] > 0);
}
function getAnnualHours(asg) {
  const th = asg?.termHours || {};
  return (+th[1] || 0) + (+th[2] || 0) + (+th[3] || 0);
}

// ===== データ保護：永続化要求 =====
async function ensurePersistentStorage() {
  if (!navigator.storage || typeof navigator.storage.persist !== 'function') {
    window._isPersisted = null; // 非対応
    return null;
  }
  try {
    const persisted = await navigator.storage.persisted();
    if (persisted) { window._isPersisted = true; return true; }
    const granted = await navigator.storage.persist();
    window._isPersisted = !!granted;
    return granted;
  } catch (e) {
    console.warn('persist request failed:', e);
    window._isPersisted = false;
    return false;
  }
}

// ===== データ保護：インジケータ更新（バックアップ経過日数のみ） =====
function updateSafetyIndicators() {
  const bEl = $('#backup-age-indicator');
  if (bEl) {
    bEl.classList.remove('safe','warn','danger');
    if (!state.lastExportAt) {
      bEl.textContent = '💾 未保存';
      bEl.classList.add('warn');
      bEl.title = 'まだJSONバックアップを取っていません。\nクリックで今すぐエクスポートできます。';
    } else {
      const days = Math.floor((Date.now() - new Date(state.lastExportAt).getTime()) / (1000*60*60*24));
      bEl.textContent = `💾 ${days}日`;
      if (days >= 30) bEl.classList.add('danger');
      else if (days >= 14) bEl.classList.add('warn');
      else bEl.classList.add('safe');
      bEl.title = `最後のJSONバックアップから ${days}日経過\n（${new Date(state.lastExportAt).toLocaleString('ja-JP')}）\nクリックで今すぐエクスポート。`;
    }
  }
}


function updateSavedIndicator() {
  state.lastSavedAt = new Date().toISOString();
  const d = new Date(state.lastSavedAt);
  $('#saved-indicator').textContent = `保存: ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function updateStorageIndicator() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '';
    const bytes = new Blob([raw]).size;
    const kb = bytes / 1024;
    const pct = (bytes / (5 * 1024 * 1024)) * 100;
    const text = bytes < 1024 ? `${bytes}B` : kb < 1024 ? `${kb.toFixed(1)}KB` : `${(kb/1024).toFixed(2)}MB`;
    const el = $('#storage-indicator');
    el.textContent = `📦 ${text}`;
    el.classList.remove('s-warn','s-danger');
    if (pct > 90) el.classList.add('s-danger');
    else if (pct > 70) el.classList.add('s-warn');

    const bar = $('#storage-bar-fill');
    if (bar) {
      const p = Math.min(100, pct);
      bar.style.width = p.toFixed(1) + '%';
      bar.textContent = p.toFixed(1) + '%';
      bar.classList.remove('s-warn','s-danger');
      if (pct > 90) bar.classList.add('s-danger');
      else if (pct > 70) bar.classList.add('s-warn');
    }
    const sz = $('#storage-size-display');
    if (sz) sz.textContent = text;
  } catch (e) {}
}

// ===== 共通 UI =====
function getAssignmentLabel(a) {
  // 例: "1年A組地理総合"  / 混在の場合は "1年混在クラス地理総合"
  const cls = a.class === '混在' ? '混在クラス' : `${a.class}組`;
  return `${a.grade}年${cls}${a.subject}`;
}
function fillAssignmentSelect(selectEl, includeEmpty=false) {
  selectEl.innerHTML = '';
  if (includeEmpty) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— 選択 —';
    selectEl.appendChild(opt);
  }
  if (state.assignments.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '（担当授業が未登録）';
    opt.disabled = true;
    selectEl.appendChild(opt);
  }
  state.assignments.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = getAssignmentLabel(a);
    selectEl.appendChild(opt);
  });
}

function fillClassLetterSelect(selectEl) {
  selectEl.innerHTML = '';
  CLASS_LETTERS.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l;
    opt.textContent = l;
    selectEl.appendChild(opt);
  });
}

function showView(view) {
  $$('.view').forEach(v => v.classList.add('hidden'));
  $('#view-' + view)?.classList.remove('hidden');
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  // 表示時の再描画
  if (view === 'today') refreshTodayView();
  if (view === 'past') refreshPastView();
  if (view === 'list') refreshListView();
  if (view === 'export') refreshExportView();
  if (view === 'setup') refreshSetupView();
  if (view === 'yearupdate') refreshYearUpdateView();
  if (view === 'data') updateStorageIndicator();
}

// ===== 出欠データ ヘルパ =====
function getAttendance(asgId, date, period) {
  return state.attendance?.[asgId]?.[date]?.[period] || null;
}
function setAttendance(asgId, date, period, records) {
  if (!state.attendance[asgId]) state.attendance[asgId] = {};
  if (!state.attendance[asgId][date]) state.attendance[asgId][date] = {};
  // recordsは {studentNo: status} で「出」と空はキー削除
  const cleaned = {};
  Object.entries(records).forEach(([no, st]) => {
    if (st && st !== '出') cleaned[no] = st;
  });
  state.attendance[asgId][date][period] = cleaned;
}
function deleteAttendance(asgId, date, period) {
  if (state.attendance?.[asgId]?.[date]?.[period] !== undefined) {
    delete state.attendance[asgId][date][period];
    if (Object.keys(state.attendance[asgId][date]).length === 0) {
      delete state.attendance[asgId][date];
    }
  }
}
function hasAttendance(asgId, date, period) {
  return state.attendance?.[asgId]?.[date]?.[period] !== undefined;
}

// =====================================================
// 当日入力ビュー
// =====================================================
function refreshTodayView() {
  // 担当授業ドロップダウン（前回選択を保持）
  const prev = $('#today-assignment').value;
  fillAssignmentSelect($('#today-assignment'));
  if (prev && state.assignments.find(a => a.id === prev)) {
    $('#today-assignment').value = prev;
  }
  if (!$('#today-date').value) $('#today-date').value = todayStr();
  reloadTodayRoster();
}

function reloadTodayRoster() {
  reloadRosterFromInputs('today');
}

function reloadPastRoster() {
  reloadRosterFromInputs('past');
}

// 'today' / 'past' どちらでも使える共通ロジック
function reloadRosterFromInputs(prefix) {
  const asgId = $(`#${prefix}-assignment`).value;
  const date = $(`#${prefix}-date`).value || todayStr();
  const period = +$(`#${prefix}-period`).value || 1;
  const area = $(`#${prefix}-roster-area`);
  if (!asgId) {
    area.innerHTML = `<div class="card"><p class="empty-msg">担当授業を選択してください。<br>未登録の場合は「⚙️ 登録情報」タブで追加してください。</p></div>`;
  } else {
    loadRosterFor(`${prefix}-roster-area`, asgId, date, period);
  }
  renderRegisteredList(prefix);
}

// 指定日に既に登録されている (担当授業 × 時限) 一覧をチップ表示
function renderRegisteredList(prefix) {
  const wrap = $(`#${prefix}-registered-list`);
  if (!wrap) return;
  const date = $(`#${prefix}-date`).value || todayStr();
  const curAsgId = $(`#${prefix}-assignment`).value;
  const curPeriod = +$(`#${prefix}-period`).value || 0;

  // 全担当授業を横断してこの日のデータを収集
  const entries = [];
  state.assignments.forEach(asg => {
    const day = state.attendance[asg.id]?.[date];
    if (!day) return;
    Object.keys(day).forEach(period => {
      entries.push({ asg, period: +period });
    });
  });

  if (entries.length === 0) {
    wrap.innerHTML = `<p class="empty-msg" style="padding:14px;">${fmtDate(date)}（${dayOfWeek(date)}）に登録済みのデータはありません。</p>`;
    return;
  }

  // 時限 → 学年 → クラス順
  entries.sort((a, b) => {
    if (a.period !== b.period) return a.period - b.period;
    if (a.asg.grade !== b.asg.grade) return a.asg.grade - b.asg.grade;
    return String(a.asg.class).localeCompare(String(b.asg.class));
  });

  wrap.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'today-registered-grid';
  entries.forEach(({asg, period}) => {
    const isCurrent = asg.id === curAsgId && period === curPeriod;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'today-registered-item' + (isCurrent ? ' is-current' : '');
    btn.dataset.asgId = asg.id;
    btn.dataset.period = period;
    btn.title = `${getAssignmentLabel(asg)} ／ ${period}時間目（クリックで上の入力欄に表示）`;
    const clsLabel = asg.class === '混在' ? '混在クラス' : `${asg.class}組`;
    btn.innerHTML = `
      <span class="reg-period">${period}限</span>
      <span class="reg-class">${escape(asg.grade)}年${escape(clsLabel)}</span>
      <span class="reg-subject">${escape(asg.subject)}</span>
    `;
    grid.appendChild(btn);
  });
  wrap.appendChild(grid);

  grid.addEventListener('click', e => {
    const item = e.target.closest('.today-registered-item');
    if (!item) return;
    $(`#${prefix}-assignment`).value = item.dataset.asgId;
    $(`#${prefix}-period`).value = item.dataset.period;
    reloadRosterFromInputs(prefix);
    window.scrollTo({top: 0, behavior: 'smooth'});
  });
}

// 後方互換のエイリアス（loadRosterFor の保存/削除後から呼ばれる）
function renderTodayRegisteredList() {
  renderRegisteredList('today');
  renderRegisteredList('past');
}

// =====================================================
// 生徒の累計集計と「1/3 警告」ヘルパ
// =====================================================
// 指定 (担当授業, 生徒No) の保存済みデータから累計を算出
// asgObj が渡されれば、termHours に基づく学期情報も含めて返す
function computeStudentRunningTotals(asgId, studentNo, asgObj) {
  const attData = state.attendance[asgId] || {};
  let totalSessions = 0, kk = 0, st = 0, mo = 0, ab = 0;
  const termAbs = { 1: 0, 2: 0, 3: 0 };
  Object.keys(attData).forEach(date => {
    Object.keys(attData[date]).forEach(period => {
      totalSessions++;
      const status = attData[date][period][studentNo];
      if (status === '公欠') kk++;
      else if (status === '出停') st++;
      else if (status === '忌引') mo++;
      else if (status === '欠席') {
        ab++;
        const t = getTermForDate(date);
        if (t) termAbs[t]++;
      }
    });
  });
  // 授業数（その生徒に対する）＝ 総実施回数 − 出停 − 忌引
  const classes = totalSessions - st - mo;
  const limit = Math.floor(classes / 3);
  const remaining = limit - ab;
  const ns = {
    totalSessions, classes,
    '公欠': kk, '出停': st, '忌引': mo, '欠席': ab,
    limit, remaining, termAbs,
  };
  // 学期モード（termHours が入力されているとき）
  if (asgObj && hasTermHours(asgObj)) {
    const annualHours = getAnnualHours(asgObj);
    ns.annual = {
      hours: annualHours,
      limit: Math.floor(annualHours / 3),
      used: ab,
      remaining: Math.floor(annualHours / 3) - ab,
    };
    ns.allTerms = [1, 2, 3].map(t => {
      const hrs = +(asgObj.termHours[t]) || 0;
      const used = termAbs[t] || 0;
      const lim = Math.floor(hrs / 3);
      return { num: t, hours: hrs, limit: lim, used, remaining: hrs > 0 ? lim - used : null };
    });
    ns.useTerms = true;
  }
  return ns;
}

// 警告レベル：'warn'(残り2) / 'danger'(残り1) / 'critical'(残り0以下) / null
// 授業数が7回未満なら無警告（ユーザ要件）
function getWarnLevel(stats) {
  if (!stats || stats.classes < 7) return null;
  if (stats.remaining <= 0) return 'critical';
  if (stats.remaining === 1) return 'danger';
  if (stats.remaining === 2) return 'warn';
  return null;
}

// 警告バッジ HTML を返す（無警告なら空文字）
function getWarnBadge(stats) {
  const level = getWarnLevel(stats);
  if (!level) return '';
  const remainText =
    stats.remaining > 0  ? `あと${stats.remaining}回` :
    stats.remaining === 0 ? '限界到達' :
                            `${-stats.remaining}回 超過`;
  const icon = level === 'critical' ? '❌' : '⚠️';
  const tip = `授業数 ${stats.classes}回 ／ 欠席 ${stats['欠席']}回 ／ 1/3ライン ${stats.limit}回`;
  return `<span class="warn-badge warn-${level}" title="${escape(tip)}">${icon} ${remainText}<span class="warn-detail">（欠${stats['欠席']}/${stats.classes}）</span></span>`;
}

// =====================================================
// 生徒個別の履歴モーダル
// =====================================================
function openStudentHistory(asgId, studentNo) {
  const asg = state.assignments.find(a => a.id === asgId);
  if (!asg) return;
  const roster = state.rosters[asgId] || [];
  const stu = roster.find(s => s.no === studentNo);
  if (!stu) return;

  const stats = computeStudentRunningTotals(asgId, studentNo, asg);
  const warnBadge = getWarnBadge(stats);

  // 出席以外の記録だけを抽出
  const entries = [];
  const attData = state.attendance[asgId] || {};
  Object.keys(attData).sort().forEach(date => {
    Object.keys(attData[date]).sort((a,b)=>+a-+b).forEach(period => {
      const status = attData[date][period][studentNo];
      if (status) entries.push({ date, period: +period, status });
    });
  });

  // 学期別ブロック（termHours 入力済みのときのみ）
  let termHtml = '';
  if (stats.useTerms && stats.allTerms) {
    const termRows = stats.allTerms.map(t => {
      if (t.hours === 0) {
        return `<tr><td>${t.num}学期 (${termRange(t.num)})</td><td>—</td><td>${t.used}</td><td>—</td><td>—</td></tr>`;
      }
      const r = t.remaining;
      const lvl = r <= 0 ? 'critical' : r <= 1 ? 'danger' : r <= 2 ? 'warn' : null;
      const remTxt = r > 0 ? `あと${r}回` : r === 0 ? '限界' : `${-r}回超過`;
      const remBadge = lvl ? `<span class="warn-badge warn-${lvl}">${remTxt}</span>` : `<span style="color:var(--text-muted);">あと${r}回</span>`;
      return `<tr><td>${t.num}学期 (${termRange(t.num)})</td><td>${t.hours}</td><td>${t.used}</td><td>${t.limit}</td><td>${remBadge}</td></tr>`;
    }).join('');
    const aR = stats.annual.remaining;
    const aLvl = aR <= 0 ? 'critical' : aR <= 2 ? 'danger' : aR <= 5 ? 'warn' : null;
    const aRemTxt = aR > 0 ? `あと${aR}回` : aR === 0 ? '限界' : `${-aR}回超過`;
    const aBadge = aLvl ? `<span class="warn-badge warn-${aLvl}">${aRemTxt}</span>` : `<span style="color:var(--text-muted);">あと${aR}回</span>`;
    termHtml = `
      <h4>学期別の欠課時数 (1/3 ライン)</h4>
      <table class="history-table">
        <thead><tr><th>学期</th><th>総時数</th><th>欠課</th><th>1/3ライン</th><th>残り</th></tr></thead>
        <tbody>
          ${termRows}
          <tr style="background: var(--pill-bg); font-weight: bold;">
            <td>年間合計</td><td>${stats.annual.hours}</td><td>${stats.annual.used}</td><td>${stats.annual.limit}</td><td>${aBadge}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  $('#student-history-title').innerHTML =
    `📖 ${escape(stu.no)}番 ${escape(stu.name)} さんの履歴 ／ ${escape(getAssignmentLabel(asg))}`;

  const body = $('#student-history-body');
  body.innerHTML = `
    <h4>累計（${escape(getAssignmentLabel(asg))}）</h4>
    <div class="attendance-summary">
      <span class="sum-item ${stats.classes>0?'has-count':''}"><span class="lbl">授業数</span><span class="cnt">${stats.classes}</span></span>
      <span class="sum-item has-count s-official"><span class="lbl">公欠</span><span class="cnt">${stats['公欠']}</span></span>
      <span class="sum-item has-count s-suspended"><span class="lbl">出停</span><span class="cnt">${stats['出停']}</span></span>
      <span class="sum-item has-count s-mourning"><span class="lbl">忌引</span><span class="cnt">${stats['忌引']}</span></span>
      <span class="sum-item has-count s-absent"><span class="lbl">欠席</span><span class="cnt">${stats['欠席']}</span></span>
      <span class="sum-total">1/3ライン ${stats.limit}回 ${warnBadge}</span>
    </div>
    ${termHtml}
    <h4>欠席・公欠・出停・忌引の記録（${entries.length}件）</h4>
    ${entries.length === 0 ? '<p class="empty-msg">該当なし（全日出席）</p>' : `
      <table class="history-table">
        <thead><tr><th>日付</th><th>時限</th><th>状態</th></tr></thead>
        <tbody>${entries.map(e => `
          <tr>
            <td>${fmtDate(e.date)}（${dayOfWeek(e.date)}）</td>
            <td>${e.period}限</td>
            <td class="status-cell"><span class="legend-color s-${STATUS_CLASS[e.status]}">${e.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    `}
  `;
  $('#student-history-modal').classList.remove('hidden');
}
function closeStudentHistory() { $('#student-history-modal').classList.add('hidden'); }

// 「この回」を除外した累計（編集中の値を加算して "live" 集計を作るための基礎）
function computeStudentRunningTotalsExcluding(asgId, studentNo, excludeDate, excludePeriod) {
  const attData = state.attendance[asgId] || {};
  let totalSessions = 0, kk = 0, st = 0, mo = 0, ab = 0;
  // 学期別の欠席カウント（出欠データの日付ベースで集計）
  const termAbs = { 1: 0, 2: 0, 3: 0 };
  Object.keys(attData).forEach(date => {
    Object.keys(attData[date]).forEach(period => {
      if (date === excludeDate && +period === +excludePeriod) return;
      totalSessions++;
      const status = attData[date][period][studentNo];
      if (status === '公欠') kk++;
      else if (status === '出停') st++;
      else if (status === '忌引') mo++;
      else if (status === '欠席') {
        ab++;
        const t = getTermForDate(date);
        if (t) termAbs[t]++;
      }
    });
  });
  return { totalSessions, '公欠': kk, '出停': st, '忌引': mo, '欠席': ab, termAbs };
}

// 基礎累計 + 「今この行の状態」を合算して live 集計を返す
// asg と currentDate を渡せば学期別の集計も含まれる
function statsWithCurrentStatus(base, currentStatus, asg, currentDate) {
  const ns = {
    totalSessions: base.totalSessions + 1,
    '公欠': base['公欠'] + (currentStatus === '公欠' ? 1 : 0),
    '出停': base['出停'] + (currentStatus === '出停' ? 1 : 0),
    '忌引': base['忌引'] + (currentStatus === '忌引' ? 1 : 0),
    '欠席': base['欠席'] + (currentStatus === '欠席' ? 1 : 0),
  };
  ns.classes = ns.totalSessions - ns['出停'] - ns['忌引'];
  ns.limit = Math.floor(ns.classes / 3);
  ns.remaining = ns.limit - ns['欠席'];

  // === 学期別計算（asg.termHours が設定されている場合のみ）===
  if (asg && hasTermHours(asg)) {
    const annualHours = getAnnualHours(asg);
    const annualLimit = Math.floor(annualHours / 3);
    ns.annual = {
      hours: annualHours,
      limit: annualLimit,
      used: ns['欠席'],
      remaining: annualLimit - ns['欠席'],
    };

    const curTerm = getTermForDate(currentDate);
    if (curTerm) {
      const termHrs = +(asg.termHours[curTerm]) || 0;
      const baseTermAb = (base.termAbs && base.termAbs[curTerm]) || 0;
      // 現在の入力中の状態が「欠席」なら、現在の学期にも+1
      const liveTermAb = baseTermAb + (currentStatus === '欠席' ? 1 : 0);
      if (termHrs > 0) {
        const termLimit = Math.floor(termHrs / 3);
        ns.term = {
          num: curTerm,
          hours: termHrs,
          limit: termLimit,
          used: liveTermAb,
          remaining: termLimit - liveTermAb,
        };
      }
    }
    ns.useTerms = true;
  } else {
    ns.useTerms = false;
  }
  return ns;
}

// 警告レベルを統合判定（最大の severity を返す）
function getCombinedWarnLevel(stats) {
  if (!stats) return null;
  // 学期モード時：年間 + 学期の警告を統合
  if (stats.useTerms) {
    const rank = { 'critical': 3, 'danger': 2, 'warn': 1 };
    let max = 0, maxLvl = null;
    // 年間: 残5以下 warn, 残2以下 danger, 残0以下 critical
    if (stats.annual && stats.annual.hours > 0) {
      const r = stats.annual.remaining;
      const lvl = r <= 0 ? 'critical' : r <= 2 ? 'danger' : r <= 5 ? 'warn' : null;
      if (lvl && rank[lvl] > max) { max = rank[lvl]; maxLvl = lvl; }
    }
    // 学期: 残2以下 warn, 残1以下 danger, 残0以下 critical
    if (stats.term && stats.term.hours > 0) {
      const r = stats.term.remaining;
      const lvl = r <= 0 ? 'critical' : r <= 1 ? 'danger' : r <= 2 ? 'warn' : null;
      if (lvl && rank[lvl] > max) { max = rank[lvl]; maxLvl = lvl; }
    }
    return maxLvl;
  }
  // 旧モード：既存の getWarnLevel（授業数<7なら無警告、それ以外は残2以下で警告）
  return getWarnLevel(stats);
}

// 警告バッジHTML（複数バッジになる場合あり）
function getCombinedWarnBadges(stats) {
  if (!stats) return '';
  if (!stats.useTerms) return getWarnBadge(stats);

  let html = '';
  // 年間
  if (stats.annual && stats.annual.hours > 0) {
    const r = stats.annual.remaining;
    const lvl = r <= 0 ? 'critical' : r <= 2 ? 'danger' : r <= 5 ? 'warn' : null;
    if (lvl) {
      const remText = r > 0 ? `年間あと${r}回` : r === 0 ? '年間限界' : `年間${-r}回超過`;
      const icon = lvl === 'critical' ? '❌' : '⚠️';
      const tip = `年間総授業時数 ${stats.annual.hours}時数 ／ 欠課 ${stats.annual.used}回 ／ 1/3ライン ${stats.annual.limit}回`;
      html += `<span class="warn-badge warn-${lvl}" title="${escape(tip)}">${icon} ${remText}</span>`;
    }
  }
  // 学期
  if (stats.term && stats.term.hours > 0) {
    const r = stats.term.remaining;
    const lvl = r <= 0 ? 'critical' : r <= 1 ? 'danger' : r <= 2 ? 'warn' : null;
    if (lvl) {
      const remText = r > 0 ? `${stats.term.num}学期あと${r}回` : r === 0 ? `${stats.term.num}学期限界` : `${stats.term.num}学期${-r}回超過`;
      const icon = lvl === 'critical' ? '❌' : '⚠️';
      const tip = `${stats.term.num}学期 (${termRange(stats.term.num)}) 総授業時数 ${stats.term.hours}時数 ／ 欠課 ${stats.term.used}回 ／ 1/3ライン ${stats.term.limit}回`;
      html += `<span class="warn-badge warn-${lvl}" title="${escape(tip)}">${icon} ${remText}</span>`;
    }
  }
  return html;
}

function loadRosterFor(targetAreaId, asgId, date, period) {
  const area = $('#' + targetAreaId);
  area.innerHTML = '';
  const asg = state.assignments.find(a => a.id === asgId);
  if (!asg) {
    area.innerHTML = '<p class="empty-msg">担当授業が選択されていません。</p>';
    return;
  }
  const roster = state.rosters[asgId] || [];
  if (roster.length === 0) {
    area.innerHTML = `<div class="card"><p class="empty-msg">この授業の名簿が未登録です。<br>「⚙️ 登録情報」タブから名簿を登録してください。</p></div>`;
    return;
  }

  const existing = getAttendance(asgId, date, period) || {};
  const isEdit = hasAttendance(asgId, date, period);

  // 各生徒の「この回を除いた累計」を事前計算（警告バッジに使う）
  const baseStats = {};
  roster.forEach(stu => {
    baseStats[stu.no] = computeStudentRunningTotalsExcluding(asgId, stu.no, date, period);
  });

  const card = document.createElement('div');
  card.className = 'card';

  // ヘッダ
  const head = document.createElement('div');
  head.innerHTML = `
    <h3 style="margin-top:0;">${escape(getAssignmentLabel(asg))} ／ ${escape(fmtDate(date))}（${dayOfWeek(date)}） ${period}時間目 ${isEdit ? '<span class="legend-color s-official">登録済（編集）</span>' : ''}</h3>
  `;
  card.appendChild(head);

  // 出欠サマリは画面下部の固定バーへ移動したため、ここには出さない

  // 一括操作バー
  const bulk = document.createElement('div');
  bulk.className = 'bulk-bar';
  bulk.innerHTML = `
    <span class="label">一括操作:</span>
    <button data-bulk="出">全員 出席</button>
    <button data-bulk="公欠">全員 公欠</button>
    <button data-bulk="出停">全員 出停</button>
    <button data-bulk="忌引">全員 忌引</button>
    <button data-bulk="欠席">全員 欠席</button>
  `;
  card.appendChild(bulk);

  // 名簿テーブル
  const tbl = document.createElement('table');
  tbl.className = 'roster-table';
  tbl.innerHTML = `
    <thead><tr><th class="col-no">No.</th><th class="col-name">氏名</th><th class="col-status-btns">出欠</th></tr></thead>
  `;
  const tbody = document.createElement('tbody');
  roster.forEach(stu => {
    const tr = document.createElement('tr');
    tr.dataset.no = stu.no;
    const current = existing[stu.no] || '出';
    const liveStats = statsWithCurrentStatus(baseStats[stu.no], current, asg, date);
    const warnLevel = getCombinedWarnLevel(liveStats);
    tr.className = 'row-' + STATUS_CLASS[current];
    if (warnLevel) tr.classList.add('has-warning-' + warnLevel);
    tr.innerHTML = `
      <td class="col-no">${escape(stu.no)}</td>
      <td class="col-name">${escape(stu.name)}${getCombinedWarnBadges(liveStats)}</td>
      <td class="col-status-btns">
        <div class="status-btns" data-no="${escape(stu.no)}">
          ${STATUSES.map(st => `
            <button type="button" class="status-btn ${current === st ? 'active' : ''} s-${STATUS_CLASS[st]}" data-status="${st}">${st}</button>
          `).join('')}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  card.appendChild(tbl);

  // 画面下部固定バー：左側に出欠サマリ、右側に登録/削除ボタン
  const foot = document.createElement('div');
  foot.className = 'roster-action-bar';
  foot.innerHTML = `
    <div class="action-bar-summary attendance-summary"></div>
    <div class="action-bar-buttons">
      ${isEdit ? '<button class="danger" id="rosterDeleteBtn">この回を削除</button>' : ''}
      <button class="primary" id="rosterSaveBtn">💾 登録する</button>
    </div>
  `;
  card.appendChild(foot);
  area.appendChild(card);
  const summary = foot.querySelector('.action-bar-summary');

  // === ヘルパ：行の警告バッジを再描画 ===
  function refreshRowWarning(tr, no, status) {
    const live = statsWithCurrentStatus(baseStats[no], status, asg, date);
    tr.classList.remove('has-warning-warn','has-warning-danger','has-warning-critical');
    const lvl = getCombinedWarnLevel(live);
    if (lvl) tr.classList.add('has-warning-' + lvl);
    const nameCell = tr.querySelector('.col-name');
    // 全ての警告バッジを除去
    nameCell.querySelectorAll('.warn-badge').forEach(b => b.remove());
    const newBadgeHtml = getCombinedWarnBadges(live);
    if (newBadgeHtml) nameCell.insertAdjacentHTML('beforeend', newBadgeHtml);
  }

  // === ヘルパ：出欠サマリを再描画 ===
  function refreshSummary() {
    const counts = { '出': 0, '公欠': 0, '出停': 0, '忌引': 0, '欠席': 0 };
    tbody.querySelectorAll('tr').forEach(tr => {
      const active = tr.querySelector('.status-btn.active');
      counts[active ? active.dataset.status : '出']++;
    });
    const total = roster.length;
    const item = (st, label) =>
      `<span class="sum-item s-${STATUS_CLASS[st]} ${counts[st]>0?'has-count':''}"><span class="lbl">${label}</span><span class="cnt">${counts[st]}</span></span>`;
    summary.innerHTML =
      item('出','出席') +
      item('公欠','公欠') +
      item('出停','出停') +
      item('忌引','忌引') +
      item('欠席','欠席') +
      `<span class="sum-total">合計 ${total} 名</span>`;
  }
  refreshSummary();

  // 行クリック（個別変更）
  tbody.addEventListener('click', e => {
    const btn = e.target.closest('.status-btn');
    if (!btn) return;
    const wrap = btn.closest('.status-btns');
    const tr = btn.closest('tr');
    const status = btn.dataset.status;
    wrap.querySelectorAll('.status-btn').forEach(b => b.classList.toggle('active', b === btn));
    // 行カラー更新
    ['row-present','row-official','row-suspended','row-mourning','row-absent'].forEach(c => tr.classList.remove(c));
    tr.classList.add('row-' + STATUS_CLASS[status]);
    refreshRowWarning(tr, tr.dataset.no, status);
    refreshSummary();
  });

  // 一括操作
  bulk.addEventListener('click', e => {
    const b = e.target.closest('button[data-bulk]');
    if (!b) return;
    const status = b.dataset.bulk;
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
      });
      ['row-present','row-official','row-suspended','row-mourning','row-absent'].forEach(c => tr.classList.remove(c));
      tr.classList.add('row-' + STATUS_CLASS[status]);
      refreshRowWarning(tr, tr.dataset.no, status);
    });
    refreshSummary();
  });

  foot.addEventListener('click', e => {
    if (e.target.id === 'rosterSaveBtn') {
      const records = {};
      tbody.querySelectorAll('tr').forEach(tr => {
        const no = tr.dataset.no;
        const active = tr.querySelector('.status-btn.active');
        records[no] = active ? active.dataset.status : '出';
      });
      setAttendance(asgId, date, period, records);
      save();
      toast(`登録しました（${getAssignmentLabel(asg)} ${fmtDate(date)} ${period}時間目）`, 'success');
      loadRosterFor(targetAreaId, asgId, date, period);
      renderTodayRegisteredList();
    } else if (e.target.id === 'rosterDeleteBtn') {
      confirmDialog('削除確認', `${fmtDate(date)} ${period}時間目 の出欠データを削除します。よろしいですか？`, () => {
        deleteAttendance(asgId, date, period);
        save();
        toast('削除しました', 'success');
        loadRosterFor(targetAreaId, asgId, date, period);
        renderTodayRegisteredList();
      });
    }
  });
}

// =====================================================
// 過去入力ビュー
// =====================================================
function refreshPastView() {
  const prev = $('#past-assignment').value;
  fillAssignmentSelect($('#past-assignment'));
  if (prev && state.assignments.find(a => a.id === prev)) {
    $('#past-assignment').value = prev;
  }
  if (!$('#past-date').value) $('#past-date').value = todayStr();
  reloadPastRoster();
}

// =====================================================
// 一覧・編集ビュー
// =====================================================
function refreshListView() {
  fillAssignmentSelect($('#list-assignment'));
  if (!$('#list-from').value || !$('#list-to').value) {
    const d = new Date();
    const first = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-01`;
    $('#list-from').value = first;
    $('#list-to').value = todayStr();
  }
  $('#list-area').innerHTML = '';
}

function buildListMatrix() {
  const asgId = $('#list-assignment').value;
  const from = $('#list-from').value;
  const to = $('#list-to').value;
  const area = $('#list-area');
  area.innerHTML = '';

  if (!asgId) { area.innerHTML = '<p class="empty-msg">担当授業を選択してください。</p>'; return; }
  const asg = state.assignments.find(a => a.id === asgId);
  if (!asg) return;
  const roster = state.rosters[asgId] || [];
  if (roster.length === 0) {
    area.innerHTML = '<p class="empty-msg">名簿が未登録です。「⚙️ 登録情報」タブから登録してください。</p>';
    return;
  }

  // 出欠データから (date, period) を抽出（範囲フィルタ）
  const attData = state.attendance[asgId] || {};
  const cols = [];
  Object.keys(attData).sort().forEach(date => {
    if (from && date < from) return;
    if (to && date > to) return;
    Object.keys(attData[date]).sort((a,b)=>+a-+b).forEach(period => {
      cols.push({ date, period });
    });
  });

  if (cols.length === 0) {
    area.innerHTML = `<div class="card"><p class="empty-msg">指定期間に入力済みデータがありません。</p></div>`;
    return;
  }

  // テーブル組立
  const wrap = document.createElement('div');
  wrap.className = 'list-wrap';
  const tbl = document.createElement('table');
  tbl.className = 'list-table';

  // ヘッダ：日付行 + 時限行
  const thead = document.createElement('thead');
  let dateRow = '<tr><th class="sticky-col-no" rowspan="2">No</th><th class="sticky-col-name" rowspan="2">氏名</th>';
  let periodRow = '<tr>';
  // 日付ごとにspanまとめ
  let i = 0;
  while (i < cols.length) {
    const date = cols[i].date;
    let span = 1;
    while (i + span < cols.length && cols[i+span].date === date) span++;
    dateRow += `<th class="day-header" colspan="${span}">${escape(date.slice(5))}（${dayOfWeek(date)}）</th>`;
    for (let k=0; k<span; k++) {
      periodRow += `<th class="period-header">${cols[i+k].period}限</th>`;
    }
    i += span;
  }
  dateRow += '</tr>';
  periodRow += '</tr>';
  thead.innerHTML = dateRow + periodRow;
  tbl.appendChild(thead);

  const tbody = document.createElement('tbody');
  roster.forEach(stu => {
    const tr = document.createElement('tr');
    let html = `<td class="sticky-col-no">${escape(stu.no)}</td><td class="sticky-col-name clickable" data-no="${escape(stu.no)}" title="クリックで履歴を表示">${escape(stu.name)}</td>`;
    cols.forEach(({date,period}) => {
      const st = attData[date][period][stu.no] || '出';
      const cls = STATUS_CLASS[st];
      const label = st === '出' ? '○' : st;
      html += `<td class="cell-edit cell-${cls}" data-date="${date}" data-period="${period}" data-no="${escape(stu.no)}" title="${escape(stu.name)} ${fmtDate(date)} ${period}限：${st}">${label}</td>`;
    });
    tr.innerHTML = html;
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  wrap.appendChild(tbl);

  // 統計
  const info = document.createElement('div');
  info.className = 'card';
  info.innerHTML = `<p class="hint">📌 ${escape(getAssignmentLabel(asg))} ／ ${fmtDate(from)} 〜 ${fmtDate(to)} ／ 全 ${cols.length} 回 ／ 名簿 ${roster.length} 名</p>`;
  area.appendChild(info);
  area.appendChild(wrap);

  // クリックで編集 / 氏名クリックで履歴
  tbody.addEventListener('click', e => {
    const nameCell = e.target.closest('td.sticky-col-name.clickable');
    if (nameCell) {
      openStudentHistory(asgId, nameCell.dataset.no);
      return;
    }
    const td = e.target.closest('td.cell-edit');
    if (!td) return;
    openCellEdit(asgId, td.dataset.date, +td.dataset.period);
  });
}

// セル編集モーダル
function openCellEdit(asgId, date, period) {
  const asg = state.assignments.find(a => a.id === asgId);
  const roster = state.rosters[asgId] || [];
  const existing = getAttendance(asgId, date, period) || {};
  const modal = $('#cell-edit-modal');
  $('#cell-edit-title').innerHTML = `📝 ${escape(getAssignmentLabel(asg))} ／ ${fmtDate(date)}（${dayOfWeek(date)}） ${period}時間目`;
  const body = $('#cell-edit-body');
  body.innerHTML = '';
  const bulk = document.createElement('div');
  bulk.className = 'bulk-bar';
  bulk.innerHTML = `
    <span class="label">一括:</span>
    <button data-bulk="出">全員 出席</button>
    <button data-bulk="公欠">全員 公欠</button>
    <button data-bulk="出停">全員 出停</button>
    <button data-bulk="忌引">全員 忌引</button>
    <button data-bulk="欠席">全員 欠席</button>
  `;
  body.appendChild(bulk);

  const tbl = document.createElement('table');
  tbl.className = 'roster-table';
  tbl.innerHTML = `<thead><tr><th class="col-no">No.</th><th class="col-name">氏名</th><th class="col-status-btns">出欠</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  roster.forEach(stu => {
    const current = existing[stu.no] || '出';
    const tr = document.createElement('tr');
    tr.dataset.no = stu.no;
    tr.className = 'row-' + STATUS_CLASS[current];
    tr.innerHTML = `
      <td class="col-no">${escape(stu.no)}</td>
      <td class="col-name">${escape(stu.name)}</td>
      <td class="col-status-btns">
        <div class="status-btns">
          ${STATUSES.map(st => `<button type="button" class="status-btn ${current===st?'active':''} s-${STATUS_CLASS[st]}" data-status="${st}">${st}</button>`).join('')}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  body.appendChild(tbl);

  tbody.onclick = e => {
    const b = e.target.closest('.status-btn');
    if (!b) return;
    const tr = b.closest('tr');
    const wrap = b.closest('.status-btns');
    wrap.querySelectorAll('.status-btn').forEach(x => x.classList.toggle('active', x === b));
    tr.className = 'row-' + STATUS_CLASS[b.dataset.status];
  };
  bulk.onclick = e => {
    const b = e.target.closest('button[data-bulk]');
    if (!b) return;
    const status = b.dataset.bulk;
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.querySelectorAll('.status-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.status === status));
      tr.className = 'row-' + STATUS_CLASS[status];
    });
  };

  $('#cell-edit-save').onclick = () => {
    const records = {};
    tbody.querySelectorAll('tr').forEach(tr => {
      const active = tr.querySelector('.status-btn.active');
      records[tr.dataset.no] = active ? active.dataset.status : '出';
    });
    setAttendance(asgId, date, period, records);
    save();
    toast('更新しました', 'success');
    closeCellEdit();
    buildListMatrix();
  };
  $('#cell-edit-delete').onclick = () => {
    confirmDialog('削除確認', `${fmtDate(date)} ${period}時間目 の出欠データを削除します。よろしいですか？`, () => {
      deleteAttendance(asgId, date, period);
      save();
      toast('削除しました', 'success');
      closeCellEdit();
      buildListMatrix();
    });
  };
  $('#cell-edit-cancel').onclick = closeCellEdit;
  modal.classList.remove('hidden');
}
function closeCellEdit() { $('#cell-edit-modal').classList.add('hidden'); }

// =====================================================
// 集計・コピービュー
// =====================================================
function refreshExportView() {
  fillAssignmentSelect($('#export-assignment'));
  if (!$('#export-from').value || !$('#export-to').value) {
    const d = new Date();
    const first = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-01`;
    $('#export-from').value = first;
    $('#export-to').value = todayStr();
  }
  $('#export-area').innerHTML = '';
}

function buildExportTable() {
  const asgId = $('#export-assignment').value;
  const from = $('#export-from').value;
  const to = $('#export-to').value;
  const area = $('#export-area');
  area.innerHTML = '';

  if (!asgId) { area.innerHTML = '<p class="empty-msg">担当授業を選択してください。</p>'; return; }
  const asg = state.assignments.find(a => a.id === asgId);
  const roster = state.rosters[asgId] || [];
  if (roster.length === 0) {
    area.innerHTML = '<p class="empty-msg">名簿が未登録です。</p>';
    return;
  }

  // 期間内の (date, period) 列挙
  const attData = state.attendance[asgId] || {};
  const sessions = []; // {date, period}
  Object.keys(attData).sort().forEach(date => {
    if (from && date < from) return;
    if (to && date > to) return;
    Object.keys(attData[date]).sort((a,b)=>+a-+b).forEach(period => {
      sessions.push({ date, period });
    });
  });

  const totalClasses = sessions.length;

  // 生徒ごとの集計
  // 授業数 = 期間内の総実施回数 −（その生徒の 出停 + 忌引）
  // ※ 出停・忌引は「授業として数えない」扱い
  const rows = roster.map(stu => {
    const counts = { '公欠': 0, '出停': 0, '忌引': 0, '欠席': 0 };
    sessions.forEach(({date, period}) => {
      const st = attData[date][period][stu.no];
      if (st && counts[st] !== undefined) counts[st]++;
    });
    const classes = totalClasses - counts['出停'] - counts['忌引'];
    return { no: stu.no, name: stu.name, classes, ...counts };
  });

  // テーブル
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <h3 style="margin-top:0;">${escape(getAssignmentLabel(asg))}</h3>
    <div class="print-header">
      <strong>${escape(getAssignmentLabel(asg))}</strong> ／
      ${fmtDate(from)} 〜 ${fmtDate(to)} ／
      総実施 ${totalClasses} 回 ／ 名簿 ${roster.length} 名
    </div>
    <p class="hint">期間: ${fmtDate(from)} 〜 ${fmtDate(to)} ／ 期間内の総実施回数 <strong>${totalClasses}</strong> 回 ／ 名簿 ${roster.length} 名<br>
    ※「授業数」列は <strong>総実施回数 − 出停 − 忌引</strong> で算出（出停・忌引は授業として数えません）</p>
  `;
  if (totalClasses === 0) {
    card.innerHTML += '<p class="empty-msg">期間内に入力済みデータがありません。</p>';
    area.appendChild(card);
    return;
  }

  const tbl = document.createElement('table');
  tbl.className = 'export-table';
  tbl.innerHTML = `
    <thead>
      <tr>
        <th class="col-no">No</th>
        <th class="col-name">氏名</th>
        <th>授業数</th>
        <th>公欠</th>
        <th>出停</th>
        <th>忌引</th>
        <th>欠席</th>
      </tr>
      <tr class="total-row">
        <td colspan="2" style="text-align:right;">📋 列ごとコピー →</td>
        <td><button class="copy-btn" data-col="classes">授業数</button></td>
        <td><button class="copy-btn" data-col="公欠">公欠</button></td>
        <td><button class="copy-btn" data-col="出停">出停</button></td>
        <td><button class="copy-btn" data-col="忌引">忌引</button></td>
        <td><button class="copy-btn" data-col="欠席">欠席</button></td>
      </tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escape(r.no)}</td>
      <td class="col-name">${escape(r.name)}</td>
      <td>${r.classes}</td>
      <td>${r['公欠'] || ''}</td>
      <td>${r['出停'] || ''}</td>
      <td>${r['忌引'] || ''}</td>
      <td>${r['欠席'] || ''}</td>
    `;
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);

  card.appendChild(tbl);

  // 一括コピー
  const bulk = document.createElement('div');
  bulk.style.marginTop = '12px';
  bulk.innerHTML = `
    <button class="copy-btn" data-col="all" style="padding:8px 16px; font-size:13px;">📋 全項目を表ごとコピー（名簿順・タブ区切り）</button>
    <span class="hint" style="margin-left:8px;">Excelに貼り付けると 氏名・授業数・公欠・出停・忌引・欠席 の表として貼り付けられます。</span>
  `;
  card.appendChild(bulk);

  area.appendChild(card);

  // コピー処理
  card.addEventListener('click', e => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const col = btn.dataset.col;
    let text = '';
    if (col === 'all') {
      const lines = ['No\t氏名\t授業数\t公欠\t出停\t忌引\t欠席'];
      rows.forEach(r => {
        lines.push([r.no, r.name, r.classes, r['公欠']||0, r['出停']||0, r['忌引']||0, r['欠席']||0].join('\t'));
      });
      text = lines.join('\n');
    } else if (col === 'classes') {
      text = rows.map(r => r.classes).join('\n');
    } else {
      text = rows.map(r => r[col] || 0).join('\n');
    }
    copyToClipboard(text, col === 'all' ? '表全体をコピーしました' : `「${col === 'classes' ? '授業数' : col}」列をコピーしました（${rows.length}件）`);
  });
}

function copyToClipboard(text, msg='コピーしました') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => toast(msg, 'success'),
      () => fallbackCopy(text, msg)
    );
  } else {
    fallbackCopy(text, msg);
  }
}
function fallbackCopy(text, msg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.left='-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast(msg, 'success'); }
  catch(e) { toast('コピーに失敗しました', 'error'); }
  document.body.removeChild(ta);
}

// =====================================================
// 担当授業（設定）ビュー
// =====================================================
function refreshSetupView() {
  $('#setup-year').value = state.year;
  $('#year-info').textContent = `${state.year}年度`;
  if ($('#add-class').children.length === 0) fillClassLetterSelect($('#add-class'));
  renderAssignmentsTable();
}
function renderAssignmentsTable() {
  const tbody = $('#assignments-tbody');
  tbody.innerHTML = '';
  if (state.assignments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-msg">担当授業が登録されていません。<br>上のフォームから追加してください。</td></tr>`;
    return;
  }
  state.assignments.forEach(a => {
    const roster = state.rosters[a.id] || [];
    const th = a.termHours || { 1: '', 2: '', 3: '' };
    const total = getAnnualHours(a);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escape(a.grade)}年</td>
      <td>${escape(a.class)}</td>
      <td>${escape(a.subject)}</td>
      <td class="term-hours-cell"><input type="number" class="term-hours-input" data-id="${a.id}" data-term="1" min="0" max="999" value="${escape(th[1] ?? '')}" placeholder="-"></td>
      <td class="term-hours-cell"><input type="number" class="term-hours-input" data-id="${a.id}" data-term="2" min="0" max="999" value="${escape(th[2] ?? '')}" placeholder="-"></td>
      <td class="term-hours-cell"><input type="number" class="term-hours-input" data-id="${a.id}" data-term="3" min="0" max="999" value="${escape(th[3] ?? '')}" placeholder="-"></td>
      <td class="term-total-cell ${total > 0 ? 'has-hours' : ''}">${total > 0 ? total : '-'}</td>
      <td>
        <button class="roster-btn" data-act="roster" data-id="${a.id}">
          ${roster.length > 0 ? `📝 編集（${roster.length}名）` : '＋ 登録'}
        </button>
      </td>
      <td><button class="danger delete-btn" data-act="delete" data-id="${a.id}">削除</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// 名簿モーダル
let rosterModalAsgId = null;
let rosterModalData = []; // [{ name }]
function openRosterModal(asgId) {
  rosterModalAsgId = asgId;
  const asg = state.assignments.find(a => a.id === asgId);
  $('#roster-modal-title').textContent = `📝 ${getAssignmentLabel(asg)} の名簿`;
  const existing = state.rosters[asgId] || [];
  rosterModalData = existing.map(r => ({ name: r.name }));
  renderRosterRows();
  $('#roster-modal').classList.remove('hidden');
  // 最初の入力欄にフォーカス
  setTimeout(() => {
    const first = $('#roster-rows-area .name-input');
    if (first) first.focus();
  }, 50);
}
function closeRosterModal() {
  $('#roster-modal').classList.add('hidden');
  rosterModalAsgId = null;
  rosterModalData = [];
}

// テキストから氏名のリストを抽出。番号や区切り文字は自動で除去する。
// 対応する代表的なフォーマット:
//   1\t山田太郎   /   1,山田太郎   /   1. 山田太郎   /   1 山田太郎   /   1:山田太郎
//   山田太郎   /   山田 太郎   （番号なし、氏名のみ）
//   1\t山田太郎\t補足列    （3列目以降は無視）
function parseNamesFromText(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const names = [];
  lines.forEach(line => {
    // まずタブ/カンマ系区切りで分割
    const parts = line.split(/[\t,、，]+/).map(s => s.trim()).filter(Boolean);
    let name = '';
    if (parts.length >= 2 && /^[0-9０-９]+$/.test(parts[0])) {
      // 「番号<タブ>氏名(<タブ>...)」→ 2要素目を氏名として採用
      name = parts[1];
    } else {
      // 区切りなし or 数字始まりでない
      // 1要素目に対し「先頭の数字＋区切り(.,:,空白)」を剥がす
      const first = parts[0] || '';
      const m = first.match(/^[0-9０-９]+[\.\:\s]+(.+)$/);
      name = m ? m[1] : first;
    }
    name = name && name.trim();
    if (name) names.push(name);
  });
  return names;
}

// データ末尾に「空の入力欄」が無ければ追加（次の生徒を入力できるように）
function ensureTrailingEmptyRow() {
  if (rosterModalData.length === 0 || rosterModalData[rosterModalData.length - 1].name.trim() !== '') {
    rosterModalData.push({ name: '' });
  }
}

function updateRosterCount() {
  const filled = rosterModalData.filter(r => r.name.trim() !== '').length;
  $('#roster-count-info').textContent = `${filled}名`;
}

function renderRosterRows() {
  const area = $('#roster-rows-area');
  area.innerHTML = '';
  ensureTrailingEmptyRow();
  rosterModalData.forEach((r, idx) => {
    area.appendChild(buildRosterRowEl(idx, r.name));
  });
  updateRosterCount();
}

function buildRosterRowEl(idx, name) {
  const row = document.createElement('div');
  row.className = 'roster-row';
  row.dataset.idx = idx;
  const isEmpty = !name || !name.trim();
  row.innerHTML = `
    <span class="no-label">${idx + 1}</span>
    <input type="text" class="name-input ${isEmpty ? 'empty-row' : ''}" value="${escape(name)}" placeholder="氏名を入力（貼り付け可）">
    <button type="button" class="row-del" title="削除">×</button>
  `;
  return row;
}

function bindRosterRowsArea() {
  const area = $('#roster-rows-area');

  // 入力 → データ反映 + 末尾に名前が入ったら次の行を自動追加
  area.addEventListener('input', e => {
    const input = e.target.closest('.name-input');
    if (!input) return;
    const row = input.closest('.roster-row');
    const idx = +row.dataset.idx;
    rosterModalData[idx].name = input.value;
    input.classList.toggle('empty-row', input.value.trim() === '');

    // 末尾の行に文字が入ったら新しい空行を追加
    const isLast = idx === rosterModalData.length - 1;
    if (isLast && input.value.trim() !== '') {
      rosterModalData.push({ name: '' });
      area.appendChild(buildRosterRowEl(idx + 1, ''));
    }
    updateRosterCount();
  });

  // 貼り付け → 複数行ならパースしてその位置から流し込み
  area.addEventListener('paste', e => {
    const input = e.target.closest('.name-input');
    if (!input) return;
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const names = parseNamesFromText(text);
    if (names.length <= 1) return; // 1件以下は通常の貼り付けに任せる
    e.preventDefault();
    const row = input.closest('.roster-row');
    const startIdx = +row.dataset.idx;
    applyNamesFromIndex(startIdx, names);
    toast(`${names.length}名を貼り付けました`, 'success');
  });

  // Enter → 次の行へフォーカス移動
  area.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const input = e.target.closest('.name-input');
    if (!input) return;
    e.preventDefault();
    const row = input.closest('.roster-row');
    const idx = +row.dataset.idx;
    // 入力が空でない & 末尾 → 末尾の自動行追加は input イベントで済んでいるはず
    const nextInput = area.querySelector(`.roster-row[data-idx="${idx + 1}"] .name-input`);
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  });

  // 削除ボタン
  area.addEventListener('click', e => {
    const btn = e.target.closest('.row-del');
    if (!btn) return;
    const row = btn.closest('.roster-row');
    const idx = +row.dataset.idx;
    // 唯一の空行は削除しない
    if (rosterModalData.length <= 1 && !rosterModalData[0].name.trim()) return;
    rosterModalData.splice(idx, 1);
    renderRosterRows();
  });
}

function applyNamesFromIndex(startIdx, names) {
  // startIdx から名前を順に書き込む。足りない分は末尾に追加。
  // 既存のリストは startIdx 以降のみ置き換え（前は維持）
  // 末尾の空行は無視
  const before = rosterModalData.slice(0, startIdx);
  const newRows = names.map(n => ({ name: n }));
  rosterModalData = before.concat(newRows);
  renderRosterRows();
}

// =====================================================
// 年度更新ウィザード（5ステップ）
// =====================================================
let wizardStep = 1;
const wizardApplied = { step2: false, step3: false, step4: false };
let wizardCommit = null;          // 各ステップの「次へ」押下時に実行するハンドラ
const wizardData = {
  archiveOption: null,            // 'archive' | 'skip' | null（step2）
  newYear: '',                    // step3
  pendingRows: [],                // step3：{tempId, grade, class, subject}
  createdAssignmentIds: [],       // step3コミット後に保持（step4で使用）
};

const WIZARD_STEPS = [
  { id: 1, label: 'ようこそ' },
  { id: 2, label: 'アーカイブ' },
  { id: 3, label: '新年度・担当授業' },
  { id: 4, label: '名簿登録' },
  { id: 5, label: '完了' },
];

function refreshYearUpdateView() {
  renderWizard();
  renderArchivesList();
}

function resetWizardOnFinish() {
  wizardStep = 1;
  Object.keys(wizardApplied).forEach(k => wizardApplied[k] = false);
  wizardData.archiveOption = null;
  wizardData.newYear = '';
  wizardData.pendingRows = [];
  wizardData.createdAssignmentIds = [];
}

function renderWizard() {
  // プログレスバー
  const progEl = $('#wizard-progress');
  progEl.innerHTML = '';
  WIZARD_STEPS.forEach(s => {
    let cls = '';
    if (s.id === wizardStep) cls = 'active';
    else if (s.id < wizardStep) cls = 'done';
    const el = document.createElement('div');
    el.className = 'step ' + cls;
    el.dataset.step = s.id;
    el.innerHTML = `<span class="step-num">${s.id}.</span>${escape(s.label)}`;
    el.onclick = () => { wizardStep = +el.dataset.step; renderWizard(); };
    progEl.appendChild(el);
  });

  wizardCommit = null;
  const c = $('#wizard-content');
  c.innerHTML = '';
  if (wizardStep === 1) renderWizStep1(c);
  else if (wizardStep === 2) renderWizStep2(c);
  else if (wizardStep === 3) renderWizStep3(c);
  else if (wizardStep === 4) renderWizStep4(c);
  else if (wizardStep === 5) renderWizStep5(c);

  // ナビゲーション制御
  const back = $('#wizard-back');
  const skip = $('#wizard-skip');
  const next = $('#wizard-next');
  back.disabled = (wizardStep === 1);
  skip.style.display = (wizardStep === 1 || wizardStep === 5) ? 'none' : '';
  if (wizardStep === 5) {
    next.textContent = '🎉 終了する';
  } else {
    next.textContent = '次へ ▶';
  }
}

// ===== Step 1: ようこそ =====
function renderWizStep1(c) {
  const asgN = state.assignments.length;
  const rosN = Object.values(state.rosters || {}).reduce((sum, r) => sum + (r?.length || 0), 0);
  const attDays = Object.values(state.attendance || {}).reduce((s, byAsg) => s + Object.keys(byAsg).length, 0);
  c.innerHTML = `
    <h3>① ようこそ</h3>
    <div class="wizard-current-info">
      <strong>現在の年度：</strong> ${escape(state.year)}年度<br>
      <strong>担当授業：</strong> ${asgN}件 ／ <strong>名簿合計：</strong> ${rosN}名 ／ <strong>出欠データのある授業日数（重複あり）：</strong> ${attDays}件
    </div>
    <p>次のステップで進めます：</p>
    <ol style="line-height:1.9;">
      <li><strong>② アーカイブ</strong> ── 現在の年度の全データをスナップショットとして保存します（推奨）</li>
      <li><strong>③ 新年度・担当授業</strong> ── 新しい年度番号と、複数の担当授業をまとめて登録します</li>
      <li><strong>④ 名簿登録</strong> ── ③で登録した各授業の名簿を順番に登録します</li>
      <li><strong>⑤ 完了</strong> ── 概要を確認して終了します</li>
    </ol>
    <p class="hint">途中で中断しても、続きから再開できます。各ステップは「スキップ」も可能です。</p>
  `;
}

// ===== Step 2: アーカイブ =====
function renderWizStep2(c) {
  c.innerHTML = `
    <h3>② 現在の年度をアーカイブ ${wizardApplied.step2 ? '<span class="wizard-applied">✓ 実行済</span>' : ''}</h3>
    <p class="hint">新年度に切り替える前に、現在の <strong>${escape(state.year)}年度</strong> の全データをアーカイブとして保存することを推奨します。<br>
    アーカイブは「📂 アーカイブ一覧」（下部）からいつでも閲覧・ダウンロードできます。</p>
    <div class="wizard-choice-block" id="wiz-arc-do">
      <h4>📦 アーカイブして次へ進む（推奨）</h4>
      <div style="margin:6px 0;">
        <label>アーカイブ名（任意）:
          <input type="text" id="wiz-arc-name" placeholder="例: ${escape(state.year)}年度（年度更新時）" style="width: 260px;">
        </label>
      </div>
    </div>
    <div class="wizard-choice-block" id="wiz-arc-skip">
      <h4>⏭ アーカイブせず次へ進む</h4>
      <p class="hint">既にバックアップ済み、または保存不要な場合に。</p>
    </div>
  `;
  const apply = (opt) => {
    wizardData.archiveOption = opt;
    $('#wiz-arc-do').classList.toggle('selected', opt === 'archive');
    $('#wiz-arc-skip').classList.toggle('selected', opt === 'skip');
  };
  $('#wiz-arc-do').onclick = () => apply('archive');
  $('#wiz-arc-skip').onclick = () => apply('skip');
  if (wizardData.archiveOption) apply(wizardData.archiveOption);

  wizardCommit = () => {
    if (!wizardData.archiveOption) {
      toast('「アーカイブする / しない」を選択してください', 'error');
      return false;
    }
    if (wizardData.archiveOption === 'archive') {
      const name = $('#wiz-arc-name').value.trim() || `${state.year}年度（年度更新時）`;
      const arc = createArchive(name);
      toast(`アーカイブ「${arc.name}」を保存しました`, 'success');
    }
    wizardApplied.step2 = true;
    return true;
  };
}

// ===== Step 3: 新年度・担当授業の登録 =====
function ensureWizPendingTrailingRow() {
  const last = wizardData.pendingRows[wizardData.pendingRows.length - 1];
  if (!last || (last.subject || '').trim() !== '') {
    // 未選択状態（プレースホルダ表示）で追加
    wizardData.pendingRows.push({ tempId: uid(), grade: '', class: '', subject: '' });
  }
}
function renderWizStep3(c) {
  // 初期化
  if (!wizardData.newYear) wizardData.newYear = String(+state.year + 1);
  if (wizardData.pendingRows.length === 0) ensureWizPendingTrailingRow();

  c.innerHTML = `
    <h3>③ 新年度と担当授業をまとめて登録 ${wizardApplied.step3 ? '<span class="wizard-applied">✓ 適用済</span>' : ''}</h3>
    <p class="hint">⚠️ 「次へ」を押すと、現在の担当授業・名簿・出欠データは <strong>全て初期化</strong> されます（アーカイブ済みでも、現データは消えます）。<br>
    複数の担当授業を一度にまとめて入力できます。授業名を入力すると次の行が自動で増えます。</p>
    <div class="wizard-current-info">
      <label>新しい年度:
        <input type="number" id="wiz-new-year" min="2020" max="2099" value="${escape(wizardData.newYear)}" style="width: 110px;">
      </label>
      <span style="margin-left:14px;">（現在: ${escape(state.year)}年度）</span>
    </div>
    <table class="wiz-asg-table">
      <thead>
        <tr>
          <th class="col-grade">学年</th>
          <th class="col-class">クラス</th>
          <th class="col-subject">授業名</th>
          <th class="col-del"></th>
        </tr>
      </thead>
      <tbody id="wiz-asg-tbody"></tbody>
    </table>
    <div class="row">
      <button type="button" id="wiz-asg-add">＋ 行を追加</button>
      <span id="wiz-asg-count" class="hint"></span>
    </div>
  `;

  const tbody = $('#wiz-asg-tbody');
  const renderRows = () => {
    tbody.innerHTML = '';
    ensureWizPendingTrailingRow();
    wizardData.pendingRows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.idx = idx;
      const isEmpty = !(row.subject || '').trim();
      if (isEmpty) tr.classList.add('wiz-row-empty');
      tr.innerHTML = `
        <td class="col-grade">
          <select data-field="grade" class="${row.grade ? '' : 'is-placeholder'}">
            <option value="" disabled hidden ${!row.grade ? 'selected' : ''}>学年を選択</option>
            ${[1,2,3].map(n => `<option value="${n}" ${String(row.grade)===String(n)?'selected':''}>${n}年</option>`).join('')}
          </select>
        </td>
        <td class="col-class">
          <select data-field="class" class="${row.class ? '' : 'is-placeholder'}">
            <option value="" disabled hidden ${!row.class ? 'selected' : ''}>クラスを選択</option>
            ${CLASS_LETTERS.map(l => `<option value="${escape(l)}" ${row.class===l?'selected':''}>${escape(l==='混在'?'混在':l+'組')}</option>`).join('')}
          </select>
        </td>
        <td class="col-subject">
          <input type="text" data-field="subject" value="${escape(row.subject||'')}" placeholder="授業名を入力（貼り付け可）">
        </td>
        <td class="col-del">
          <button type="button" class="wiz-row-del" title="削除">×</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    const filled = wizardData.pendingRows.filter(r => (r.subject||'').trim() !== '').length;
    $('#wiz-asg-count').textContent = `入力済み ${filled}件`;
  };
  renderRows();

  tbody.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('select, input')) {
      const tr = t.closest('tr');
      const idx = +tr.dataset.idx;
      wizardData.pendingRows[idx][t.dataset.field] = t.value;
      if (t.dataset.field === 'subject') {
        tr.classList.toggle('wiz-row-empty', t.value.trim() === '');
        // 末尾行に文字が入ったら次行を追加
        const isLast = idx === wizardData.pendingRows.length - 1;
        if (isLast && t.value.trim() !== '') {
          wizardData.pendingRows.push({ tempId: uid(), grade: '', class: '', subject: '' });
          renderRows();
          // フォーカス維持のため少し遅らせて元に戻す
          setTimeout(() => {
            const sameRow = tbody.querySelector(`tr[data-idx="${idx}"] input[data-field="subject"]`);
            if (sameRow) {
              sameRow.focus();
              sameRow.setSelectionRange(sameRow.value.length, sameRow.value.length);
            }
          }, 0);
        }
        const filled = wizardData.pendingRows.filter(r => (r.subject||'').trim() !== '').length;
        $('#wiz-asg-count').textContent = `入力済み ${filled}件`;
      }
    }
  });
  tbody.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('select')) {
      const tr = t.closest('tr');
      const idx = +tr.dataset.idx;
      wizardData.pendingRows[idx][t.dataset.field] = t.value;
      // プレースホルダ表示の解除
      t.classList.toggle('is-placeholder', !t.value);
    }
  });
  tbody.addEventListener('click', e => {
    const del = e.target.closest('.wiz-row-del');
    if (!del) return;
    const tr = del.closest('tr');
    const idx = +tr.dataset.idx;
    if (wizardData.pendingRows.length <= 1) {
      wizardData.pendingRows[idx] = { tempId: uid(), grade: '', class: '', subject: '' };
    } else {
      wizardData.pendingRows.splice(idx, 1);
    }
    renderRows();
  });
  $('#wiz-asg-add').onclick = () => {
    wizardData.pendingRows.push({ tempId: uid(), grade: '', class: '', subject: '' });
    renderRows();
  };
  $('#wiz-new-year').addEventListener('input', e => {
    wizardData.newYear = e.target.value;
  });

  wizardCommit = async () => {
    const ny = (wizardData.newYear || '').trim();
    if (!ny || isNaN(+ny)) { toast('新しい年度を入力してください', 'error'); return false; }
    const filledRows = wizardData.pendingRows
      .map(r => ({ ...r, subject: (r.subject||'').trim() }))
      .filter(r => r.subject !== '');
    if (filledRows.length === 0) { toast('担当授業を1件以上入力してください', 'error'); return false; }
    // 学年・クラス未選択チェック
    const incomplete = filledRows.find(r => !r.grade || !r.class);
    if (incomplete) {
      toast(`「${incomplete.subject}」の学年・クラスを選択してください`, 'error');
      return false;
    }
    // 重複チェック
    const seen = new Set();
    for (const r of filledRows) {
      const key = `${r.grade}|${r.class}|${r.subject}`;
      if (seen.has(key)) {
        toast(`重複: ${r.grade}年${r.class==='混在'?'混在':r.class+'組'}${r.subject}`, 'error');
        return false;
      }
      seen.add(key);
    }
    // 確認ダイアログ（async版）
    const msg =
      `現在の ${state.year}年度のデータを全て初期化し、${ny}年度に切り替えます。\n\n` +
      `・担当授業: ${filledRows.length}件 を新規登録\n` +
      `・名簿・出欠データは空になります\n` +
      (wizardData.archiveOption !== 'archive'
        ? '\n⚠️ 今回のウィザードで「アーカイブ」を実行していません。本当に進めますか？\n'
        : '') +
      `\nよろしいですか？`;
    const ok = await confirmDialogAsync('新年度への切替確認', msg);
    if (!ok) return false;
    // 実行：データ初期化 → 年度更新 → 担当授業を一括追加
    state.year = String(+ny);
    state.assignments = [];
    state.rosters = {};
    state.attendance = {};
    wizardData.createdAssignmentIds = [];
    filledRows.forEach(r => {
      const id = uid();
      state.assignments.push({
        id, year: state.year, grade: +r.grade, class: r.class, subject: r.subject,
        termHours: { 1: '', 2: '', 3: '' },
      });
      wizardData.createdAssignmentIds.push(id);
    });
    save();
    $('#year-info').textContent = `${state.year}年度`;
    wizardApplied.step3 = true;
    toast(`${state.year}年度に切替・担当授業 ${filledRows.length}件 を登録しました`, 'success');
    return true;
  };
}

// ===== Step 4: 名簿登録 =====
function renderWizStep4(c) {
  // step3を実行済の場合は createdAssignmentIds、未実行なら現在の全担当授業
  const targetIds = wizardApplied.step3 && wizardData.createdAssignmentIds.length
    ? wizardData.createdAssignmentIds
    : state.assignments.map(a => a.id);
  const targets = targetIds.map(id => state.assignments.find(a => a.id === id)).filter(Boolean);

  c.innerHTML = `
    <h3>④ 各クラスの名簿を登録 ${wizardApplied.step4 ? '<span class="wizard-applied">✓ 完了</span>' : ''}</h3>
    <p class="hint">下記の各授業の「名簿登録」ボタンを押して、生徒名簿を登録してください。<br>
    すべて登録しなくても次へ進めます。後から「⚙️ 登録情報」タブで追加・修正できます。</p>
    <div class="wiz-roster-list" id="wiz-roster-list"></div>
  `;

  const renderList = () => {
    const list = $('#wiz-roster-list');
    list.innerHTML = '';
    if (targets.length === 0) {
      list.innerHTML = '<p class="empty-msg">対象の担当授業がありません。</p>';
      return;
    }
    targets.forEach(asg => {
      const rosCount = state.rosters[asg.id]?.length || 0;
      const item = document.createElement('div');
      item.className = 'wiz-roster-item' + (rosCount > 0 ? ' has-roster' : '');
      item.innerHTML = `
        <span class="wiz-roster-label">${escape(getAssignmentLabel(asg))}</span>
        <span class="wiz-roster-status">${rosCount > 0 ? `✓ ${rosCount}名 登録済` : '未登録'}</span>
        <button data-id="${asg.id}" class="${rosCount > 0 ? '' : 'primary'}">${rosCount > 0 ? '📝 編集' : '📋 名簿登録'}</button>
      `;
      list.appendChild(item);
    });
    list.onclick = e => {
      const btn = e.target.closest('button[data-id]');
      if (!btn) return;
      openRosterModal(btn.dataset.id);
      // モーダル保存→閉じた後にリスト再描画されるよう、保存ボタンに監視を仕込まないと無理。
      // 代替策：モーダル閉鎖を監視せず、フォーカス戻り時に再描画する
      const checkInterval = setInterval(() => {
        if ($('#roster-modal').classList.contains('hidden')) {
          clearInterval(checkInterval);
          renderList();
        }
      }, 400);
    };
  };
  renderList();

  wizardCommit = () => {
    wizardApplied.step4 = true;
    return true;
  };
}

// ===== Step 5: 完了 =====
function renderWizStep5(c) {
  const asgN = state.assignments.length;
  const rosN = state.assignments.filter(a => (state.rosters[a.id]?.length || 0) > 0).length;
  c.innerHTML = `
    <h3>⑤ 完了</h3>
    <div class="wizard-current-info">
      🎉 <strong>${escape(state.year)}年度</strong> の準備が完了しました。
    </div>
    <h4>登録内容のまとめ</h4>
    <ul>
      <li>年度: <strong>${escape(state.year)}年度</strong></li>
      <li>担当授業: <strong>${asgN}件</strong></li>
      <li>名簿登録済の授業: <strong>${rosN}件 / ${asgN}件</strong></li>
      ${wizardApplied.step2 ? '<li>✓ 前年度のアーカイブを保存しました</li>' : ''}
    </ul>
    <p class="hint">「🎉 終了する」を押すと当日入力タブへ移動します。<br>
    名簿が未登録の授業は「⚙️ 登録情報」タブから後で登録できます。</p>
  `;
  wizardCommit = () => {
    resetWizardOnFinish();
    showView('today');
    toast('年度更新が完了しました', 'success');
    return true;
  };
}
function renderArchivesList() {
  const area = $('#archives-list');
  area.innerHTML = '';
  if (state.archives.length === 0) {
    area.innerHTML = '<p class="empty-msg">アーカイブはまだありません。</p>';
    return;
  }
  state.archives.slice().reverse().forEach(arc => {
    const div = document.createElement('div');
    div.className = 'archive-item';
    const d = new Date(arc.savedAt);
    const asgCount = arc.data.assignments?.length || 0;
    div.innerHTML = `
      <div class="archive-meta">
        <div class="archive-name">${escape(arc.name || arc.year + '年度')}</div>
        <div class="archive-date">${arc.year}年度 ／ ${pad2(d.getMonth()+1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())} 作成 ／ 担当授業 ${asgCount}件</div>
      </div>
      <button data-act="download" data-id="${arc.id}">📥 JSONダウンロード</button>
      <button class="danger" data-act="delete" data-id="${arc.id}">削除</button>
    `;
    area.appendChild(div);
  });
  area.onclick = e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    const arc = state.archives.find(a => a.id === id);
    if (!arc) return;
    if (btn.dataset.act === 'download') {
      downloadJson(`subject_archive_${arc.year}_${arc.id}.json`, arc);
    } else if (btn.dataset.act === 'delete') {
      confirmDialog('アーカイブ削除', `「${arc.name || arc.year+'年度'}」アーカイブを削除します。よろしいですか？`, () => {
        state.archives = state.archives.filter(a => a.id !== id);
        save();
        renderArchivesList();
        toast('アーカイブを削除しました', 'success');
      });
    }
  };
}

function createArchive(name) {
  const arc = {
    id: uid(),
    name: name || `${state.year}年度`,
    year: state.year,
    savedAt: new Date().toISOString(),
    data: {
      year: state.year,
      assignments: JSON.parse(JSON.stringify(state.assignments)),
      rosters: JSON.parse(JSON.stringify(state.rosters)),
      attendance: JSON.parse(JSON.stringify(state.attendance)),
    },
  };
  state.archives.push(arc);
  save();
  return arc;
}

// =====================================================
// データ管理
// =====================================================
function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// =====================================================
// 確認モーダル
// =====================================================
function confirmDialog(title, message, onOk) {
  const modal = $('#confirm-modal');
  $('#confirm-title').textContent = title;
  $('#confirm-body').innerHTML = `<p>${escape(message).replace(/\n/g,'<br>')}</p>`;
  modal.classList.remove('hidden');
  const close = () => modal.classList.add('hidden');
  $('#confirm-ok').onclick = () => { close(); onOk && onOk(); };
  $('#confirm-cancel').onclick = close;
}

// async版：true=OK, false=キャンセル（背景クリック含む）
function confirmDialogAsync(title, message) {
  return new Promise(resolve => {
    let resolved = false;
    const safeResolve = (v) => { if (!resolved) { resolved = true; cleanup(); resolve(v); } };
    const cancelBtn = $('#confirm-cancel');
    const backdrop = $('#confirm-modal .modal-backdrop');
    const onCancel = () => safeResolve(false);
    const cleanup = () => {
      cancelBtn.removeEventListener('click', onCancel);
      backdrop.removeEventListener('click', onCancel);
    };
    cancelBtn.addEventListener('click', onCancel);
    backdrop.addEventListener('click', onCancel);
    confirmDialog(title, message, () => safeResolve(true));
  });
}

// =====================================================
// イベント登録
// =====================================================
function bindEvents() {
  // ナビ
  $$('.nav-btn').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));

  // 当日入力：クラス・日付・時限を変えるだけで自動で名簿表示
  $('#today-assignment').addEventListener('change', reloadTodayRoster);
  $('#today-date').addEventListener('change', reloadTodayRoster);
  $('#today-period').addEventListener('change', reloadTodayRoster);

  // 過去入力：クラス・日付・時限を変えるだけで自動で名簿表示
  $('#past-assignment').addEventListener('change', reloadPastRoster);
  $('#past-date').addEventListener('change', reloadPastRoster);
  $('#past-period').addEventListener('change', reloadPastRoster);
  $('#past-yesterday').addEventListener('click', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    $('#past-date').value = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    reloadPastRoster();
  });

  // 一覧・編集
  $('#list-load').addEventListener('click', buildListMatrix);
  $('#list-this-month').addEventListener('click', () => {
    const d = new Date();
    $('#list-from').value = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-01`;
    $('#list-to').value = todayStr();
    buildListMatrix();
  });
  $('#list-all').addEventListener('click', () => {
    $('#list-from').value = '';
    $('#list-to').value = '';
    buildListMatrix();
  });

  // 集計・コピー
  $('#export-load').addEventListener('click', buildExportTable);
  $('#export-this-month').addEventListener('click', () => {
    const d = new Date();
    $('#export-from').value = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-01`;
    $('#export-to').value = todayStr();
    buildExportTable();
  });
  $('#export-this-term').addEventListener('click', () => {
    // 学期プリセット（4-7月、9-12月、1-3月）
    const today = new Date();
    const y = today.getFullYear(), m = today.getMonth()+1;
    let from, to;
    if (m >= 4 && m <= 7) { from = `${y}-04-01`; to = `${y}-07-31`; }
    else if (m >= 8 && m <= 12) { from = `${y}-09-01`; to = `${y}-12-31`; }
    else { from = `${y}-01-01`; to = `${y}-03-31`; }
    $('#export-from').value = from;
    $('#export-to').value = to;
    buildExportTable();
  });
  $('#export-print').addEventListener('click', () => {
    if (!$('#export-area').querySelector('.export-table')) {
      toast('先に「集計」を押してください', 'error');
      return;
    }
    window.print();   // 実際のスケール調整は beforeprint で
  });

  // Ctrl+P / 印刷ボタン どちらでもA4 1ページに収まるよう自動スケール
  window.addEventListener('beforeprint', () => {
    // 表示中ビューの中で最大の tbody 行数を取得
    let maxRows = 0;
    document.querySelectorAll('.view:not(.hidden) table tbody').forEach(tb => {
      const n = tb.querySelectorAll('tr').length;
      if (n > maxRows) maxRows = n;
    });
    const basePt = 9;        // 基本フォントサイズ
    const threshold = 45;    // この行数までは9pt
    const minPt = 6;         // 縮小下限
    const fontPt = maxRows > threshold
      ? Math.max(minPt, basePt * threshold / maxRows)
      : basePt;
    document.documentElement.style.setProperty('--print-base-pt', `${fontPt.toFixed(2)}pt`);
  });
  window.addEventListener('afterprint', () => {
    document.documentElement.style.removeProperty('--print-base-pt');
  });

  // 生徒履歴モーダル
  $('#student-history-close').addEventListener('click', closeStudentHistory);
  $('#student-history-modal .modal-backdrop').addEventListener('click', closeStudentHistory);

  // 担当授業（設定）
  $('#setup-year-save').addEventListener('click', () => {
    const v = $('#setup-year').value;
    if (!v) return;
    state.year = String(v);
    save();
    $('#year-info').textContent = `${state.year}年度`;
    toast('年度を更新しました', 'success');
  });
  $('#add-assignment').addEventListener('click', () => {
    const grade = $('#add-grade').value;
    const cls = $('#add-class').value;
    const subject = $('#add-subject').value.trim();
    if (!subject) { toast('授業名を入力してください', 'error'); return; }
    // 重複チェック
    if (state.assignments.find(a => a.grade == grade && a.class === cls && a.subject === subject)) {
      toast('同じ担当授業が既に登録されています', 'error'); return;
    }
    state.assignments.push({
      id: uid(),
      year: state.year,
      grade: +grade,
      class: cls,
      subject,
      termHours: { 1: '', 2: '', 3: '' },
    });
    save();
    $('#add-subject').value = '';
    renderAssignmentsTable();
    toast('担当授業を追加しました', 'success');
  });
  $('#assignments-tbody').addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === 'roster') {
      openRosterModal(id);
    } else if (btn.dataset.act === 'delete') {
      const asg = state.assignments.find(a => a.id === id);
      const hasData = !!state.attendance[id] && Object.keys(state.attendance[id]).length > 0;
      const msg = `${getAssignmentLabel(asg)} を削除します。\n${hasData ? '⚠️ この授業の出欠データもすべて削除されます。' : ''}\nよろしいですか？`;
      confirmDialog('担当授業の削除', msg, () => {
        state.assignments = state.assignments.filter(a => a.id !== id);
        delete state.rosters[id];
        delete state.attendance[id];
        save();
        renderAssignmentsTable();
        toast('削除しました', 'success');
      });
    }
  });
  // 学期別 授業時数の入力（即保存＋年間計の即時更新）
  $('#assignments-tbody').addEventListener('input', e => {
    const input = e.target.closest('.term-hours-input');
    if (!input) return;
    const asgId = input.dataset.id;
    const term = input.dataset.term;
    const asg = state.assignments.find(a => a.id === asgId);
    if (!asg) return;
    if (!asg.termHours) asg.termHours = { 1: '', 2: '', 3: '' };
    // 半角数字のみ、空はそのまま空文字
    const v = input.value.trim();
    asg.termHours[term] = v === '' ? '' : Math.max(0, +v || 0);
    save();
    // 年間計セルを即時更新
    const totalCell = input.closest('tr')?.querySelector('.term-total-cell');
    if (totalCell) {
      const total = getAnnualHours(asg);
      totalCell.textContent = total > 0 ? total : '-';
      totalCell.classList.toggle('has-hours', total > 0);
    }
  });

  // 名簿モーダル
  bindRosterRowsArea();

  // クリップボードから貼り付けボタン
  $('#roster-paste-btn').addEventListener('click', async () => {
    let text = '';
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error('clipboard api unavailable');
      }
      text = await navigator.clipboard.readText();
    } catch (err) {
      toast('クリップボードを読み取れませんでした。1番の入力欄を選んでCtrl+Vで貼り付けてください', 'error');
      const first = $('#roster-rows-area .name-input');
      if (first) first.focus();
      return;
    }
    if (!text.trim()) { toast('クリップボードが空です', 'error'); return; }
    const names = parseNamesFromText(text);
    if (names.length === 0) { toast('読み取れる氏名がありませんでした', 'error'); return; }
    // 1番目から流し込み（全置換）
    rosterModalData = names.map(n => ({ name: n }));
    renderRosterRows();
    toast(`${names.length}名を貼り付けました`, 'success');
  });

  $('#roster-clear-all').addEventListener('click', () => {
    confirmDialog('全削除の確認', 'プレビューの内容を全て消去します。（保存ボタンを押すまで既存データは変わりません）', () => {
      rosterModalData = [];
      renderRosterRows();
    });
  });

  $('#roster-save').addEventListener('click', () => {
    // 空行を除外して保存。番号は1から自動採番。
    const names = rosterModalData.map(r => r.name.trim()).filter(Boolean);
    if (names.length === 0) { toast('氏名を1名以上入力してください', 'error'); return; }
    state.rosters[rosterModalAsgId] = names.map((name, i) => ({ no: String(i + 1), name }));
    save();
    closeRosterModal();
    renderAssignmentsTable();
    toast(`名簿（${names.length}名）を登録しました`, 'success');
  });

  $('#roster-cancel').addEventListener('click', () => {
    // 変更があったか軽くチェック
    const cur = (state.rosters[rosterModalAsgId] || []).map(r => r.name).join('\n');
    const edited = rosterModalData.map(r => r.name.trim()).filter(Boolean).join('\n');
    if (cur === edited) { closeRosterModal(); return; }
    confirmDialog('キャンセル確認', '編集内容を破棄しますか？', () => closeRosterModal());
  });

  // 年度更新：任意の即時アーカイブ
  $('#archive-now').addEventListener('click', () => {
    const name = $('#archive-name').value.trim() || `${state.year}年度_${pad2(new Date().getMonth()+1)}${pad2(new Date().getDate())}`;
    const arc = createArchive(name);
    $('#archive-name').value = '';
    renderArchivesList();
    toast(`アーカイブ「${arc.name}」を保存しました`, 'success');
  });

  // 年度更新ウィザード ナビゲーション
  $('#wizard-back').addEventListener('click', () => {
    if (wizardStep > 1) { wizardStep--; renderWizard(); }
  });
  $('#wizard-skip').addEventListener('click', () => {
    if (wizardStep < 5) { wizardStep++; renderWizard(); }
  });
  $('#wizard-next').addEventListener('click', async () => {
    if (typeof wizardCommit === 'function') {
      const result = await Promise.resolve(wizardCommit());
      if (result === false) return;
    }
    if (wizardStep === 5) {
      // Step5のcommitが showView('today') を呼ぶので、ここでは何もしない
      return;
    }
    if (wizardStep < 5) {
      wizardStep++;
      renderWizard();
    }
  });

  // データ管理
  $('#data-export').addEventListener('click', () => {
    state.lastExportAt = new Date().toISOString();
    save();
    downloadJson(`subject_attendance_${state.year}_${todayStr()}.json`, state);
    toast('エクスポートしました', 'success');
    updateSafetyIndicators();
  });
  // ヘッダ：バックアップアイコンクリック → 即エクスポート
  $('#backup-age-indicator').addEventListener('click', () => $('#data-export').click());
  $('#data-import-file').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        confirmDialog('インポート確認', '現在のデータを破棄して、ファイルの内容で上書きします。よろしいですか？\n（事前にエクスポートでバックアップ推奨）', () => {
          state = migrate(obj);
          save();
          showView('setup');
          toast('インポートしました', 'success');
        });
      } catch (err) {
        toast('JSONファイルとして読み取れませんでした', 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(f);
  });
  $('#data-clear').addEventListener('click', () => {
    confirmDialog('全データ削除',
      '⚠️ 全ての担当授業・名簿・出欠データ・アーカイブを削除します。\nこの操作は取り消せません。\n\n本当に削除しますか？', () => {
      state = defaultState();
      save();
      showView('setup');
      toast('全データを削除しました', 'success');
    });
  });

  // テーマ
  $('#theme-toggle').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('lesson-att-theme', next);
  });

  // モーダル背景クリックで閉じる（確認系のみ）
  $('#cell-edit-modal .modal-backdrop').addEventListener('click', closeCellEdit);
  $('#confirm-modal .modal-backdrop').addEventListener('click', () => $('#confirm-modal').classList.add('hidden'));
}

// =====================================================
// 起動
// =====================================================
async function init() {
  state = load();
  // テーマ
  const t = localStorage.getItem('lesson-att-theme');
  if (t) document.documentElement.dataset.theme = t;
  $('#year-info').textContent = `${state.year}年度`;
  bindEvents();
  showView('today');
  updateStorageIndicator();

  // ===== データ保護：永続化要求 + インジケータ =====
  await ensurePersistentStorage();
  updateSafetyIndicators();
  if (window._restoredFromBackup) {
    toast('メインデータが消失したためバックアップから復元しました', 'success');
  }
}

document.addEventListener('DOMContentLoaded', init);
})();
