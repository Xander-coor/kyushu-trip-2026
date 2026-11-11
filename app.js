/* 九州行程 PWA — 介面程式。內容全部在 data.json，這裡只負責畫面。 */
(function () {
  'use strict';

  var TABS = [
    { id: 'days', label: '每日行程', icon: 'cal' },
    { id: 'stays', label: '住宿', icon: 'bed' },
    { id: 'transport', label: '交通租車', icon: 'car' },
    { id: 'notices', label: '注意事項', icon: 'warn' },
    { id: 'todos', label: '待辦待查', icon: 'check' },
    { id: 'sources', label: '來源', icon: 'link' }
  ];
  var ICONS = {
    cal: '<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    bed: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0-.01"/>',
    car: '<path d="M5 16h14M6 16v2M18 16v2M4 16v-4l2-5h12l2 5v4M4 12h16M7.5 14h.01M16.5 14h.01"/>',
    warn: '<path d="M12 4l9 16H3zM12 10v4M12 17h.01"/>',
    check: '<path d="M4 6h3M4 12h3M4 18h3M10 6h10M10 12h10M10 18h10"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
  };
  var LS_TAB = 'kyushu.tab', LS_DAY = 'kyushu.day';
  var D; // data
  var VERIFY = '需再確認';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // 文字轉 HTML：跳脫、網址變成可點連結
  function rich(s) {
    return esc(s).replace(/https?:\/\/[^\s）)、，,<]+/g, function (u) {
      var shown = u.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (shown.length > 38) shown = shown.slice(0, 36) + '…';
      return '<a href="' + u + '" target="_blank" rel="noopener">' + shown + '</a>';
    });
  }
  function needsVerify(o) {
    if (!o) return false;
    if (o.verify) return true;
    var t = typeof o === 'string' ? o : (o.text || '') + ' ' + (o.value || '');
    return t.indexOf(VERIFY) >= 0;
  }
  function vBadge() { return '<span class="badge b-verify">⚠ 需再確認</span>'; }
  function sBadge(status) {
    if (!status || status === 'none') return '';
    var label = (D.statusLabels && D.statusLabels[status]) || status;
    var icon = { booked: '✓ ', notBooked: '✕ ', estimate: '≈ ', planned: '○ ', mixed: '◐ ', suggested: '' }[status] || '';
    return '<span class="badge b-' + status + '">' + icon + esc(label) + '</span>';
  }
  function srcRefs(ids) {
    if (!ids || !ids.length) return '';
    return '<span class="refs">' + ids.map(function (id) {
      var s = D.sources[id - 1];
      if (!s) return '';
      return '<a class="ref" href="' + esc(s.href) + '" target="_blank" rel="noopener" title="' + esc(s.title) + '">來源 ' + id + '</a>';
    }).join('') + '</span>';
  }
  function noteLi(n) {
    if (typeof n === 'string') n = { text: n };
    return '<li class="note' + (needsVerify(n) ? ' has-verify' : '') + '">' +
      (needsVerify(n) ? vBadge() + ' ' : '') + rich(n.text) + srcRefs(n.sources) + '</li>';
  }
  function callout(c, tone) {
    if (!c) return '';
    return '<div class="callout ' + (tone || c.tone || '') + '"><div class="callout-lead">' + esc(c.lead) + '</div>' +
      '<div>' + (needsVerify(c) ? vBadge() + ' ' : '') + rich(c.text) + srcRefs(c.sources) + '</div></div>';
  }
  function table(t) {
    return '<div class="table-wrap"><table><thead><tr>' + t.columns.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + t.rows.map(function (r) {
        return '<tr>' + r.map(function (c, i) { return (i === 0 ? '<th scope="row">' : '<td>') + rich(c) + (i === 0 ? '</th>' : '</td>'); }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
  }
  function dayKey(id) { return id.replace(/-/g, ''); }

  /* ---------- 各分頁 ---------- */
  function legend() {
    return '<div class="legend">' + ['booked', 'notBooked', 'estimate', 'planned', 'mixed', 'suggested'].map(sBadge).join('') + vBadge() + '</div>' +
      '<p class="small muted">「部分已訂」＝住宿已訂，但同一列的移動或活動還沒訂（例如新幹線）。「已計畫・未訂」＝你已決定要去，但還沒買票。</p>';
  }

  function overviewPanel() {
    var m = D.meta;
    var h = '<div class="card intro"><h2>' + esc(m.fullTitle) + '</h2><p>' + esc(m.summary) + '</p><p id="countdown" class="countdown"></p></div>';
    h += '<div class="card"><p>' + esc(m.timeNote) + '</p><p><strong>' + esc(m.bookedNote) + '</strong></p>' + legend() + '</div>';
    h += '<h3 class="sec">九天一覽</h3><ul class="ovlist">';
    D.days.forEach(function (d) {
      h += '<li><label class="ovrow" for="day-' + dayKey(d.id) + '" data-goto-day="' + d.id + '">' +
        '<span class="ovdate">' + esc(d.label) + '<small>（' + esc(d.weekday) + '）</small></span>' +
        '<span class="ovbody"><span class="ovtitle">' + esc(d.title) + '</span>' +
        '<span class="ovstay">' + (d.stay.status === 'none' ? '<span class="muted">當晚回台中</span>' : esc(d.stay.name) + ' ' + sBadge(d.stay.status)) + '</span>' +
        '<span class="ovsum">' + (needsVerify(d.summary) ? vBadge() + ' ' : '') + esc(d.summary) + '</span></span>' +
        '<span class="chev">›</span></label></li>';
    });
    h += '</ul><div class="card small muted">' + esc(m.legendNote) + '</div>';
    return h;
  }

  function dayPanel(d) {
    var h = '<div class="dayhead"><div class="dayhead-date">' + esc(d.label) + '（' + esc(d.weekday) + '）</div>' +
      '<h2>' + esc(d.title) + '</h2>' +
      '<div class="dayhead-stay"><span class="lbl">今晚</span> ' +
      (d.stay.status === 'none' ? '<span>' + esc(d.stay.name) + '</span>' : '<span>' + esc(d.stay.name) + '</span> ' + sBadge(d.stay.status)) +
      '</div><div class="dayhead-base"><span class="lbl">落腳</span> ' + esc(d.base) + '</div></div>';
    if (d.alert) h += callout(d.alert, 'warning');
    h += '<ol class="timeline">';
    d.items.forEach(function (it) {
      h += '<li class="tl st-' + it.status + '"><div class="tl-time">' + esc(it.time) + '</div><div class="tl-body">' +
        '<div class="tl-text">' + rich(it.text) + '</div><div class="tl-meta">' + sBadge(it.status) +
        (needsVerify(it) ? vBadge() : '') + '<span class="cat">' + esc(it.category) + '</span>' + srcRefs(it.sources) + '</div></div></li>';
    });
    h += '</ol>';
    if (d.notes && d.notes.length) h += '<h3 class="sec">提醒</h3><ul class="notes">' + d.notes.map(noteLi).join('') + '</ul>';
    if (d.blog && d.blog.length) {
      h += '<details class="blog"><summary>部落格補充（' + d.blog.length + '）<span class="muted small">非草案正文，僅供參考</span></summary><ul class="notes">' +
        d.blog.map(function (b) {
          return '<li class="note">' + (needsVerify(b) ? vBadge() + ' ' : '') + (b.prequake ? '<span class="badge b-old">震前</span> ' : '') + rich(b.text) +
            (b.from ? '<div class="from">— ' + rich(b.from) + '</div>' : '') + srcRefs(b.sources) + '</li>';
        }).join('') + '</ul><p class="small muted">' + esc(D.meta.blogNote) + '</p></details>';
    }
    return h;
  }

  function daysTab() {
    var chips = [{ id: 'overview', label: '總覽', wd: '' }].concat(D.days.map(function (d) { return { id: d.id, label: d.label, wd: d.weekday }; }));
    var h = '';
    chips.forEach(function (c, i) {
      h += '<input type="radio" class="sr" name="day" id="day-' + dayKey(c.id) + '" value="' + c.id + '"' + (i === 0 ? ' checked' : '') + '>';
    });
    h += '<nav class="chips" aria-label="選擇日期"><div class="chips-inner">' + chips.map(function (c) {
      return '<label class="chip" for="day-' + dayKey(c.id) + '" data-day="' + c.id + '"><span class="chip-l">' + esc(c.label) + '</span>' +
        (c.wd ? '<span class="chip-w">' + esc(c.wd) + '</span>' : '<span class="chip-w">全部</span>') + '</label>';
    }).join('') + '</div></nav><div class="daypanels">';
    h += '<div class="daypanel dp-' + dayKey('overview') + '">' + overviewPanel() + '</div>';
    D.days.forEach(function (d) { h += '<div class="daypanel dp-' + dayKey(d.id) + '">' + dayPanel(d) + '</div>'; });
    return h + '</div>';
  }

  function staysTab() {
    var S = D.stays, h = '<h2 class="ptitle">住宿</h2>';
    h += '<ul class="cards">';
    S.nights.forEach(function (n) {
      h += '<li class="card stay st-' + n.status + (n.highlight ? ' hl' : '') + '"><div class="stay-top"><span class="stay-n">' + esc(n.nights) + '</span>' + sBadge(n.status) + '</div>' +
        '<div class="stay-name">' + esc(n.name) + '</div><div class="muted">' + esc(n.area) + (n.via ? '・' + esc(n.via) : '') + '</div>' +
        (n.details ? '<ul class="notes compact">' + n.details.map(noteLi).join('') + '</ul>' : '') + srcRefs(n.sources) + '</li>';
    });
    h += '</ul>';
    var N = S.night27;
    h += '<h3 class="sec">12/27 住宿與 safari 怎麼排 ' + sBadge('notBooked') + '</h3>' + callout(N.callout, 'info') + table(N.compare);
    N.candidates.forEach(function (c) {
      h += '<div class="card cand"><div class="stay-top"><span class="stay-n">' + esc(c.label) + '</span>' + sBadge(c.status) + '</div><div class="stay-name">' + esc(c.name) + '</div>' +
        '<p>' + (needsVerify(c) ? vBadge() + ' ' : '') + rich(c.text) + '</p>' + srcRefs(c.sources) + '</div>';
    });
    h += '<ul class="notes">' + N.notes.map(noteLi).join('') + '</ul>';
    if (S.alternatives && S.alternatives.length) h += '<h3 class="sec">其他換住參考（未訂）</h3><ul class="notes">' + S.alternatives.map(noteLi).join('') + '</ul>';
    return h;
  }

  function transportTab() {
    var T = D.transport, h = '<h2 class="ptitle">交通與租車</h2>';
    h += '<h3 class="sec">機票</h3><ul class="cards">' + T.flights.map(function (f) {
      return '<li class="card flight"><div class="stay-top"><span class="stay-n">' + esc(f.label) + '</span>' + sBadge(f.status) + '</div><div>' + esc(f.text) + '</div></li>';
    }).join('') + '</ul>';
    h += '<h3 class="sec">租車 ' + sBadge('estimate') + '</h3>' + callout(T.car.callout, 'warning');
    h += '<dl class="props">' + T.car.props.map(function (p) {
      return '<div class="prop' + (p.important ? ' imp' : '') + '"><dt>' + esc(p.label) + '</dt><dd>' + (needsVerify(p) ? vBadge() + ' ' : '') + rich(p.value) + '</dd></div>';
    }).join('') + '</dl>' + srcRefs(T.car.sources);
    h += '<h3 class="sec">各段移動時間</h3>' + table(T.legs) + '<p class="small">' + (needsVerify(T.legs.note) ? vBadge() + ' ' : '') + rich(T.legs.note) + '</p>' + srcRefs(T.legs.sources);
    h += '<h3 class="sec">交通提醒</h3><ul class="notes">' + T.notes.map(noteLi).join('') + '</ul>';
    return h;
  }

  function noticesTab() {
    var N = D.notices, h = '<h2 class="ptitle">注意事項</h2>';
    h += '<h3 class="sec">重要提醒</h3><ul class="notes">' + N.general.map(noteLi).join('') + '</ul>';
    h += '<h3 class="sec">年末年始與時事提醒</h3>' + callout(N.railAlert, 'warning') + '<ul class="notes">' + N.yearEnd.map(noteLi).join('') + '</ul>';
    h += '<h3 class="sec">' + esc(N.closures.title) + '</h3><ul class="closures">' + N.closures.items.map(function (c) {
      return '<li><span class="cdate">' + esc(c.date) + '</span><span>' + rich(c.text) + '</span></li>';
    }).join('') + '</ul>';
    return h;
  }

  function collectVerify() {
    var out = [];
    D.days.forEach(function (d) {
      d.items.forEach(function (it) { if (needsVerify(it)) out.push({ day: d, text: it.time + '｜' + it.text }); });
      (d.notes || []).forEach(function (n) { if (needsVerify(n)) out.push({ day: d, text: n.text }); });
    });
    return out;
  }

  function todosTab() {
    var h = '<h2 class="ptitle">待辦與待查</h2>';
    var done = D.todos.filter(function (t) { return t.done; }).length;
    h += '<h3 class="sec">待辦與確認狀態 <span class="muted small">' + done + ' / ' + D.todos.length + ' 完成</span></h3><ul class="todos">';
    D.todos.forEach(function (t) {
      var nb = /尚未/.test(t.meta || '');
      h += '<li class="todo ' + (t.done ? 'done' : 'open') + '"><span class="box" aria-hidden="true">' + (t.done ? '✓' : '') + '</span><span class="todo-body"><span class="todo-text">' + esc(t.text) + '</span>' +
        '<span class="todo-meta">' + (t.done ? sBadge('booked') : (nb ? sBadge('notBooked') : '<span class="badge b-todo">待辦</span>')) + (t.meta ? '<span class="cat">' + esc(t.meta) + '</span>' : '') + '</span></span></li>';
    });
    h += '</ul><p class="small muted">' + esc(D.meta.statusAsOf) + '</p>';
    h += '<h3 class="sec">尚待另查的問題</h3><ul class="notes">' + D.openQuestions.map(noteLi).join('') + '</ul>';
    var v = collectVerify();
    h += '<h3 class="sec">各日「需再確認」清單 <span class="muted small">' + v.length + ' 項</span></h3><ul class="vlist">';
    v.forEach(function (x) {
      h += '<li><label for="day-' + dayKey(x.day.id) + '" data-goto-day="' + x.day.id + '" class="vrow"><span class="vday">' + esc(x.day.label) + '</span><span>' + rich(x.text) + '</span></label></li>';
    });
    return h + '</ul>';
  }

  function sourcesTab() {
    var h = '<h2 class="ptitle">來源（' + D.sources.length + '）</h2><p class="small muted">點標題開啟原始網頁（需網路）。行程中的「來源 N」對應下方編號。</p><ol class="sources">';
    D.sources.forEach(function (s) {
      h += '<li id="src-' + s.id + '"><a href="' + esc(s.href) + '" target="_blank" rel="noopener"><span class="sid">' + s.id + '</span><span class="stitle">' + esc(s.title) + '</span><span class="ssite">' + esc(s.site) + '</span></a></li>';
    });
    h += '</ol><div class="card small muted"><p>行程草案原稿（由 Tour 維護）：' + rich(D.meta.draftUrl) + '</p><p>資料版本：' + esc(D.meta.dataVersion) + '。' + esc(D.meta.statusAsOf) + '</p><p>本 app 不含任何訂位代碼、密碼或付款資料。</p></div>';
    return h;
  }

  /* ---------- 組裝 ---------- */
  function render() {
    var root = document.getElementById('app');
    var h = '';
    TABS.forEach(function (t, i) { h += '<input type="radio" class="sr" name="tab" id="tab-' + t.id + '" value="' + t.id + '"' + (i === 0 ? ' checked' : '') + '>'; });
    h += '<header class="top"><div class="top-inner"><div class="brand">' + esc(D.meta.title) + '</div><div class="sub">2026/12/25 – 2027/1/2</div></div></header>';
    h += '<main>';
    var builders = { days: daysTab, stays: staysTab, transport: transportTab, notices: noticesTab, todos: todosTab, sources: sourcesTab };
    TABS.forEach(function (t) { h += '<section class="panel" id="panel-' + t.id + '" aria-label="' + t.label + '">' + builders[t.id]() + '</section>'; });
    h += '<div class="foot small muted">資料版本 ' + esc(D.meta.dataVersion) + '・離線也可查看</div></main>';
    h += '<nav class="tabbar" aria-label="分頁">' + TABS.map(function (t) {
      return '<label class="tab" for="tab-' + t.id + '" data-tab="' + t.id + '">' + svg(t.icon) + '<span>' + t.label + '</span></label>';
    }).join('') + '</nav>';
    root.innerHTML = h;

    // 用 CSS 切換分頁與日期（沒有 JavaScript 時也能用，例如離線單檔版）
    var css = TABS.map(function (t) {
      return '#tab-' + t.id + ':checked~main #panel-' + t.id + '{display:block}' +
        '#tab-' + t.id + ':checked~.tabbar label[for=tab-' + t.id + ']{color:var(--accent)}' +
        '#tab-' + t.id + ':checked~.tabbar label[for=tab-' + t.id + '] svg{background:var(--accent-soft)}';
    }).join('');
    ['overview'].concat(D.days.map(function (d) { return d.id; })).forEach(function (id) {
      var k = dayKey(id);
      css += '#day-' + k + ':checked~.daypanels .dp-' + k + '{display:block}' +
        '#day-' + k + ':checked~.chips label[for=day-' + k + ']{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}';
    });
    var st = document.getElementById('dyn-style');
    if (!st) { st = document.createElement('style'); st.id = 'dyn-style'; document.head.appendChild(st); }
    st.textContent = css;
    document.documentElement.setAttribute('data-rendered', '1');
  }

  function ymd(dt) {
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  }
  function todayId() {
    var t = ymd(new Date());
    for (var i = 0; i < D.days.length; i++) if (D.days[i].id === t) return t;
    return null;
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  function selectTab(id, scroll) {
    var r = document.getElementById('tab-' + id);
    if (!r) return;
    r.checked = true; lsSet(LS_TAB, id);
    document.querySelector('.top .sub').textContent = TABS.filter(function (t) { return t.id === id; })[0].label;
    if (scroll !== false) window.scrollTo(0, 0);
  }
  function selectDay(id, scroll) {
    var r = document.getElementById('day-' + dayKey(id));
    if (!r) return;
    r.checked = true; lsSet(LS_DAY, id);
    var chip = document.querySelector('.chip[data-day="' + id + '"]');
    if (chip && chip.scrollIntoView) chip.scrollIntoView({ block: 'nearest', inline: 'center', behavior: scroll === false ? 'auto' : 'smooth' });
    if (scroll !== false) window.scrollTo(0, 0);
  }

  function wire() {
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'tab') selectTab(t.value);
      if (t.name === 'day') selectDay(t.value);
    });
    // 從總覽或待查清單跳到某一天：同時切到「每日行程」分頁
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-goto-day]');
      if (el && !e.target.closest('a')) { e.preventDefault(); selectTab('days'); selectDay(el.getAttribute('data-goto-day')); }
    });
    var today = todayId();
    var tab = lsGet(LS_TAB) || 'days';
    var day = today || lsGet(LS_DAY) || 'overview';
    selectTab(tab, false);
    selectDay(day, false);
    if (today) {
      var chip = document.querySelector('.chip[data-day="' + today + '"]');
      if (chip) chip.classList.add('is-today');
    }
    var cd = document.getElementById('countdown');
    if (cd) {
      var start = new Date(2026, 11, 25), end = new Date(2027, 0, 2), now = new Date();
      var n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var diff = Math.round((start - n0) / 86400000);
      cd.textContent = diff > 0 ? '距離出發還有 ' + diff + ' 天' : (n0 <= end ? '旅程進行中：今天是第 ' + (1 - diff) + ' 天' : '旅程已結束');
    }
  }

  function showError(msg) {
    document.getElementById('app').innerHTML = '<div class="card err"><h2>無法載入行程資料</h2><p>' + esc(msg) + '</p><p>請連上網路後重新開啟一次，之後就能離線使用。</p></div>';
  }

  function start(data) { D = data; render(); wire(); }

  function boot() {
    if (window.__KYUSHU_DATA__) return start(window.__KYUSHU_DATA__); // 單檔版
    fetch('data.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(start).catch(function (e) { showError(String(e && e.message || e)); });
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.__KYUSHU_DATA__) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('SW 註冊失敗', e); });
    });
  }
  if (document.documentElement.getAttribute('data-prerendered') === '1') {
    // 單檔版已預先畫好；有 JS 時只補上記憶分頁等互動
    D = window.__KYUSHU_DATA__;
    if (D) wire();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();
})();
