(function () {
  var SI = window.SI;
  var $ = function (id) { return document.getElementById(id); };

  var input = $('winput');
  var output = $('woutput');
  var fileEl = $('wfile');
  var countEl = $('wcount');
  var countsEl = $('wcounts');
  var reportEl = $('wreport');
  var spacesEl = $('wspaces');
  var aggrEl = $('waggressive');
  var copiedEl = $('wcopied');

  function wordsIn(s) {
    var t = s.replace(/\s+/g, ' ').trim();
    if (!t) return 0;
    return t.split(' ').length;
  }

  function updateCount() {
    var n = Array.from(input.value).length;
    var w = wordsIn(input.value);
    countEl.textContent = n + (n === 1 ? ' character' : ' characters') +
      (w ? ' · ' + w + (w === 1 ? ' word' : ' words') : '');
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

  function renderCounts(before, after) {
    var wBefore = wordsIn(before);
    var wAfter = wordsIn(after);
    var cBefore = Array.from(before).length;
    var cAfter = Array.from(after).length;

    countsEl.hidden = false;
    var wordOk = wBefore === wAfter;
    countsEl.className = 'jsonstatus ' + (wordOk ? 'ok' : 'bad');
    countsEl.innerHTML =
      '<strong>Words: ' + wBefore + ' &rarr; ' + wAfter +
      (wordOk ? ' &middot; unchanged' : ' &middot; CHANGED — investigate') + '</strong>' +
      '<span>Characters: ' + cBefore + ' &rarr; ' + cAfter +
      ' (' + (cBefore - cAfter) + ' removed)</span>';
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
      html += '<tr><td class="cp">' + SI.cpHex(r[0]) + '</td><td class="name">' +
        esc(SI.cpName(r[0])) + '</td><td>' + r[1] + '</td></tr>';
    });
    html += '</tbody></table></div>';
    reportEl.innerHTML = html;
  }

  $('wrun').addEventListener('click', function () {
    var before = input.value;
    var res = SI.cleanText(before, {
      aggressive: aggrEl.checked,
      spaces: spacesEl.checked
    });
    output.value = res.text;
    renderCounts(before, res.text);
    renderReport(res);
  });

  $('wclear').addEventListener('click', function () {
    input.value = '';
    output.value = '';
    countsEl.hidden = true;
    reportEl.innerHTML = '';
    fileEl.value = '';
    copiedEl.hidden = true;
    updateCount();
  });

  $('wcopy').addEventListener('click', function () {
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

  $('wdownload').addEventListener('click', function () {
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