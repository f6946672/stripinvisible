(function () {
  'use strict';

  var BASE = 0xE0000;
  var TOP = 0xE007F;

  var input = document.getElementById('tginput');
  var output = document.getElementById('tgoutput');
  var report = document.getElementById('tgreport');
  var countEl = document.getElementById('tgcount');
  var copiedEl = document.getElementById('tgcopied');
  var msgEl = document.getElementById('tgmsg');

  if (!input || !output || !report) return;

  function hx(n, width) {
    var s = n.toString(16).toUpperCase();
    while (s.length < width) s = '0' + s;
    return s;
  }

  function utf8(str) {
    var out = [];
    if (typeof TextEncoder === 'function') {
      return Array.prototype.slice.call(new TextEncoder().encode(str));
    }
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
      else out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
    return out;
  }

  function bytesOfChar(cp) {
    return utf8(String.fromCodePoint(cp));
  }

  function isTag(cp) {
    return cp >= BASE && cp <= TOP;
  }

  function asciiName(n) {
    if (n >= 0x20 && n <= 0x7E) {
      return "'" + String.fromCharCode(n) + "'  (U+" + hx(n, 4) + ")";
    }
    return "control U+" + hx(n, 4);
  }

  function esc(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function updateCount() {
    var t = input.value;
    var cps = Array.from(t).length;
    var bytes = utf8(t).length;
    countEl.textContent = cps + ' code points, ' + t.length + ' UTF-16 units, ' + bytes + ' UTF-8 bytes';
  }

  function run() {
    var text = input.value;
    var cps = Array.from(text);
    var tags = [];
    var i;
    for (i = 0; i < cps.length; i++) {
      if (isTag(cps[i].codePointAt(0))) tags.push(cps[i].codePointAt(0));
    }

    if (!tags.length) {
      output.value = '';
      report.innerHTML = '<div class="verdict idle">No tag characters (U+E0000&ndash;U+E007F) in this text.</div>';
      return;
    }

    var decoded = '';
    for (i = 0; i < tags.length; i++) decoded += String.fromCharCode(tags[i] - BASE);
    output.value = decoded;

    var show = tags.slice(0, 8);
    var rows = '';
    for (i = 0; i < show.length; i++) {
      var b = bytesOfChar(show[i]);
      var hexs = [];
      for (var j = 0; j < b.length; j++) hexs.push(hx(b[j], 2));
      var n = show[i] - BASE;
      rows += '<tr><td>U+' + hx(show[i], 5) + '</td><td>' + hexs.join(' ') +
        '</td><td>' + hx(b[2] - 0x80, 2) + ', ' + hx(b[3] - 0x80, 2) +
        '</td><td>' + esc(asciiName(n)) + '</td></tr>';
    }

    var html = '<div class="verdict ok">' + tags.length + ' tag character' +
      (tags.length === 1 ? '' : 's') + ' found &mdash; they say: <code>' + esc(decoded) + '</code></div>';
    html += '<table class="found"><thead><tr><th>Code point</th><th>UTF-8 bytes</th>' +
      '<th>Last two, mask off</th><th>Mirrors</th></tr></thead><tbody>' + rows + '</tbody></table>';
    if (tags.length > show.length) {
      html += '<p class="hint">Showing the first ' + show.length + ' of ' + tags.length + '.</p>';
    }
    report.innerHTML = html;
  }

  function hide() {
    var msg = msgEl ? msgEl.value : '';
    if (!msg) return;
    var out = '';
    var skipped = 0;
    for (var i = 0; i < msg.length; i++) {
      var n = msg.charCodeAt(i);
      if (n >= 0x20 && n <= 0x7E) out += String.fromCodePoint(BASE + n);
      else skipped++;
    }
    input.value = 'Board report' + out + ' final';
    updateCount();
    run();
    if (skipped) {
      report.innerHTML += '<p class="hint">' + skipped + ' character' + (skipped === 1 ? '' : 's') +
        ' skipped &mdash; the block only mirrors printable ASCII.</p>';
    }
  }

  function copyOut() {
    if (!output.value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(output.value).then(flash, fallback);
    } else {
      fallback();
    }
  }

  function fallback() {
    output.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    flash();
  }

  function flash() {
    if (!copiedEl) return;
    copiedEl.hidden = false;
    setTimeout(function () { copiedEl.hidden = true; }, 1400);
  }

  var runBtn = document.getElementById('tgrun');
  var clearBtn = document.getElementById('tgclear');
  var hideBtn = document.getElementById('tghide');
  var copyBtn = document.getElementById('tgcopy');

  if (runBtn) runBtn.addEventListener('click', run);
  if (hideBtn) hideBtn.addEventListener('click', hide);
  if (copyBtn) copyBtn.addEventListener('click', copyOut);
  if (clearBtn) clearBtn.addEventListener('click', function () {
    input.value = '';
    output.value = '';
    report.innerHTML = '';
    updateCount();
  });
  if (msgEl) msgEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); hide(); }
  });
  input.addEventListener('input', updateCount);

  updateCount();
})();
