/* Zero-width joiner counter. Everything runs in the page; nothing is uploaded. */
(function () {
  'use strict';

  var ZWJ = '\u200D';

  // GSM 03.38 default alphabet, ordered 0x00..0x7F (0x1B is the escape byte)
  var GSM7 =
    '@\u00A3$\u00A5\u00E8\u00E9\u00F9\u00EC\u00F2\u00C7\n\u00D8\u00F8\r\u00C5\u00E5' +
    '\u0394_\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039E\u001B\u00C6\u00E6\u00DF\u00C9' +
    ' !"#\u00A4%&\'()*+,-./' +
    '0123456789:;<=>?' +
    '\u00A1ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00C4\u00D6\u00D1\u00DC\u00A7' +
    '\u00BFabcdefghijklmnopqrstuvwxyz\u00E4\u00F6\u00F1\u00FC\u00E0';

  // Extension table, reached with an escape byte; each one costs two septets
  var EXT = '\f^{}\\[~]|\u20AC';

  var input = document.getElementById('zwj-input');
  var out = document.getElementById('zwj-out');
  var clean = document.getElementById('zwj-clean');

  if (!input) return;

  function utf16Units(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      n += c >= 0xd800 && c <= 0xdbff ? 2 : 1;
      if (c >= 0xd800 && c <= 0xdbff) i++;
    }
    return n;
  }

  function gsmUnits(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (GSM7.indexOf(ch) !== -1) n += 1;
      else if (EXT.indexOf(ch) !== -1) n += 2;
      else return null;
    }
    return n;
  }

  function graphemes(s) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      var seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
      var n = 0;
      var it = seg.segment(s);
      for (var v = it.next(); !v.done; v = it.next()) n++;
      return n;
    }
    return Array.from(s).length;
  }

  function segCount(units, single, multi) {
    if (units === 0) return 0;
    if (units <= single) return 1;
    return Math.ceil(units / multi);
  }

  function countZWJ(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) if (s[i] === ZWJ) n++;
    return n;
  }

  function esc(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function render(s) {
    var shown = [];
    for (var i = 0; i < s.length; i++) {
      var cp = s.codePointAt(i);
      if (cp > 0xffff) i++;
      if (cp === 0x200d) {
        shown.push('<span class="zwj-mark">\u200D</span>');
      } else {
        shown.push(esc(String.fromCodePoint(cp)));
      }
    }
    return shown.join('');
  }

  function measure(s) {
    var cp = Array.from(s).length;
    var u16 = utf16Units(s);
    var bytes = new TextEncoder().encode(s).length;
    var gr = graphemes(s);
    var z = countZWJ(s);
    var g = gsmUnits(s);
    var enc, units, segs, perSeg;

    if (g !== null) {
      enc = 'GSM-7';
      units = g;
      segs = segCount(g, 160, 153);
      perSeg = segs > 1 ? 153 : 160;
    } else {
      enc = 'UCS-2';
      units = u16;
      segs = segCount(u16, 70, 67);
      perSeg = segs > 1 ? 67 : 70;
    }

    var rows = [
      ['Characters you can see', gr],
      ['Code points', cp],
      ['UTF-16 units', u16],
      ['Bytes in UTF-8', bytes],
      ['Zero-width joiners', z],
      ['SMS encoding', enc],
      ['Units billed', units + ' of ' + perSeg + ' per segment'],
      ['Segments charged', segs]
    ];

    var html = '<table><tbody>';
    for (var i = 0; i < rows.length; i++) {
      html +=
        '<tr><td class="cp">' +
        rows[i][0] +
        '</td><td class="name">' +
        rows[i][1] +
        '</td></tr>';
    }
    html += '</tbody></table>';

    if (s.length === 0) {
      out.innerHTML = '<p class="hint">Paste something and it is measured here.</p>';
      return;
    }

    var note = '';
    if (enc === 'UCS-2' && z > 0 && gsmUnits(s.split(ZWJ).join('')) !== null) {
      note =
        '<p class="hint">Take the ' +
        z +
        ' joiner' +
        (z === 1 ? '' : 's') +
        ' out and this drops back to GSM-7 &mdash; ' +
        segCount(gsmUnits(s.split(ZWJ).join('')), 160, 153) +
        ' segment' +
        (segCount(gsmUnits(s.split(ZWJ).join('')), 160, 153) === 1 ? '' : 's') +
        ' instead of ' +
        segs +
        '.</p>';
    }

    out.innerHTML =
      html +
      note +
      '<p class="hint">Joiners marked in the text above: ' +
      z +
      '.</p>' +
      '<div class="zwj-preview">' +
      render(s) +
      '</div>';
  }

  function stripLoose(s) {
    // Drop joiners that are not sitting between two emoji. Those are the ones
    // doing nothing; the ones between emoji are holding a picture together.
    return s.replace(
      /(?<!\p{Emoji})\u200D+|\u200D+(?!\p{Emoji})/gu,
      ''
    );
  }

  input.addEventListener('input', function () {
    measure(input.value);
  });

  if (clean) {
    clean.addEventListener('click', function () {
      input.value = stripLoose(input.value);
      measure(input.value);
    });
  }

  measure(input.value);
})();
