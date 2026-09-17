(function () {
  var SI = window.SI;
  var $ = function (id) { return document.getElementById(id); };

  var input = $('xinput');
  var output = $('xoutput');
  var fileEl = $('xfile');
  var countEl = $('xcount');
  var reportEl = $('report');
  var spacesEl = $('xspaces');
  var aggrEl = $('xaggressive');
  var copiedEl = $('xcopied');

  function updateCount() {
    var chars = Array.from(input.value).length;
    var lines = input.value ? input.value.replace(/\n$/, '').split('\n').length : 0;
    countEl.textContent = chars + (chars === 1 ? ' character' : ' characters') +
      (lines ? ' · ' + lines + (lines === 1 ? ' cell' : ' cells') : '');
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
      html += '<tr><td class="cp">' + SI.cpHex(r[0]) + '</td><td class="name">' +
        esc(SI.cpName(r[0])) + '</td><td>' + r[1] + '</td></tr>';
    });
    html += '</tbody></table></div>';
    reportEl.innerHTML = html;
  }

  $('xrun').addEventListener('click', function () {
    var res = SI.cleanText(input.value, {
      aggressive: aggrEl.checked,
      spaces: spacesEl.checked
    });
    output.value = res.text;
    renderReport(res);
  });

  $('xclear').addEventListener('click', function () {
    input.value = '';
    output.value = '';
    reportEl.innerHTML = '';
    fileEl.value = '';
    copiedEl.hidden = true;
    updateCount();
  });

  $('xcopy').addEventListener('click', function () {
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

  $('xdownload').addEventListener('click', function () {
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
