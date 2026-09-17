/* ===== PURE LOGIC START ===== */

var CP_NAMES = {
  0x00AD: 'SOFT HYPHEN',
  0x034F: 'COMBINING GRAPHEME JOINER',
  0x061C: 'ARABIC LETTER MARK',
  0x180B: 'MONGOLIAN FREE VARIATION SELECTOR ONE',
  0x180C: 'MONGOLIAN FREE VARIATION SELECTOR TWO',
  0x180D: 'MONGOLIAN FREE VARIATION SELECTOR THREE',
  0x200B: 'ZERO WIDTH SPACE',
  0x200C: 'ZERO WIDTH NON-JOINER',
  0x200D: 'ZERO WIDTH JOINER',
  0x200E: 'LEFT-TO-RIGHT MARK',
  0x200F: 'RIGHT-TO-LEFT MARK',
  0x2013: 'EN DASH',
  0x2014: 'EM DASH',
  0x2018: 'LEFT SINGLE QUOTATION MARK',
  0x2019: 'RIGHT SINGLE QUOTATION MARK',
  0x201A: 'SINGLE LOW-9 QUOTATION MARK',
  0x201B: 'SINGLE HIGH-REVERSED-9 QUOTATION MARK',
  0x201C: 'LEFT DOUBLE QUOTATION MARK',
  0x201D: 'RIGHT DOUBLE QUOTATION MARK',
  0x201E: 'DOUBLE LOW-9 QUOTATION MARK',
  0x201F: 'DOUBLE HIGH-REVERSED-9 QUOTATION MARK',
  0x2026: 'HORIZONTAL ELLIPSIS',
  0x202A: 'LEFT-TO-RIGHT EMBEDDING',
  0x202B: 'RIGHT-TO-LEFT EMBEDDING',
  0x202C: 'POP DIRECTIONAL FORMATTING',
  0x202D: 'LEFT-TO-RIGHT OVERRIDE',
  0x202E: 'RIGHT-TO-LEFT OVERRIDE',
  0x202F: 'NARROW NO-BREAK SPACE',
  0x2032: 'PRIME',
  0x2033: 'DOUBLE PRIME',
  0x205F: 'MEDIUM MATHEMATICAL SPACE',
  0x2060: 'WORD JOINER',
  0x2066: 'LEFT-TO-RIGHT ISOLATE',
  0x2067: 'RIGHT-TO-LEFT ISOLATE',
  0x2068: 'FIRST STRONG ISOLATE',
  0x2069: 'POP DIRECTIONAL ISOLATE',
  0x2E3A: 'TWO-EM DASH',
  0x2E3B: 'THREE-EM DASH',
  0x3000: 'IDEOGRAPHIC SPACE',
  0xFEFF: 'ZERO WIDTH NO-BREAK SPACE',
  0xFFF9: 'INTERLINEAR ANNOTATION ANCHOR',
  0xFFFA: 'INTERLINEAR ANNOTATION SEPARATOR',
  0xFFFB: 'INTERLINEAR ANNOTATION TERMINATOR'
};

var ALWAYS = [0x00AD, 0x034F, 0x200B, 0x2060, 0xFEFF, 0xFFF9, 0xFFFA, 0xFFFB];

var AGGRESSIVE = [
  0x061C, 0x180B, 0x180C, 0x180D,
  0x200C, 0x200D, 0x200E, 0x200F,
  0x202A, 0x202B, 0x202C, 0x202D, 0x202E,
  0x2066, 0x2067, 0x2068, 0x2069
];

var TYPO = new Map([
  [0x2018, "'"], [0x2019, "'"], [0x201A, "'"], [0x201B, "'"],
  [0x201C, '"'], [0x201D, '"'], [0x201E, '"'], [0x201F, '"'],
  [0x2026, '...'], [0x2013, '-'], [0x2032, "'"], [0x2033, '"']
]);

var EM = [0x2014, 0x2E3A, 0x2E3B];

function cpHex(cp) {
  var h = cp.toString(16).toUpperCase();
  while (h.length < 4) h = '0' + h;
  return 'U+' + h;
}

function cpName(cp) {
  if (CP_NAMES[cp]) return CP_NAMES[cp];
  if (cp === 0xE0001) return 'LANGUAGE TAG';
  if (cp >= 0xE0020 && cp <= 0xE007F) return 'TAG CHARACTER';
  if (cp >= 0xFE00 && cp <= 0xFE0F) return 'VARIATION SELECTOR';
  if (cp >= 0xE0100 && cp <= 0xE01EF) return 'VARIATION SELECTOR SUPPLEMENT';
  if (cp >= 0xE000 && cp <= 0xF8FF) return 'PRIVATE USE';
  if (cp >= 0xF0000 && cp <= 0xFFFFD) return 'PRIVATE USE PLANE 15';
  if (cp >= 0x100000 && cp <= 0x10FFFD) return 'PRIVATE USE PLANE 16';
  if (cp >= 0x2000 && cp <= 0x200A) return 'SPACE';
  if (cp === 0x00A0) return 'NO-BREAK SPACE';
  return '';
}

function isTag(cp) {
  return cp === 0xE0001 || (cp >= 0xE0020 && cp <= 0xE007F);
}

function isPUA(cp) {
  return (cp >= 0xE000 && cp <= 0xF8FF) ||
         (cp >= 0xF0000 && cp <= 0xFFFFD) ||
         (cp >= 0x100000 && cp <= 0x10FFFD);
}

function isVS(cp) {
  return (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF);
}

function isExoticSpace(cp) {
  return cp === 0x00A0 || (cp >= 0x2000 && cp <= 0x200A) ||
         cp === 0x202F || cp === 0x205F || cp === 0x3000;
}

function cleanText(input, opts) {
  opts = opts || {};
  var aggressive = !!opts.aggressive;
  var spaces = !!opts.spaces;
  var typography = !!opts.typography;
  var emdash = opts.emdash || 'keep';

  var removed = new Map();
  var out = '';

  function tally(cp) { removed.set(cp, (removed.get(cp) || 0) + 1); }

  for (var i = 0; i < input.length;) {
    var cp = input.codePointAt(i);
    var ch = String.fromCodePoint(cp);
    i += ch.length;

    if (ALWAYS.indexOf(cp) !== -1 || isTag(cp) || isPUA(cp)) { tally(cp); continue; }

    if (aggressive && (AGGRESSIVE.indexOf(cp) !== -1 || isVS(cp))) { tally(cp); continue; }

    if (spaces && isExoticSpace(cp)) { tally(cp); out += ' '; continue; }

    if (typography && TYPO.has(cp)) { tally(cp); out += TYPO.get(cp); continue; }

    if (EM.indexOf(cp) !== -1 && emdash !== 'keep') {
      tally(cp);
      if (emdash === 'replace') out += '-';
      continue;
    }

    out += ch;
  }

  return { text: out, removed: removed, before: input.length, after: out.length };
}

/* ===== PURE LOGIC END ===== */

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
