/* Character logic lives in core.js (window.SI). */
var cpHex = window.SI.cpHex;
var cpName = window.SI.cpName;
var cleanText = window.SI.cleanText;


(function () {
  var $ = function (id) { return document.getElementById(id); };

  var input = $('input');
  var output = $('output');
  var fileEl = $('file');
  var countEl = $('count');
  var reportEl = $('report');
  var emdashEl = $('emdash');
  var spacesEl = $('spaces');
  var typoEl = $('typography');
  var aggrEl = $('aggressive');
  var copiedEl = $('copied');

  function updateCount() {
    var n = Array.from(input.value).length;
    countEl.textContent = n + (n === 1 ? ' character' : ' characters');
  }

  input.addEventListener('input', updateCount);

  fileEl.addEventListener('change', function () {
    var f = fileEl.files && fileEl.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      input.value = String(r.result || '');
      updateCount();
    };
    r.readAsText(f);
  });

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderReport(res) {
    var rows = Array.from(res.removed.entries()).sort(function (a, b) { return b[1] - a[1]; });
    var total = rows.reduce(function (s, r) { return s + r[1]; }, 0);

    if (!total) {
      reportEl.innerHTML = '<p class="empty">No invisible characters found. Nothing was removed.</p>';
      return;
    }

    var html = '<p class="summary">' + total + ' character' + (total === 1 ? '' : 's') +
      ' removed &middot; ' + res.before + ' &rarr; ' + res.after + '</p>';
    html += '<div class="scroll"><table><thead><tr><th>Codepoint</th><th>Name</th><th>Count</th></tr></thead><tbody>';

    rows.forEach(function (r) {
      html += '<tr><td class="cp">' + cpHex(r[0]) + '</td><td class="name">' +
        esc(cpName(r[0])) + '</td><td>' + r[1] + '</td></tr>';
    });

    html += '</tbody></table></div>';
    reportEl.innerHTML = html;
  }

  $('run').addEventListener('click', function () {
    var res = cleanText(input.value, {
      aggressive: aggrEl.checked,
      spaces: spacesEl.checked,
      typography: typoEl.checked,
      emdash: emdashEl.value
    });
    output.value = res.text;
    renderReport(res);
  });

  $('clear').addEventListener('click', function () {
    input.value = '';
    output.value = '';
    reportEl.innerHTML = '';
    fileEl.value = '';
    copiedEl.hidden = true;
    updateCount();
  });

  $('copy').addEventListener('click', function () {
    if (!output.value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(output.value).then(showCopied, fallbackCopy);
    } else {
      fallbackCopy();
    }
  });

  function fallbackCopy() {
    output.removeAttribute('readonly');
    output.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    output.setAttribute('readonly', 'readonly');
    showCopied();
  }

  function showCopied() {
    copiedEl.hidden = false;
    setTimeout(function () { copiedEl.hidden = true; }, 1600);
  }

  $('download').addEventListener('click', function () {
    if (!output.value) return;
    var blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  updateCount();
})();
