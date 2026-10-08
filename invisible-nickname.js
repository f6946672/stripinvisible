(function () {
  'use strict';

  // Everything here runs in the browser that is reading the page. Nothing is sent
  // anywhere: the four readings are four calls to primitives the platform itself
  // would have to use, and the widths are measured on the spot.

  var input = document.getElementById('nkinput');
  var avatar = document.getElementById('nkavatar');
  var out = document.getElementById('nkout');
  var facts = document.getElementById('nkfacts');
  var verdict = document.getElementById('nkverdict');
  if (!input || !avatar || !out || !facts || !verdict) return;

  var seg = (typeof Intl !== 'undefined' && Intl.Segmenter)
    ? new Intl.Segmenter('en', { granularity: 'grapheme' })
    : null;

  // An off-screen span with the same font as the target, so a width can be read
  // without the list row's overflow clipping the text.
  var meas = document.createElement('span');
  meas.setAttribute('aria-hidden', 'true');
  meas.style.position = 'absolute';
  meas.style.left = '-9999px';
  meas.style.top = '0';
  meas.style.whiteSpace = 'nowrap';
  meas.style.visibility = 'hidden';
  document.body.appendChild(meas);

  function codePoints(s) {
    var parts = [];
    for (var i = 0; i < s.length;) {
      var c = s.codePointAt(i);
      parts.push('U+' + c.toString(16).toUpperCase().padStart(4, '0'));
      i += c > 0xffff ? 2 : 1;
    }
    return parts.join(' ');
  }

  function graphemes(s) {
    if (seg) {
      var list = [];
      var it = seg.segment(s)[Symbol.iterator]();
      for (var n = it.next(); !n.done; n = it.next()) list.push(n.value.segment);
      return list;
    }
    return Array.from(s);
  }

  function fontOf(el) {
    var cs = getComputedStyle(el);
    return cs.fontWeight + ' ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily;
  }

  function widthOf(text, font) {
    meas.style.font = font;
    meas.textContent = text;
    return meas.getBoundingClientRect().width;
  }

  // Width alone cannot tell a letter from a filler: U+3164 is category Lo, so it is
  // a letter by the standard, and it reserves a full character cell. What separates
  // them is whether anything is painted, so count the ink on a canvas. Same method
  // the site's character data uses.
  var inkCanvas = null;
  var inkCtx = null;

  function canvasFont(el) {
    var cs = getComputedStyle(el);
    return cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  }

  function inkPixels(text, font) {
    if (!inkCtx) {
      inkCanvas = document.createElement('canvas');
      inkCanvas.width = 64;
      inkCanvas.height = 64;
      inkCtx = inkCanvas.getContext('2d');
    }
    inkCtx.clearRect(0, 0, 64, 64);
    inkCtx.font = font;
    inkCtx.textBaseline = 'top';
    inkCtx.fillStyle = '#000';
    inkCtx.fillText(text, 4, 4);
    var d = inkCtx.getImageData(0, 0, 64, 64).data;
    var n = 0;
    for (var i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  }

  function line(label, value) {
    var li = document.createElement('li');
    var a = document.createElement('span');
    a.textContent = label;
    var b = document.createElement('b');
    b.textContent = value;
    li.appendChild(a);
    li.appendChild(b);
    return li;
  }

  function say(text, cls) {
    verdict.textContent = text;
    verdict.className = 'verdict ' + cls;
  }

  function run() {
    var name = input.value;

    if (!name) {
      avatar.textContent = '';
      out.textContent = '';
      facts.textContent = '';
      say('Type or paste a nickname above.', 'idle');
      return;
    }

    var gs = graphemes(name);
    var first = gs[0] || '';
    var charAt0 = name.charAt(0);
    var upper0 = name.toUpperCase().charAt(0);
    var trimmed = name.trim();
    var trim0 = trimmed.charAt(0);

    avatar.textContent = first;
    out.textContent = name;

    var avFont = fontOf(avatar);
    var avW = widthOf(first, avFont);
    var nameW = widthOf(name, fontOf(out));
    var letterW = widthOf('A', avFont);   // the reference: a real initial at this font
    var avInk = inkPixels(first, canvasFont(avatar));

    facts.textContent = '';
    facts.appendChild(line('First grapheme', first ? codePoints(first) : '(none)'));
    facts.appendChild(line('charAt(0)', codePoints(charAt0)));
    facts.appendChild(line('toUpperCase()[0]', codePoints(upper0)));
    facts.appendChild(line('trim(), then first', trim0 ? codePoints(trim0) : '(empty)'));
    facts.appendChild(line('Graphemes', String(gs.length)));
    facts.appendChild(line('Code points', String(Array.from(name).length)));
    facts.appendChild(line('Name width', nameW.toFixed(2) + ' px'));
    facts.appendChild(line('Avatar glyph width', avW.toFixed(2) + ' px'));
    facts.appendChild(line('Ink drawn in the circle', avInk + ' px'));
    facts.appendChild(line('A capital A here', letterW.toFixed(2) + ' px'));

    if (charAt0 !== trim0 && trim0) {
      say('Two answers for one name. ' + codePoints(charAt0) + ' is what charAt(0) returns, so a '
        + 'platform that reads the first character straight off the string draws a blank avatar; '
        + 'trim() removes it first, so a platform that trims before reading draws ' + codePoints(trim0)
        + '. Both are ordinary implementations of the same idea.', 'bad');
      return;
    }

    if (avInk > 0) {
      say('The avatar shows a real glyph. All four readings return ' + codePoints(first)
        + ', and it paints ' + avInk + ' pixels while taking ' + avW.toFixed(2)
        + ' px of the circle; the name draws ' + nameW.toFixed(2) + ' px of text across '
        + gs.length + ' character' + (gs.length === 1 ? '' : 's') + '.', 'ok');
      return;
    }

    if (avW === 0) {
      say('The avatar circle gets nothing. The first grapheme paints no ink and takes 0.00 px, so the '
        + 'circle is empty while the name still holds ' + gs.length + ' character'
        + (gs.length === 1 ? '' : 's') + '.', 'bad');
      return;
    }

    say('The avatar is not empty \u2014 it is a blank the width of a letter. The first grapheme paints '
      + 'no ink while taking ' + avW.toFixed(2) + ' px of the circle, against ' + letterW.toFixed(2)
      + ' px for a capital A at this font size, so the circle looks occupied rather than missing.',
      'bad');
  }

  var fills = document.querySelectorAll('button[data-nkcp]');
  Array.prototype.forEach.call(fills, function (btn) {
    btn.addEventListener('click', function () {
      var cp = parseInt(btn.getAttribute('data-nkcp'), 10);
      input.value = String.fromCodePoint(cp) + 'Ada';
      run();
      input.focus();
    });
  });

  var moves = document.querySelectorAll('button[data-nkmove]');
  Array.prototype.forEach.call(moves, function (btn) {
    btn.addEventListener('click', function () {
      var gs = graphemes(input.value);
      if (gs.length < 2) { run(); return; }
      var af = canvasFont(avatar);
      var first = gs[0];
      var last = gs[gs.length - 1];
      var rest, next;
      if (btn.getAttribute('data-nkmove') === 'end') {
        // Only move something that paints nothing; a real letter stays where it is.
        if (inkPixels(first, af) > 0) { run(); return; }
        rest = gs.slice(1).join('');
        next = rest + first;
      } else {
        if (inkPixels(last, af) > 0) { run(); return; }
        rest = gs.slice(0, -1).join('');
        next = last + rest;
      }
      input.value = next;
      run();
      input.focus();
    });
  });

  input.addEventListener('input', run);

  // Open on the case the page is about, so the pane is never empty on arrival.
  if (!input.value) input.value = String.fromCodePoint(0x3164) + 'Ada';
  run();
})();
