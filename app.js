/* 九州行程 PWA — 介面程式。內容全部在 data.json，這裡只負責畫面。 */
(function () {
  'use strict';
  var APP_VERSION = '1.1.0';
  document.documentElement.classList.add('js');

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
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    yen: '<path d="M6 4l6 8 6-8M12 12v8M7.5 13h9M7.5 16.5h9"/>',
    nav: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  var LS_TAB = 'kyushu.tab', LS_DAY = 'kyushu.day', LS_CHECKS = 'kyushu.checks', LS_RATE = 'kyushu.rate';
  var TZ_JP = 'Asia/Tokyo', TZ_TW = 'Asia/Taipei';
  var RATE_API = 'https://open.er-api.com/v6/latest/JPY';
  var D;
  var VERIFY = '需再確認';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function rich(s) {
    return esc(s).replace(/https?:\/\/[^\s）)、，,<]+/g, function (u) {
      var shown = u.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (shown.length > 38) shown = shown.slice(0, 36) + '…';
      return '<a href="' + u + '" target="_blank" rel="noopener">' + shown + '</a>';
    });
  }
  function needsVerify(o) {
    if (!o) return false;
    if (o.verify || o.mapNote) return true;
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
  function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
  }
  function mapUrl(q) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q); }
  // 導航按鈕：maps 為 [{q,label}]；沒有可用地址時顯示停用按鈕
  function navBtns(o) {
    if (!o) return '';
    var h = '';
    (o.maps || []).forEach(function (m) {
      h += '<a class="navbtn" href="' + esc(mapUrl(m.q)) + '" target="_blank" rel="noopener" data-map-q="' + esc(m.q) + '">' + svg('nav') + '<span>導航・' + esc(m.label || m.q) + '</span></a>';
    });
    if (o.mapNote) h += '<span class="mapnote">' + vBadge() + esc(o.mapNote.replace(/，?需再確認/, '')) + '</span>';
    if (o.mapMissing) h += '<span class="navbtn disabled" aria-disabled="true">' + svg('nav') + '<span>無法導航</span></span><span class="mapnote">' + vBadge() + esc(o.mapMissing) + '</span>';
    return h ? '<div class="navrow">' + h + '</div>' : '';
  }
  function sid(o) { return o && o.id ? ' id="' + esc(o.id) + '" data-sid="' + esc(o.id) + '"' : ''; }
  function noteLi(n) {
    if (typeof n === 'string') n = { text: n };
    return '<li class="note' + (needsVerify(n) ? ' has-verify' : '') + '"' + sid(n) + '>' +
      (needsVerify(n) ? vBadge() + ' ' : '') + rich(n.text) + srcRefs(n.sources) + navBtns(n) + '</li>';
  }
  function callout(c, tone) {
    if (!c) return '';
    return '<div class="callout ' + (tone || c.tone || '') + '"><div class="callout-lead">' + esc(c.lead) + '</div>' +
      '<div>' + (needsVerify(c) ? vBadge() + ' ' : '') + rich(c.text) + srcRefs(c.sources) + '</div></div>';
  }
  function table(t, prefix) {
    return '<div class="table-wrap"><table><thead><tr>' + t.columns.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + t.rows.map(function (r, ri) {
        var id = prefix ? ' id="' + prefix + '-' + (ri + 1) + '" data-sid="' + prefix + '-' + (ri + 1) + '"' : '';
        return '<tr' + id + '>' + r.map(function (c, i) { return (i === 0 ? '<th scope="row">' : '<td>') + rich(c) + (i === 0 ? '</th>' : '</td>'); }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function dayKey(id) { return id.replace(/-/g, ''); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function lsJSON(k, def) { try { var v = JSON.parse(lsGet(k)); return v == null ? def : v; } catch (e) { return def; } }

  /* ---------- 日本時間 ---------- */
  function zoned(tz, date) {
    var parts = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(date || new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return { ymd: parts.year + '-' + parts.month + '-' + parts.day, min: (+parts.hour % 24) * 60 + +parts.minute, hm: parts.hour + ':' + parts.minute };
  }
  function fmtStamp(ms, tz) {
    return new Intl.DateTimeFormat('zh-TW', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
  }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
  // 把「9:00-11:00」「約 19:00」「15:05 台灣時間」「晚上」等轉成分鐘（日本時間），只用來排順序
  function parseTime(t) {
    var words = (D.meta && D.meta.timeWords) || {};
    var shift = t.indexOf('台灣時間') >= 0 ? 60 : 0;
    var start = null, end = null, m;
    var re = /(\d{1,2}):(\d{2})/g, all = [];
    while ((m = re.exec(t))) all.push(+m[1] * 60 + +m[2] + shift);
    Object.keys(words).forEach(function (w) {
      if (w.charAt(0) !== '_' && t.indexOf(w) === 0) { var x = words[w].split(':'); start = +x[0] * 60 + +x[1]; }
    });
    if (start === null && all.length) start = all.shift();
    if (all.length && /[-–]/.test(t)) end = all[0];
    return start === null ? null : { start: start, end: end };
  }

  /* ---------- 各分頁 ---------- */
  function legend() {
    return '<div class="legend">' + ['booked', 'notBooked', 'estimate', 'planned', 'mixed', 'suggested'].map(sBadge).join('') + vBadge() + '</div>' +
      '<p class="small muted">「部分已訂」＝住宿已訂，但同一列的移動或活動還沒訂（例如新幹線）。「已計畫・未訂」＝你已決定要去，但還沒買票。</p>';
  }

  function overviewPanel() {
    var m = D.meta;
    var h = '<div class="card intro"><h2>' + esc(m.fullTitle) + '</h2><p>' + esc(m.summary) + '</p></div>';
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
    h += '</ul><div class="card small muted">' + esc(m.legendNote) + (m.mapsNote ? '<br>' + esc(m.mapsNote) : '') + '</div>';
    return h;
  }

  function itemLi(it) {
    return '<li class="tl st-' + it.status + '"' + sid(it) + '><div class="tl-time">' + esc(it.time) + '</div><div class="tl-body">' +
      '<div class="tl-text">' + rich(it.text) + '</div><div class="tl-meta">' + sBadge(it.status) +
      (needsVerify({ text: it.text }) ? vBadge() : '') + '<span class="cat">' + esc(it.category) + '</span>' + srcRefs(it.sources) + '</div>' + navBtns(it) + '</div></li>';
  }

  function dayPanel(d) {
    var k = dayKey(d.id);
    var h = '<div class="dayhead" id="dh-' + k + '" data-sid="dh-' + k + '"><div class="dayhead-date">' + esc(d.label) + '（' + esc(d.weekday) + '）</div>' +
      '<h2>' + esc(d.title) + '</h2>' +
      '<div class="dayhead-stay"><span class="lbl">今晚</span> <span>' + esc(d.stay.name) + '</span> ' + sBadge(d.stay.status) +
      '</div><div class="dayhead-base"><span class="lbl">落腳</span> ' + esc(d.base) + '</div></div>';
    if (d.alert) h += callout(d.alert, 'warning');
    h += '<ol class="timeline">' + d.items.map(itemLi).join('') + '</ol>';
    if (d.notes && d.notes.length) h += '<h3 class="sec">提醒</h3><ul class="notes">' + d.notes.map(noteLi).join('') + '</ul>';
    if (d.blog && d.blog.length) {
      h += '<details class="blog"><summary>部落格補充（' + d.blog.length + '）<span class="muted small">非草案正文，僅供參考</span></summary><ul class="notes">' +
        d.blog.map(function (b) {
          return '<li class="note"' + sid(b) + '>' + (needsVerify(b) ? vBadge() + ' ' : '') + (b.prequake ? '<span class="badge b-old">震前</span> ' : '') + rich(b.text) +
            (b.from ? '<div class="from">— ' + rich(b.from) + '</div>' : '') + srcRefs(b.sources) + '</li>';
        }).join('') + '</ul><p class="small muted">' + esc(D.meta.blogNote) + '</p></details>';
    }
    return h;
  }

  function daysTab() {
    var chips = [{ id: 'overview', label: '總覽', wd: '' }].concat(D.days.map(function (d) { return { id: d.id, label: d.label, wd: d.weekday }; }));
    var h = '<div id="nowcard" class="nowcard" hidden></div>';
    chips.forEach(function (c, i) {
      h += '<input type="radio" class="sr" name="day" id="day-' + dayKey(c.id) + '" value="' + c.id + '"' + (i === 0 ? ' checked' : '') + '>';
    });
    h += '<nav class="chips" aria-label="選擇日期"><div class="chips-inner">' + chips.map(function (c) {
      return '<label class="chip" for="day-' + dayKey(c.id) + '" data-day="' + c.id + '"><span class="chip-l">' + esc(c.label) + '</span>' +
        '<span class="chip-w">' + (c.wd ? esc(c.wd) : '全部') + '</span></label>';
    }).join('') + '</div></nav><div class="daypanels">';
    h += '<div class="daypanel dp-overview">' + overviewPanel() + '</div>';
    D.days.forEach(function (d) { h += '<div class="daypanel dp-' + dayKey(d.id) + '">' + dayPanel(d) + '</div>'; });
    return h + '</div>';
  }

  function staysTab() {
    var S = D.stays, h = '<h2 class="ptitle">住宿</h2><ul class="cards">';
    S.nights.forEach(function (n) {
      h += '<li class="card stay st-' + n.status + (n.highlight ? ' hl' : '') + '"' + sid(n) + '><div class="stay-top"><span class="stay-n">' + esc(n.nights) + '</span>' + sBadge(n.status) + '</div>' +
        '<div class="stay-name">' + esc(n.name) + '</div><div class="muted">' + esc(n.area) + (n.via ? '・' + esc(n.via) : '') + '</div>' +
        (n.details ? '<ul class="notes compact">' + n.details.map(noteLi).join('') + '</ul>' : '') + srcRefs(n.sources) + navBtns(n) + '</li>';
    });
    h += '</ul>';
    var N = S.night27;
    h += '<h3 class="sec">12/27 住宿與 safari 怎麼排 ' + sBadge('notBooked') + '</h3>' + callout(N.callout, 'info') + table(N.compare, 'cmp27');
    N.candidates.forEach(function (c) {
      h += '<div class="card cand"' + sid(c) + '><div class="stay-top"><span class="stay-n">' + esc(c.label) + '</span>' + sBadge(c.status) + '</div><div class="stay-name">' + esc(c.name) + '</div>' +
        '<p>' + (needsVerify(c) ? vBadge() + ' ' : '') + rich(c.text) + '</p>' + srcRefs(c.sources) + navBtns(c) + '</div>';
    });
    h += '<ul class="notes">' + N.notes.map(noteLi).join('') + '</ul>';
    if (S.alternatives && S.alternatives.length) h += '<h3 class="sec">其他換住參考（未訂）</h3><ul class="notes">' + S.alternatives.map(noteLi).join('') + '</ul>';
    return h;
  }

  function transportTab() {
    var T = D.transport, h = '<h2 class="ptitle">交通與租車</h2>';
    h += '<h3 class="sec">機票</h3><ul class="cards">' + T.flights.map(function (f) {
      return '<li class="card flight"' + sid(f) + '><div class="stay-top"><span class="stay-n">' + esc(f.label) + '</span>' + sBadge(f.status) + '</div><div>' + esc(f.text) + '</div>' + navBtns(f) + '</li>';
    }).join('') + '</ul>';
    h += '<h3 class="sec">租車 ' + sBadge('estimate') + '</h3>' + callout(T.car.callout, 'warning');
    h += '<dl class="props">' + T.car.props.map(function (p) {
      return '<div class="prop' + (p.important ? ' imp' : '') + '"' + sid(p) + '><dt>' + esc(p.label) + '</dt><dd>' + (needsVerify(p) ? vBadge() + ' ' : '') + rich(p.value) + navBtns(p) + '</dd></div>';
    }).join('') + '</dl>' + srcRefs(T.car.sources);
    h += '<h3 class="sec">各段移動時間</h3>' + table(T.legs, 'leg') + '<p class="small">' + (needsVerify(T.legs.note) ? vBadge() + ' ' : '') + rich(T.legs.note) + '</p>' + srcRefs(T.legs.sources);
    h += '<h3 class="sec">交通提醒</h3><ul class="notes">' + T.notes.map(noteLi).join('') + '</ul>';
    return h;
  }

  function noticesTab() {
    var N = D.notices, h = '<h2 class="ptitle">注意事項</h2>';
    h += '<h3 class="sec">重要提醒</h3><ul class="notes">' + N.general.map(noteLi).join('') + '</ul>';
    h += '<h3 class="sec">年末年始與時事提醒</h3>' + callout(N.railAlert, 'warning') + '<ul class="notes">' + N.yearEnd.map(noteLi).join('') + '</ul>';
    h += '<h3 class="sec">' + esc(N.closures.title) + '</h3><ul class="closures">' + N.closures.items.map(function (c) {
      return '<li' + sid(c) + '><span class="cdate">' + esc(c.date) + '</span><span>' + rich(c.text) + '</span></li>';
    }).join('') + '</ul>';
    return h;
  }

  function collectVerify() {
    var out = [];
    D.days.forEach(function (d) {
      d.items.forEach(function (it) { if (needsVerify({ text: it.text })) out.push({ day: d, id: it.id, text: it.time + '｜' + it.text }); });
      (d.notes || []).forEach(function (n) { if (needsVerify(n)) out.push({ day: d, id: n.id, text: n.text }); });
    });
    return out;
  }
  function checkRow(id, inner, lockedDone) {
    var cid = 'chk-' + id;
    return '<li class="todo' + (lockedDone ? ' done locked' : '') + '"' + (id ? ' data-sid="' + esc(id) + '" id="' + esc(id) + '"' : '') + '>' +
      '<input type="checkbox" class="todo-cb" id="' + esc(cid) + '" data-check-id="' + esc(id) + '"' + (lockedDone ? ' checked disabled' : '') + '>' +
      '<label class="box" for="' + esc(cid) + '" aria-label="勾選"></label><span class="todo-body">' + inner + '</span></li>';
  }

  function todosTab() {
    var h = '<h2 class="ptitle">待辦與待查</h2>';
    h += '<div class="card progress-card"><div class="prog-top"><span id="prog-text" class="prog-text"></span>' +
      '<button type="button" class="btn-small needs-js" id="clear-checks">清除我的勾選</button></div><div class="progbar"><span id="prog-bar"></span></div>' +
      '<p class="small muted">已訂項目依草案預設打勾，不能取消；其他項目的勾選只存在這支手機。</p></div>';
    h += '<h3 class="sec">待辦與確認狀態</h3><ul class="todos" data-group="todos">';
    D.todos.forEach(function (t) {
      var nb = /尚未/.test(t.meta || '');
      h += checkRow(t.id, '<span class="todo-text">' + esc(t.text) + '</span><span class="todo-meta">' +
        (t.done ? sBadge('booked') : (nb ? sBadge('notBooked') : '<span class="badge b-todo">待辦</span>')) + (t.meta ? '<span class="cat">' + esc(t.meta) + '</span>' : '') + '</span>', t.done);
    });
    h += '</ul><p class="small muted">' + esc(D.meta.statusAsOf) + '</p>';
    h += '<h3 class="sec">尚待另查的問題</h3><ul class="todos" data-group="questions">' + D.openQuestions.map(function (q) {
      if (typeof q === 'string') q = { text: q };
      return checkRow(q.id, '<span class="todo-text">' + rich(q.text) + '</span>', false);
    }).join('') + '</ul>';
    var v = collectVerify();
    h += '<h3 class="sec">各日「需再確認」清單 <span class="muted small">' + v.length + ' 項・點一下跳到該日</span></h3><ul class="vlist">';
    v.forEach(function (x) {
      h += '<li><label for="day-' + dayKey(x.day.id) + '" data-goto-day="' + x.day.id + '" data-goto-id="' + esc(x.id || '') + '" class="vrow"><span class="vday">' + esc(x.day.label) + '</span><span>' + rich(x.text) + '</span></label></li>';
    });
    return h + '</ul>';
  }

  function sourcesTab() {
    var h = '<h2 class="ptitle">來源（' + D.sources.length + '）</h2><p class="small muted">點標題開啟原始網頁（需網路）。行程中的「來源 N」對應下方編號。</p><ol class="sources">';
    D.sources.forEach(function (s) {
      h += '<li id="src-' + s.id + '" data-sid="src-' + s.id + '"><a href="' + esc(s.href) + '" target="_blank" rel="noopener"><span class="sid">' + s.id + '</span><span class="stitle">' + esc(s.title) + '</span><span class="ssite">' + esc(s.site) + '</span></a></li>';
    });
    h += '</ol><div class="card small muted about" id="about"><h3 class="sec" style="margin-top:0">關於</h3>' +
      '<p>App 版本 ' + APP_VERSION + '・行程資料更新 ' + esc(D.meta.dataVersion) + '</p>' +
      '<p>行程草案原稿（由 Tour 維護）：' + rich(D.meta.draftUrl) + '</p><p>' + esc(D.meta.statusAsOf) + '</p><p>本 app 不含任何訂位代碼、密碼或付款資料。</p></div>';
    return h;
  }

  function overlays() {
    return '<div class="overlay" id="search-ov" hidden role="dialog" aria-label="搜尋"><div class="ov-head">' +
      '<input type="search" id="search-input" placeholder="搜尋行程、住宿、交通、待辦…" enterkeyhint="search" autocomplete="off">' +
      '<button type="button" class="iconbtn" data-close aria-label="關閉">' + svg('close') + '</button></div>' +
      '<div class="ov-body"><p id="search-hint" class="small muted">輸入關鍵字，例如：熊本城、雪胎、指定席、safari</p><ul id="search-results" class="sresults"></ul></div></div>' +
      '<div class="overlay" id="rate-ov" hidden role="dialog" aria-label="匯率換算"><div class="ov-head"><div class="ov-title">匯率換算（日圓 ↔ 台幣）</div>' +
      '<button type="button" class="iconbtn" data-close aria-label="關閉">' + svg('close') + '</button></div><div class="ov-body">' +
      '<div class="card rate-card"><label class="rlabel" for="rate-input">匯率：100 日圓 ＝ ? 台幣</label>' +
      '<div class="rrow"><input id="rate-input" class="bigin" type="text" inputmode="decimal" placeholder="自己輸入，例如看銀行牌告" autocomplete="off"><button type="button" class="btn" id="rate-save">儲存</button></div>' +
      '<p id="rate-info" class="small muted"></p><button type="button" class="btn ghost" id="rate-fetch">線上更新匯率</button><p id="rate-msg" class="small" aria-live="polite"></p></div>' +
      '<div class="card"><label class="rlabel" for="jpy-input">日圓 ¥</label><input id="jpy-input" class="bigin" type="text" inputmode="decimal" placeholder="0" autocomplete="off">' +
      '<div class="quick">' + [1000, 5000, 10000, 500, 3000, 20000].map(function (n) { return '<button type="button" class="btn ghost" data-jpy="' + n + '">' + n.toLocaleString('en-US') + ' 円</button>'; }).join('') + '</div>' +
      '<label class="rlabel" for="twd-input">台幣 NT$</label><input id="twd-input" class="bigin" type="text" inputmode="decimal" placeholder="0" autocomplete="off">' +
      '<p class="small muted">兩個欄位都可以輸入，另一邊會自動換算。實際刷卡或換匯金額以銀行為準。</p></div></div></div>' +
      '<div id="update-toast" class="toast" hidden><button type="button" id="update-btn">有新版本，點一下更新</button></div>';
  }

  /* ---------- 組裝 ---------- */
  function render() {
    var root = document.getElementById('app');
    var h = '';
    TABS.forEach(function (t, i) { h += '<input type="radio" class="sr" name="tab" id="tab-' + t.id + '" value="' + t.id + '"' + (i === 0 ? ' checked' : '') + '>'; });
    h += '<header class="top"><div class="top-inner"><div class="brandwrap"><div class="brand">' + esc(D.meta.title) + '</div><div class="sub">每日行程</div></div>' +
      '<div class="hbtns needs-js"><button type="button" class="iconbtn" id="open-search" aria-label="搜尋">' + svg('search') + '</button>' +
      '<button type="button" class="iconbtn" id="open-rate" aria-label="匯率換算">' + svg('yen') + '</button></div></div></header>';
    h += '<main>';
    var builders = { days: daysTab, stays: staysTab, transport: transportTab, notices: noticesTab, todos: todosTab, sources: sourcesTab };
    TABS.forEach(function (t) { h += '<section class="panel" id="panel-' + t.id + '" aria-label="' + t.label + '">' + builders[t.id]() + '</section>'; });
    h += '<div class="foot small muted">App 版本 ' + APP_VERSION + '・行程資料更新 ' + esc(D.meta.dataVersion) + '・離線也可查看</div></main>';
    h += '<nav class="tabbar" aria-label="分頁">' + TABS.map(function (t) {
      return '<label class="tab" for="tab-' + t.id + '" data-tab="' + t.id + '">' + svg(t.icon) + '<span>' + t.label + '</span></label>';
    }).join('') + '</nav>' + overlays();
    root.innerHTML = h;

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

  function todayId() {
    var t = zoned(TZ_JP).ymd;
    for (var i = 0; i < D.days.length; i++) if (D.days[i].id === t) return t;
    return null;
  }

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
  // 跳到某個項目並閃一下
  function jumpTo(sidVal) {
    var el = document.getElementById(sidVal);
    if (!el) return;
    var panel = el.closest('.panel'), dp = el.closest('.daypanel');
    if (panel) selectTab(panel.id.replace('panel-', ''), false);
    if (dp) { var k = (dp.className.match(/dp-(\w+)/) || [])[1]; var day = k === 'overview' ? 'overview' : k.slice(0, 4) + '-' + k.slice(4, 6) + '-' + k.slice(6); selectDay(day, false); }
    var det = el.closest('details'); if (det) det.open = true;
    setTimeout(function () {
      el.scrollIntoView({ block: 'center' });
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
      setTimeout(function () { el.classList.remove('flash'); }, 2600);
    }, 30);
  }

  /* ---------- 現在／下一站 ---------- */
  function timedItems(d) {
    return d.items.map(function (it, i) { var p = parseTime(it.time); return p ? { it: it, start: p.start, end: p.end, i: i, day: d } : null; })
      .filter(Boolean).sort(function (a, b) { return a.start - b.start || a.i - b.i; });
  }
  function nowRow(kind, x, extra) {
    var it = x.it, m = (it.maps || [])[0];
    return '<div class="nrow"><div class="nkind">' + kind + '</div><div class="nbody"><div class="ntime">' + esc(extra || '') + esc(it.time) + '</div>' +
      '<div class="ntext">' + esc(it.text) + '</div><div class="nmeta">' + sBadge(it.status) + (needsVerify({ text: it.text }) ? vBadge() : '') +
      '<button type="button" class="linkbtn" data-jump="' + esc(it.id) + '">看細節</button></div>' +
      (m ? '<a class="navbtn big" href="' + esc(mapUrl(m.q)) + '" target="_blank" rel="noopener" data-map-q="' + esc(m.q) + '">' + svg('nav') + '<span>導航・' + esc(m.label || m.q) + '</span></a>' : '') +
      '</div></div>';
  }
  function renderNowCard() {
    var el = document.getElementById('nowcard');
    if (!el || !D) return;
    var z = zoned(TZ_JP), first = D.days[0], last = D.days[D.days.length - 1];
    var h = '';
    if (z.ymd < first.id) {
      var n = daysBetween(z.ymd, first.id), f = timedItems(first)[0];
      h = '<div class="ntitle">距離出發還有 <b>' + n + '</b> 天</div>' + (f ? nowRow('第一站', f, first.label + ' ') : '');
    } else if (z.ymd > last.id) {
      el.hidden = true; el.innerHTML = ''; return;
    } else {
      var idx = -1;
      D.days.forEach(function (d, i) { if (d.id === z.ymd) idx = i; });
      var day = D.days[idx], items = timedItems(day), cur = null, next = null;
      items.forEach(function (x) { if (x.start <= z.min) cur = x; else if (!next) next = x; });
      if (cur && cur.end != null && z.min >= cur.end) cur = null;
      h = '<div class="ntitle">今天 ' + esc(day.label) + '（' + esc(day.weekday) + '）・日本時間 ' + z.hm + '</div>';
      h += cur ? nowRow('現在', cur) : '<div class="nrow empty"><div class="nkind">現在</div><div class="nbody muted">目前沒有排定的項目</div></div>';
      if (next) h += nowRow('下一站', next);
      else if (D.days[idx + 1]) { var t = timedItems(D.days[idx + 1])[0]; if (t) h += nowRow('明天', t, D.days[idx + 1].label + ' '); }
      else h += '<div class="nrow empty"><div class="nkind">下一站</div><div class="nbody muted">今天是最後一天，平安回家！</div></div>';
      h += '<p class="small muted nfoot">依手機時間換算日本時間；「上午／晚上」等只是大約順序，「選配」等未定時間的項目不列入。</p>';
    }
    el.innerHTML = h; el.hidden = false;
  }

  /* ---------- 待辦打勾 ---------- */
  function applyChecks() {
    var checks = lsJSON(LS_CHECKS, {});
    var boxes = document.querySelectorAll('.todo-cb'), done = 0;
    boxes.forEach(function (b) {
      if (!b.disabled) b.checked = !!checks[b.getAttribute('data-check-id')];
      b.closest('.todo').classList.toggle('done', b.checked);
      if (b.checked) done++;
    });
    var pt = document.getElementById('prog-text'), pb = document.getElementById('prog-bar');
    if (pt) pt.textContent = '完成 ' + done + ' / ' + boxes.length;
    if (pb) pb.style.width = (boxes.length ? Math.round(done * 100 / boxes.length) : 0) + '%';
  }

  /* ---------- 搜尋 ---------- */
  var FOLD = { '黒': '黑', '温': '溫', '駅': '站', '桜': '櫻', '広': '廣', '沢': '澤', '戸': '戶', '鉄': '鐵', '台': '臺' };
  function fold(s) { return String(s).toLowerCase().replace(/[黒温駅桜広沢戸鉄台]/g, function (c) { return FOLD[c]; }); }
  function searchIndex() {
    var tabLabel = {}; TABS.forEach(function (t) { tabLabel[t.id] = t.label; });
    return Array.prototype.map.call(document.querySelectorAll('main [data-sid]'), function (el) {
      var panel = el.closest('.panel'), dp = el.closest('.daypanel'), where = tabLabel[panel.id.replace('panel-', '')];
      if (dp) { var dh = dp.querySelector('.dayhead-date'); if (dh) where = dh.textContent; }
      var cl = el.cloneNode(true);
      Array.prototype.forEach.call(cl.querySelectorAll('.badge,.navrow,.refs,.cat,.box,.todo-cb,.mapnote'), function (x) { x.remove(); });
      var text = cl.textContent.replace(/\s+/g, ' ').trim();
      return { id: el.getAttribute('data-sid'), where: where, text: text, f: fold(text) };
    });
  }
  function snippet(text, q) {
    var i = fold(text).indexOf(q), start = Math.max(0, i - 24), s = text.slice(start, i + q.length + 60);
    var j = i - start;
    return (start > 0 ? '…' : '') + esc(s.slice(0, j)) + '<mark>' + esc(s.slice(j, j + q.length)) + '</mark>' + esc(s.slice(j + q.length)) + (i + q.length + 60 < text.length ? '…' : '');
  }
  var IDX = null;
  function doSearch(raw) {
    var q = fold(raw.trim()), list = document.getElementById('search-results'), hint = document.getElementById('search-hint');
    if (!q) { list.innerHTML = ''; hint.textContent = '輸入關鍵字，例如：熊本城、雪胎、指定席、safari'; return; }
    IDX = IDX || searchIndex();
    var terms = q.split(/\s+/);
    var res = IDX.filter(function (r) { return terms.every(function (t) { return r.f.indexOf(t) >= 0; }); });
    hint.textContent = res.length ? '找到 ' + res.length + ' 筆，點一下前往' : '找不到「' + raw.trim() + '」';
    list.innerHTML = res.slice(0, 80).map(function (r) {
      return '<li><button type="button" class="sres" data-jump="' + esc(r.id) + '"><span class="swhere">' + esc(r.where) + '</span><span class="stext">' + snippet(r.text, terms[0]) + '</span></button></li>';
    }).join('');
  }
  function openOv(id) {
    var ov = document.getElementById(id); ov.hidden = false; document.body.classList.add('ov-open');
    if (id === 'search-ov') { var i = document.getElementById('search-input'); setTimeout(function () { i.focus(); }, 30); }
    if (id === 'rate-ov') showRate();
  }
  function closeOv() {
    document.querySelectorAll('.overlay').forEach(function (o) { o.hidden = true; });
    document.body.classList.remove('ov-open');
  }

  /* ---------- 匯率 ---------- */
  function num(s) { var v = parseFloat(String(s).replace(/[,，\s]/g, '')); return isFinite(v) ? v : NaN; }
  function getRate() { return lsJSON(LS_RATE, null); } // {perJpy, savedAt, source, sourceTime}
  function showRate() {
    var r = getRate(), info = document.getElementById('rate-info'), inp = document.getElementById('rate-input');
    if (r && r.perJpy) {
      if (document.activeElement !== inp) inp.value = +(r.perJpy * 100).toFixed(4);
      info.innerHTML = '目前使用：100 日圓 ＝ <b>' + esc((r.perJpy * 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')) + '</b> 台幣<br>' +
        (r.source === 'manual' ? '來源：手動輸入・' + esc(fmtStamp(r.savedAt, TZ_TW)) + '（台北時間）'
          : '來源：' + esc(r.source) + '・取得於 ' + esc(fmtStamp(r.savedAt, TZ_TW)) + '（台北時間）' + (r.sourceTime ? '<br>匯率資料更新：' + esc(fmtStamp(r.sourceTime, TZ_TW)) + '（台北時間）' : ''));
    } else info.textContent = '還沒有匯率。請手動輸入，或按「線上更新匯率」。';
    convert('jpy');
  }
  function fmtNum(v, dp) { return isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: dp }) : ''; }
  function convert(from) {
    var r = getRate(), j = document.getElementById('jpy-input'), t = document.getElementById('twd-input');
    if (!r || !r.perJpy) return;
    if (from === 'jpy') { var v = num(j.value); t.value = j.value.trim() === '' ? '' : fmtNum(v * r.perJpy, 0); }
    else { var w = num(t.value); j.value = t.value.trim() === '' ? '' : fmtNum(w / r.perJpy, 0); }
  }
  function saveManual() {
    var v = num(document.getElementById('rate-input').value), msg = document.getElementById('rate-msg');
    if (!(v > 0)) { msg.textContent = '請輸入大於 0 的數字（100 日圓可換多少台幣）。'; return; }
    lsSet(LS_RATE, JSON.stringify({ perJpy: v / 100, savedAt: Date.now(), source: 'manual' }));
    msg.textContent = '已儲存。'; showRate();
  }
  function fetchRate() {
    var msg = document.getElementById('rate-msg');
    msg.textContent = '更新中…';
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
    fetch(RATE_API, { cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        var twd = j && j.rates && j.rates.TWD;
        if (j.result !== 'success' || !(twd > 0)) throw new Error('資料格式不對');
        lsSet(LS_RATE, JSON.stringify({ perJpy: twd, savedAt: Date.now(), source: 'ExchangeRate-API（open.er-api.com）', sourceTime: (j.time_last_update_unix || 0) * 1000 || null }));
        msg.textContent = '已更新。'; showRate();
      }).catch(function (e) {
        clearTimeout(timer);
        msg.textContent = '無法線上更新（' + (navigator.onLine === false ? '目前離線' : (e && e.message) || '連線失敗') + '），繼續使用已儲存的匯率。';
      });
  }

  /* ---------- 互動 ---------- */
  var wired = false;
  function wire() {
    if (!wired) {
      wired = true;
      document.addEventListener('change', function (e) {
        var t = e.target;
        if (t.name === 'tab') selectTab(t.value);
        if (t.name === 'day') selectDay(t.value);
        if (t.classList && t.classList.contains('todo-cb') && !t.disabled) {
          var c = lsJSON(LS_CHECKS, {}), id = t.getAttribute('data-check-id');
          if (t.checked) c[id] = Date.now(); else delete c[id];
          lsSet(LS_CHECKS, JSON.stringify(c)); applyChecks();
        }
      });
      document.addEventListener('click', function (e) {
        var t = e.target;
        var j = t.closest && t.closest('[data-jump]');
        if (j) { closeOv(); jumpTo(j.getAttribute('data-jump')); return; }
        var g = t.closest && t.closest('[data-goto-day]');
        if (g && !t.closest('a')) {
          e.preventDefault(); selectTab('days'); selectDay(g.getAttribute('data-goto-day'));
          var gid = g.getAttribute('data-goto-id'); if (gid) jumpTo(gid);
          return;
        }
        if (t.closest('#open-search')) return openOv('search-ov');
        if (t.closest('#open-rate')) return openOv('rate-ov');
        if (t.closest('[data-close]')) return closeOv();
        if (t.closest('#clear-checks')) {
          if (window.confirm('要清除這支手機上所有自己打的勾嗎？（已訂項目不受影響）')) { lsSet(LS_CHECKS, '{}'); applyChecks(); }
          return;
        }
        if (t.closest('#rate-save')) return saveManual();
        if (t.closest('#rate-fetch')) return fetchRate();
        var q = t.closest('[data-jpy]');
        if (q) { document.getElementById('jpy-input').value = (+q.getAttribute('data-jpy')).toLocaleString('en-US'); convert('jpy'); return; }
        if (t.closest('#update-btn')) { applyUpdate(); }
      });
      document.addEventListener('input', function (e) {
        if (e.target.id === 'search-input') doSearch(e.target.value);
        if (e.target.id === 'jpy-input') convert('jpy');
        if (e.target.id === 'twd-input') convert('twd');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeOv();
        if (e.key === 'Enter' && e.target.id === 'rate-input') saveManual();
      });
      setInterval(renderNowCard, 60000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) renderNowCard(); });
    }
    var today = todayId();
    var tab = lsGet(LS_TAB) || 'days';
    var day = today || lsGet(LS_DAY) || 'overview';
    selectTab(tab, false);
    selectDay(day, false);
    if (today) { var chip = document.querySelector('.chip[data-day="' + today + '"]'); if (chip) chip.classList.add('is-today'); }
    renderNowCard();
    applyChecks();
  }

  /* ---------- Service worker 與更新提示 ---------- */
  var waitingSW = null, userAskedUpdate = false;
  function showUpdate(sw) { waitingSW = sw; var t = document.getElementById('update-toast'); if (t) t.hidden = false; }
  function applyUpdate() {
    userAskedUpdate = true;
    if (waitingSW) waitingSW.postMessage({ type: 'SKIP_WAITING' }); else location.reload();
  }
  function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:' || window.__KYUSHU_DATA__) return;
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        nw && nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(nw);
        });
      });
      document.addEventListener('visibilitychange', function () { if (!document.hidden) reg.update().catch(function () { }); });
    }).catch(function (e) { console.warn('SW 註冊失敗', e); });
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (userAskedUpdate) location.reload(); });
  }
  window.__kyushuShowUpdate = showUpdate; // 測試用

  function showError(msg) {
    document.getElementById('app').innerHTML = '<div class="card err"><h2>無法載入行程資料</h2><p>' + esc(msg) + '</p><p>請連上網路後重新開啟一次，之後就能離線使用。</p></div>';
  }
  function start(data) { D = data; render(); IDX = null; wire(); }
  function boot() {
    registerSW();
    if (window.__KYUSHU_DATA__) return start(window.__KYUSHU_DATA__); // 單檔版：用內嵌資料重新畫
    fetch('data.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(start).catch(function (e) { showError(String(e && e.message || e)); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
