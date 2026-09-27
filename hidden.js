/* Hidden character finder. Everything runs in the page; nothing is uploaded.
   Reports where each one sits, what the terminal prints for it, and whether the
   usual \p{C} cleanup pattern would actually catch it. */
(function () {
  'use strict';

  var NAMES = {
    0x00ad: 'SOFT HYPHEN',
    0x00a0: 'NO-BREAK SPACE',
    0x034f: 'COMBINING GRAPHEME JOINER',
    0x061c: 'ARABIC LETTER MARK',
    0x115f: 'HANGUL CHOSEONG FILLER',
    0x1160: 'HANGUL JUNGSEONG FILLER',
    0x180e: 'MONGOLIAN VOWEL SEPARATOR',
    0x200b: 'ZERO WIDTH SPACE',
    0x200c: 'ZERO WIDTH NON-JOINER',
    0x200d: 'ZERO WIDTH JOINER',
    0x200e: 'LEFT-TO-RIGHT MARK',
    0x200f: 'RIGHT-TO-LEFT MARK',
    0x2028: 'LINE SEPARATOR',
    0x2029: 'PARAGRAPH SEPARATOR',
    0x202a: 'LEFT-TO-RIGHT EMBEDDING',
    0x202b: 'RIGHT-TO-LEFT EMBEDDING',
    0x202c: 'POP DIRECTIONAL FORMATTING',
    0x202d: 'LEFT-TO-RIGHT OVERRIDE',
    0x202e: 'RIGHT-TO-LEFT OVERRIDE',
    0x202f: 'NARROW NO-BREAK SPACE',
    0x205f: 'MEDIUM MATHEMATICAL SPACE',
    0x2060: 'WORD JOINER',
    0x2061: 'FUNCTION APPLICATION',
    0x2062: 'INVISIBLE TIMES',
    0x2063: 'INVISIBLE SEPARATOR',
    0x2064: 'INVISIBLE PLUS',
    0x2066: 'LEFT-TO-RIGHT ISOLATE',
    0x2067: 'RIGHT-TO-LEFT ISOLATE',
    0x2068: 'FIRST STRONG ISOLATE',
    0x2069: 'POP DIRECTIONAL ISOLATE',
    0x3000: 'IDEOGRAPHIC SPACE',
    0x3164: 'HANGUL FILLER',
    0xfeff: 'ZERO WIDTH NO-BREAK SPACE',
    0xfff9: 'INTERLINEAR ANNOTATION ANCHOR',
    0xfffa: 'INTERLINEAR ANNOTATION SEPARATOR',
    0xfffb: 'INTERLINEAR ANNOTATION TERMINATOR',
    0xffa0: 'HALFWIDTH HANGUL FILLER',
    0xe0001: 'LANGUAGE TAG'
  };

  var RANGES = [
    [0x2000, 0x200a, 'SPACE (fixed width)'],
    [0x206a, 0x206f, 'DEPRECATED FORMAT CONTROL'],
    [0xfe00, 0xfe0f, 'VARIATION SELECTOR'],
    [0xe0100, 0xe01ef, 'VARIATION SELECTOR SUPPLEMENT'],
    [0x180b, 0x180d, 'MONGOLIAN FREE VARIATION SELECTOR'],
    [0xe000, 0xf8ff, 'PRIVATE USE CHARACTER'],
    [0xf0000, 0xffffd, 'PRIVATE USE CHARACTER (plane 15)'],
    [0x100000, 0x10fffd, 'PRIVATE USE CHARACTER (plane 16)'],
    [0xe0020, 0xe007f, 'TAG CHARACTER']
  ];

  var RE_CF = /\p{Cf}/u;
  var RE_CC = /\p{Cc}/u;
  var RE_CO = /\p{Co}/u;
  var RE_C = /\p{C}/u;
  var RE_ZS = /\p{Zs}/u;
  var RE_ZL = /\p{Zl}/u;
  var RE_ZP = /\p{Zp}/u;
  var RE_MN = /\p{Mn}/u;

  var FILLERS = { 0x3164: 1, 0xffa0: 1, 0x115f: 1, 0x1160: 1 };

  var input = document.getElementById('hc-in');
  var out = document.getElementById('hc-out');
  var scan = document.getElementById('hc-scan');
  var clear = document.getElementById('hc-clear');
  var wide = document.getElementById('hc-wide');

  if (!input) return;

  function nameOf(cp) {
    if (NAMES[cp]) return NAMES[cp];
    for (var i = 0; i < RANGES.length; i++) {
      if (cp >= RANGES[i][0] && cp <= RANGES[i][1]) return RANGES[i][2];
    }
    if (cp === 0x20) return 'SPACE';
    return '';
  }

  function isControl(cp) {
    if (cp === 0x09 || cp === 0x0a || cp === 0x0d) return false;
    return cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f);
  }

  // Narrow: no ink, no width. Wide: also the ones that look like a space or a
  // letter slot but are not -- the three families the usual \p{C} sweep misses.
  function isHidden(ch, cp, w) {
    if (isControl(cp)) return true;
    if (RE_CF.test(ch)) return true;
    if (RE_CO.test(ch)) return true;
    if (cp >= 0xfe00 && cp <= 0xfe0f) return true;
    if (cp >= 0xe0100 && cp <= 0xe01ef) return true;
    if (cp >= 0x180b && cp <= 0x180d) return true;
    if (cp === 0x034f) return true;
    if (!w) return false;
    if (RE_ZS.test(ch) && cp !== 0x20) return true;
    if (RE_ZL.test(ch) || RE_ZP.test(ch)) return true;
    if (FILLERS[cp]) return true;
    return false;
  }

  /* Reproduce what GNU cat -v / cat -A print for one byte: high-bit bytes come
     out as M- plus the rendering of byte-128, control bytes as ^X. */
  function vChar(c) {
    if (c < 32) return '^' + String.fromCharCode(c + 64);
    if (c === 127) return '^?';
    return String.fromCharCode(c);
  }

  function catForm(ch) {
    var bytes = new TextEncoder().encode(ch);
    var s = '';
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i];
      s += b >= 128 ? 'M-' + vChar(b - 128) : vChar(b);
    }
    return s;
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function hex(cp) {
    var h = cp.toString(16).toUpperCase();
    while (h.length < 4) h = '0' + h;
    return 'U+' + h;
  }

  function byteLen(ch) {
    return new TextEncoder().encode(ch).length;
  }

  function run() {
    var text = input.value;
    var w = wide && wide.checked;

    if (text.length === 0) {
      out.innerHTML = '<p class="verdict idle">Nothing scanned yet.</p>';
      return;
    }

    var lines = text.split('\n');
    var hits = [];
    var total = 0;
    var bytePos = 0;

    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var chars = Array.from(line);
      for (var ci = 0; ci < chars.length; ci++) {
        var ch = chars[ci];
        var cp = ch.codePointAt(0);
        if (isHidden(ch, cp, w)) {
          hits.push({
            line: li + 1,
            col: ci + 1,
            byteAt: bytePos,
            cp: cp,
            ch: ch
          });
        }
        bytePos += byteLen(ch);
      }
      bytePos += 1; // the newline itself
    }

    total = hits.length;

    var html =
      '<p class="verdict ' +
      (total === 0 ? 'ok' : 'bad') +
      '">' +
      (total === 0
        ? 'None found in ' + Array.from(text).length + ' characters.'
        : total + ' hidden character' + (total === 1 ? '' : 's') + ' in ' + lines.length + ' line' + (lines.length === 1 ? '' : 's') + '.') +
      '</p>';

    if (total === 0) {
      out.innerHTML = html;
      return;
    }

    html += '<div class="scroll"><table><thead><tr>' +
      '<th>Where</th><th>Code point</th><th>Name</th>' +
      '<th>What <code>cat -A</code> prints</th><th>Bytes</th><th>Caught by <code>\\p{C}</code>?</th>' +
      '</tr></thead><tbody>';

    for (var i = 0; i < hits.length; i++) {
      var h = hits[i];
      var name = nameOf(h.cp) || 'UNNAMED';
      if (h.cp >= 0xe0020 && h.cp <= 0xe007f) {
        name = 'TAG CHARACTER hiding "' + esc(String.fromCharCode(h.cp - 0xe0000)) + '"';
      }
      var caught = RE_C.test(h.ch);
      html +=
        '<tr>' +
        '<td class="cp">line ' + h.line + ', col ' + h.col + '<div class="ent">byte ' + h.byteAt + '</div></td>' +
        '<td class="cp">' + hex(h.cp) + '</td>' +
        '<td class="name">' + esc(name) + '</td>' +
        '<td class="cp">' + esc(catForm(h.ch)) + '</td>' +
        '<td class="cp">' + byteLen(h.ch) + '</td>' +
        '<td class="cp">' + (caught ? 'yes' : '<strong>no</strong>') + '</td>' +
        '</tr>';
    }

    html += '</tbody></table></div>';

    var missed = 0;
    for (var j = 0; j < hits.length; j++) if (!RE_C.test(hits[j].ch)) missed++;
    if (missed > 0) {
      html +=
        '<p class="hint">' + missed + ' of them are missed by the <code>\\p{C}</code> pattern most cleanup snippets use.</p>';
    }

    out.innerHTML = html;
  }

  if (scan) scan.addEventListener('click', run);
  if (clear) {
    clear.addEventListener('click', function () {
      input.value = '';
      out.innerHTML = '<p class="verdict idle">Nothing scanned yet.</p>';
    });
  }
  if (wide) wide.addEventListener('change', run);

  run();
})();
