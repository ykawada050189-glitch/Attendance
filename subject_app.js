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
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch (e) {
    console.error('load failed', e);
    toast('データ読み込みに失敗しました', 'error');
    return defaultState();
  }
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSavedIndicator();
    updateStorageIndicator();
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
  return s;
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
  return `${a.grade}年${a.class} ${a.subject}`;
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
    btn.innerHTML = `
      <span class="reg-period">${period}限</span>
      <span class="reg-class">${escape(asg.grade)}年${escape(asg.class)}</span>
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
function computeStudentRunningTotals(asgId, studentNo) {
  const attData = state.attendance[asgId] || {};
  let totalSessions = 0, kk = 0, st = 0, mo = 0, ab = 0;
  Object.keys(attData).forEach(date => {
    Object.keys(attData[date]).forEach(period => {
      totalSessions++;
      const status = attData[date][period][studentNo];
      if (status === '公欠') kk++;
      else if (status === '出停') st++;
      else if (status === '忌引') mo++;
      else if (status === '欠席') ab++;
    });
  });
  // 授業数（その生徒に対する）＝ 総実施回数 − 出停 − 忌引
  const classes = totalSessions - st - mo;
  const limit = Math.floor(classes / 3);      // 1/3まで欠席できる回数（小数切り捨て）
  const remaining = limit - ab;               // 1/3 ラインまでの残り回数
  return {
    totalSessions,
    classes,
    '公欠': kk, '出停': st, '忌引': mo, '欠席': ab,
    limit,
    remaining,
  };
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

  const stats = computeStudentRunningTotals(asgId, studentNo);
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
  Object.keys(attData).forEach(date => {
    Object.keys(attData[date]).forEach(period => {
      if (date === excludeDate && +period === +excludePeriod) return;
      totalSessions++;
      const status = attData[date][period][studentNo];
      if (status === '公欠') kk++;
      else if (status === '出停') st++;
      else if (status === '忌引') mo++;
      else if (status === '欠席') ab++;
    });
  });
  return { totalSessions, '公欠': kk, '出停': st, '忌引': mo, '欠席': ab };
}

// 基礎累計 + 「今この行の状態」を合算して live 集計を返す
function statsWithCurrentStatus(base, currentStatus) {
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
  return ns;
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

  // 出欠サマリ（リアルタイム更新）
  const summary = document.createElement('div');
  summary.className = 'attendance-summary';
  card.appendChild(summary);

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
    const liveStats = statsWithCurrentStatus(baseStats[stu.no], current);
    const warnLevel = getWarnLevel(liveStats);
    tr.className = 'row-' + STATUS_CLASS[current];
    if (warnLevel) tr.classList.add('has-warning-' + warnLevel);
    tr.innerHTML = `
      <td class="col-no">${escape(stu.no)}</td>
      <td class="col-name">${escape(stu.name)}${getWarnBadge(liveStats)}</td>
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

  // 登録ボタン
  const foot = document.createElement('div');
  foot.style.cssText = 'margin-top:14px; display:flex; gap:10px; justify-content:flex-end;';
  foot.innerHTML = `
    ${isEdit ? '<button class="danger" id="rosterDeleteBtn">この回を削除</button>' : ''}
    <button class="primary" id="rosterSaveBtn" style="font-size:15px; padding:10px 24px;">💾 登録する</button>
  `;
  card.appendChild(foot);
  area.appendChild(card);

  // === ヘルパ：行の警告バッジを再描画 ===
  function refreshRowWarning(tr, no, status) {
    const live = statsWithCurrentStatus(baseStats[no], status);
    tr.classList.remove('has-warning-warn','has-warning-danger','has-warning-critical');
    const lvl = getWarnLevel(live);
    if (lvl) tr.classList.add('has-warning-' + lvl);
    const nameCell = tr.querySelector('.col-name');
    const oldBadge = nameCell.querySelector('.warn-badge');
    if (oldBadge) oldBadge.remove();
    const newBadgeHtml = getWarnBadge(live);
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
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">担当授業が登録されていません。<br>上のフォームから追加してください。</td></tr>`;
    return;
  }
  state.assignments.forEach(a => {
    const roster = state.rosters[a.id] || [];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escape(a.grade)}年</td>
      <td>${escape(a.class)}</td>
      <td>${escape(a.subject)}</td>
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
// 年度更新ビュー
// =====================================================
function refreshYearUpdateView() {
  $('#new-year').value = String(+state.year + 1);
  renderArchivesList();
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
    window.print();
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

  // 年度更新
  $('#archive-now').addEventListener('click', () => {
    const name = $('#archive-name').value.trim() || `${state.year}年度_${pad2(new Date().getMonth()+1)}${pad2(new Date().getDate())}`;
    const arc = createArchive(name);
    $('#archive-name').value = '';
    renderArchivesList();
    toast(`アーカイブ「${arc.name}」を保存しました`, 'success');
  });
  $('#start-new-year').addEventListener('click', () => {
    const ny = $('#new-year').value;
    if (!ny) { toast('新年度を入力してください', 'error'); return; }
    confirmDialog('新年度に切り替え',
      `現在の ${state.year}年度をアーカイブし、新しい ${ny}年度に切り替えます。\n\n` +
      `・現在の担当授業・名簿・出欠データはアーカイブとして保存されます\n` +
      `・切り替え後、担当授業と名簿は空になります\n` +
      `・アーカイブはいつでも閲覧・ダウンロードできます\n\n本当に切り替えますか？`, () => {
      createArchive(`${state.year}年度（年度更新時）`);
      state.year = String(ny);
      state.assignments = [];
      state.rosters = {};
      state.attendance = {};
      save();
      $('#year-info').textContent = `${state.year}年度`;
      refreshYearUpdateView();
      toast(`${ny}年度に切り替えました`, 'success');
    });
  });

  // データ管理
  $('#data-export').addEventListener('click', () => {
    downloadJson(`subject_attendance_${state.year}_${todayStr()}.json`, state);
    toast('エクスポートしました', 'success');
  });
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
function init() {
  state = load();
  // テーマ
  const t = localStorage.getItem('lesson-att-theme');
  if (t) document.documentElement.dataset.theme = t;
  $('#year-info').textContent = `${state.year}年度`;
  bindEvents();
  showView('today');
  updateStorageIndicator();
}

document.addEventListener('DOMContentLoaded', init);
})();
