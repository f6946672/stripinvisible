(function () {
  var SI = window.SI;
  var $ = function (id) { return document.getElementById(id); };

  var input = $('zinput');
  var output = $('zoutput');
  var fileEl = $('zfile');
  var countEl = $('zcount');
  var reportEl = $('report');
  var hlEl = $('zhighlight');
  var spacesEl = $('zspaces');
  var typoEl = $('ztypography');
  var aggrEl = $('zaggressive');
  var copiedEl = $('zcopied');

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

  function chip(cp, soft) {
    var name = SI.cpName(cp);
    var label = SI.cpHex(cp);
    return '<mark class="chip' + (soft ? ' soft' : '') + '" title="' +
      esc(label + (name ? ' ' + name : '')) + '">' + esc(label) + '</mark>';
  }

  function renderHighlight(aggressive, spaces) {
    if (!input.value) {
      hlEl.className = 'preview empty';
      hlEl.textContent = 'Nothing scanned yet.';
      return;
    }

    var src = input.value;
    var html = '';
    var found = 0;

    for (var i = 0; i < src.length;) {
      var cp = src.codePointAt(i);
      var ch = String.fromCodePoint(cp);
      i += ch.length;

      if (SI.isInvisible(cp)) { html += chip(cp, false); found++; continue; }

      if (aggressive && SI.isConditionallyInvisible(cp)) { html += chip(cp, true); found++; continue; }

      if (spaces && SI.isExoticSpace(cp)) { html += chip(cp, true); found++; continue; }

      html += esc(ch);
    }

    hlEl.className = 'preview';
    hlEl.innerHTML = found ? html : esc(src);
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

  $('zrun').addEventListener('click', function () {
    var aggressive = aggrEl.checked;
    var spaces = spacesEl.checked;

    var res = SI.cleanText(input.value, {
      aggressive: aggressive,
      spaces: spaces,
      typography: typoEl.checked
    });

    output.value = res.text;
    renderReport(res);
    renderHighlight(aggressive, spaces);
  });

  $('zclear').addEventListener('click', function () {
    input.value = '';
    output.value = '';
    reportEl.innerHTML = '';
    fileEl.value = '';
    copiedEl.hidden = true;
    hlEl.className = 'preview empty';
    hlEl.textContent = 'Nothing scanned yet.';
    updateCount();
  });

  $('zcopy').addEventListener('click', function () {
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

  $('zdownload').addEventListener('click', function () {
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
