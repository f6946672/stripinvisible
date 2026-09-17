(function () {
  var SI = window.SI;
  var $ = function (id) { return document.getElementById(id); };

  var input = $('jinput');
  var output = $('joutput');
  var fileEl = $('jfile');
  var countEl = $('jcount');
  var reportEl = $('report');
  var validEl = $('jvalid');
  var hlEl = $('jhighlight');
  var aggrEl = $('jaggressive');
  var spacesEl = $('jspaces');
  var copiedEl = $('jcopied');

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
    for (var i = 0; i < src.length;) {
      var cp = src.codePointAt(i);
      var ch = String.fromCodePoint(cp);
      i += ch.length;
      if (SI.isInvisible(cp)) { html += chip(cp, false); continue; }
      if (aggressive && SI.isConditionallyInvisible(cp)) { html += chip(cp, true); continue; }
      if (spaces && SI.isExoticSpace(cp)) { html += chip(cp, true); continue; }
      html += esc(ch);
    }
    hlEl.className = 'preview';
    hlEl.innerHTML = html;
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

  function renderValidity(text) {
    if (!text.trim()) {
      validEl.className = '';
      validEl.innerHTML = '';
      return;
    }

    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      validEl.className = 'jsonstatus bad';
      validEl.innerHTML = '<strong>Invalid JSON</strong><span>' + esc(e.message) + '</span>';
      return;
    }

    var kind = Array.isArray(parsed) ? 'array' : typeof parsed;
    var extra = '';
    if (Array.isArray(parsed)) {
      extra = 'top-level array, ' + parsed.length + ' item' + (parsed.length === 1 ? '' : 's');
    } else if (parsed && typeof parsed === 'object') {
      var keys = Object.keys(parsed);
      extra = 'top-level object, ' + keys.length + ' key' + (keys.length === 1 ? '' : 's');
    } else {
      extra = 'top-level ' + kind;
    }

    validEl.className = 'jsonstatus ok';
    validEl.innerHTML = '<strong>Valid JSON</strong><span>' + esc(extra) + '</span>';
  }

  $('jrun').addEventListener('click', function () {
    var aggressive = aggrEl.checked;
    var spaces = spacesEl.checked;

    var res = SI.cleanText(input.value, { aggressive: aggressive, spaces: spaces });
    output.value = res.text;
    renderReport(res);
    renderHighlight(aggressive, spaces);
    renderValidity(res.text);
  });

  $('jclear').addEventListener('click', function () {
    input.value = '';
    output.value = '';
    reportEl.innerHTML = '';
    validEl.className = '';
    validEl.innerHTML = '';
    fileEl.value = '';
    copiedEl.hidden = true;
    hlEl.className = 'preview empty';
    hlEl.textContent = 'Nothing scanned yet.';
    updateCount();
  });

  $('jcopy').addEventListener('click', function () {
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

  $('jdownload').addEventListener('click', function () {
    if (!output.value) return;
    var blob = new Blob([output.value], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  updateCount();
})();
