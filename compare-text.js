(function () {
  var SI = window.SI;
  var $ = function (id) { return document.getElementById(id); };

  var aEl = $('a');
  var bEl = $('b');
  var aCount = $('acount');
  var bCount = $('bcount');
  var summaryEl = $('summary');
  var firstEl = $('firstDiff');
  var allEl = $('allDiff');
  var reportEl = $('report');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function updateCounts() {
    var ac = Array.from(aEl.value).length;
    var bc = Array.from(bEl.value).length;
    aCount.textContent = ac + (ac === 1 ? ' character' : ' characters');
    bCount.textContent = bc + (bc === 1 ? ' character' : ' characters');
  }
  aEl.addEventListener('input', updateCounts);
  bEl.addEventListener('input', updateCounts);

  function codepoints(s) {
    var out = [];
    for (var i = 0; i < s.length;) {
      var cp = s.codePointAt(i);
      out.push({ cp: cp, ch: String.fromCodePoint(cp) });
      i += out[out.length - 1].ch.length;
    }
    return out;
  }

  function contextFor(cps, idx, before) {
    var start = Math.max(0, idx - before);
    var end = Math.min(cps.length, idx + before + 1);
    var frag = cps.slice(start, end).map(function (e) { return e.cp === -1 ? '\uFFFD' : e.ch; }).join('');
    return { text: frag, start: start };
  }

  function diff(a, b) {
    var A = codepoints(a);
    var B = codepoints(b);
    var n = Math.max(A.length, B.length);
    var positions = [];
    for (var i = 0; i < n; i++) {
      var ac = A[i] ? A[i].cp : null;
      var bc = B[i] ? B[i].cp : null;
      if (ac !== bc) positions.push(i);
    }
    return { A: A, B: B, positions: positions };
  }

  function chip(cp) {
    if (cp === null) return '<em>(end)</em>';
    var name = SI.cpName(cp);
    var label = SI.cpHex(cp);
    var printable = cp >= 0x20 && cp !== 0x7F;
    var shown = printable ? label + ' ' + (name || '') : label + (name ? ' ' + name : '');
    return '<code title="' + esc(shown) + '">' + esc(label) + '</code>';
  }

  function renderResult(res, label) {
    summaryEl.hidden = false;
    firstEl.hidden = false;
    allEl.hidden = false;

    if (res.positions.length === 0) {
      summaryEl.className = 'jsonstatus ok';
      summaryEl.innerHTML = '<strong>' + esc(label) + ': identical</strong><span>' +
        Array.from(res.A).length + ' character' + (Array.from(res.A).length === 1 ? '' : 's') +
        ' matched exactly</span>';
      firstEl.innerHTML = '';
      allEl.innerHTML = '';
      reportEl.innerHTML = '';
      return;
    }

    var total = res.positions.length;
    summaryEl.className = 'jsonstatus bad';
    summaryEl.innerHTML = '<strong>' + esc(label) + ': differ at ' + total +
      ' position' + (total === 1 ? '' : 's') + '</strong><span>comparing ' +
      Array.from(res.A).length + ' characters with ' + Array.from(res.B).length +
      ' characters</span>';

    // first difference panel
    var idx = res.positions[0];
    var ctxA = contextFor(res.A, idx, 20);
    var ctxB = contextFor(res.B, idx, 20);
    var ca = res.A[idx] ? res.A[idx].cp : null;
    var cb = res.B[idx] ? res.B[idx].cp : null;
    firstEl.innerHTML = '<h2>First difference (position ' + (idx + 1) + ')</h2>' +
      '<p><strong>A:</strong> ' + esc(ctxA.text) + '</p>' +
      '<p><strong>B:</strong> ' + esc(ctxB.text) + '</p>' +
      '<p>Character at A[' + (idx + 1) + ']: ' + chip(ca) + '</p>' +
      '<p>Character at B[' + (idx + 1) + ']: ' + chip(cb) + '</p>';

    // all-differences table
    var shown = res.positions.slice(0, 50);
    var html = '<h2>All differing positions</h2>';
    if (total > shown.length) {
      html += '<p class="hint">' + total + ' differences total. Showing the first ' +
        shown.length + '.</p>';
    }
    html += '<div class="scroll"><table><thead><tr><th>#</th><th>Position</th><th>A</th><th>B</th></tr></thead><tbody>';
    shown.forEach(function (i, n) {
      var aCp = res.A[i] ? res.A[i].cp : null;
      var bCp = res.B[i] ? res.B[i].cp : null;
      html += '<tr><td>' + (n + 1) + '</td><td>' + (i + 1) + '</td>' +
        '<td>' + chip(aCp) + (res.A[i] && res.A[i].cp !== -1 ? ' <span class="ent">' +
          (res.A[i].cp >= 0x20 && res.A[i].cp !== 0x7F ? '\'' + esc(res.A[i].ch) + '\'' : 'control') +
          '</span>' : '') + '</td>' +
        '<td>' + chip(bCp) + (res.B[i] && res.B[i].cp !== -1 ? ' <span class="ent">' +
          (res.B[i].cp >= 0x20 && res.B[i].cp !== 0x7F ? '\'' + esc(res.B[i].ch) + '\'' : 'control') +
          '</span>' : '') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    allEl.innerHTML = html;
  }

  function run(cleanFirst) {
    var a = aEl.value;
    var b = bEl.value;
    if (cleanFirst) {
      a = SI.cleanText(a, { aggressive: true, spaces: true }).text;
      b = SI.cleanText(b, { aggressive: true, spaces: true }).text;
    }
    var res = diff(a, b);
    renderResult(res, cleanFirst ? 'After cleaning' : 'As pasted');
  }

  $('cmp').addEventListener('click', function () { run(false); });
  $('cleanCmp').addEventListener('click', function () { run(true); });

  $('clr').addEventListener('click', function () {
    aEl.value = '';
    bEl.value = '';
    summaryEl.hidden = true;
    firstEl.hidden = true;
    allEl.hidden = true;
    reportEl.innerHTML = '';
    updateCounts();
  });

  updateCounts();
})();