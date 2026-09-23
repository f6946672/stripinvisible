/* Paste-to-check panel on /invisible-characters.
   Answers two questions only: are there any, and how many. Runs in the browser. */
(function () {
  var S = window.SI;
  var input = document.getElementById('checkin');
  var btn = document.getElementById('checkbtn');
  var clearBtn = document.getElementById('checkclear');
  var wide = document.getElementById('chk-wide');
  var out = document.getElementById('checkout');
  var actions = document.getElementById('checkactions');
  var copyBtn = document.getElementById('checkcopy');
  var msg = document.getElementById('checkmsg');

  if (!S || !input || !btn || !out) return;

  var cleaned = '';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function scan(text, includeWide) {
    var counts = new Map();
    for (var i = 0; i < text.length;) {
      var cp = text.codePointAt(i);
      var ch = String.fromCodePoint(cp);
      i += ch.length;
      if (S.isInvisible(cp)) {
        counts.set(cp, (counts.get(cp) || 0) + 1);
      } else if (includeWide && (S.isConditionallyInvisible(cp) || S.isExoticSpace(cp))) {
        counts.set(cp, (counts.get(cp) || 0) + 1);
      }
    }
    return counts;
  }

  function render() {
    var text = input.value;

    if (!text) {
      out.innerHTML = '<p class="verdict idle">Nothing scanned yet.</p>';
      actions.hidden = true;
      cleaned = '';
      return;
    }

    var counts = scan(text, !!wide.checked);
    var total = 0;
    counts.forEach(function (n) { total += n; });

    if (!total) {
      out.innerHTML = '<p class="verdict ok">None found in ' +
        text.length + ' characters. Nothing here is invisible.</p>';
      actions.hidden = true;
      cleaned = '';
      if (msg) msg.textContent = '';
      return;
    }

    var rows = [];
    counts.forEach(function (n, cp) { rows.push([cp, n]); });
    rows.sort(function (a, b) { return b[1] - a[1]; });

    var html = '<p class="verdict bad">' + total + (total === 1 ? ' invisible character' : ' invisible characters') +
      ' found in ' + text.length + ' characters.</p>';
    html += '<div class="scroll"><table class="found"><thead><tr><th>Codepoint</th><th>Name</th><th>Count</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr><td class="cp">' + S.cpHex(r[0]) + '</td>' +
        '<td class="nm">' + esc(S.cpName(r[0]) || 'Unnamed') + '</td>' +
        '<td>' + r[1] + '</td></tr>';
    });
    html += '</tbody></table></div>';

    out.innerHTML = html;
    cleaned = S.cleanText(text, { aggressive: !!wide.checked, spaces: !!wide.checked }).text;
    actions.hidden = false;
    if (msg) msg.textContent = '';
  }

  function flash(text) {
    if (!msg) return;
    msg.textContent = text;
    setTimeout(function () { msg.textContent = ''; }, 1800);
  }

  function copy(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(okMsg); },
        function () { flash('Copy failed — select it manually'); });
    } else {
      flash('Copy failed — select it manually');
    }
  }

  btn.addEventListener('click', render);
  input.addEventListener('input', render);
  if (wide) wide.addEventListener('change', render);

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      input.value = '';
      render();
      input.focus();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () { copy(cleaned, 'Cleaned text copied'); });
  }
})();
