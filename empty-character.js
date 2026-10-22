/* Blank character tool. Everything runs in the visitor's browser: nothing is
   uploaded, there is no request, no account and no counter.
   Widths printed under each button were measured 2026-10-22 in Chromium
   153.0.8010.12 with canvas 2D at 16 px Arial. The readout under the test box
   measures again in whatever browser the visitor is using, which is why it is
   labelled separately. */
(function () {
  'use strict';

  var chips = Array.prototype.slice.call(document.querySelectorAll('#blank-tool .chip'));
  var countEl = document.getElementById('count');
  var copyBtn = document.getElementById('copy');
  var copyOut = document.getElementById('copyout');
  var testEl = document.getElementById('test');
  var testOut = document.getElementById('testout');
  if (!chips.length || !countEl || !copyBtn || !copyOut || !testEl || !testOut) return;

  var selected = chips[0];
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  function charOf(chip) {
    return String.fromCodePoint(parseInt(chip.getAttribute('data-cp'), 16));
  }

  function labelOf(chip) {
    return 'U+' + chip.getAttribute('data-cp');
  }

  function px(n) {
    return (Math.round(n * 100) / 100).toFixed(2);
  }

  function widthOf(str) {
    ctx.font = '16px Arial';
    return ctx.measureText(str).width;
  }

  /* Ink: draw on white and count pixels that are not white. Capped at 40
     characters so a pasted essay does not cost a megapixel. */
  function inkOf(str) {
    var sample = Array.from(str).slice(0, 40).join('');
    canvas.width = 400;
    canvas.height = 60;
    var c = canvas.getContext('2d');
    c.fillStyle = '#fff';
    c.fillRect(0, 0, 400, 60);
    c.font = '16px Arial';
    c.fillStyle = '#000';
    c.fillText(sample, 4, 36);
    var d = c.getImageData(0, 0, 400, 60).data;
    var ink = 0;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250) ink++;
    }
    return { ink: ink, capped: Array.from(str).length > 40 };
  }

  function codepoints(str) {
    return Array.from(str).map(function (c) {
      return 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    });
  }

  function trimLine(str) {
    var kept = Array.from(str.trim()).length;
    var total = Array.from(str).length;
    if (kept === total) return total === 1 ? 'trim() keeps it' : 'trim() keeps all ' + total;
    if (kept === 0) return 'trim() removes all ' + total;
    return 'trim() keeps ' + kept + ' of ' + total;
  }

  function count() {
    var n = parseInt(countEl.value, 10);
    if (!isFinite(n)) n = 1;
    n = Math.max(1, Math.min(100, n));
    return n;
  }

  function select(chip) {
    chips.forEach(function (c) {
      c.setAttribute('aria-checked', c === chip ? 'true' : 'false');
    });
    selected = chip;
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      select(chip);
      copyOut.textContent = 'Selected ' + labelOf(chip) + ' (' +
        chip.getAttribute('data-name') + '). Press Copy.';
    });
    chip.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select(chip);
        copyBtn.focus();
      }
    });
  });

  function fallbackCopy(str) {
    var ta = document.createElement('textarea');
    ta.value = str;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function done(str, n, ok) {
    var w = widthOf(str);
    var ink = inkOf(str);
    var parts = [
      (ok ? 'Copied ' : 'Could not copy automatically — select the text in the box below and copy it. '),
      labelOf(selected) + ' ×' + n,
      px(w) + ' px wide at 16 px Arial',
      ink.ink + ' ink pixels' + (ink.capped ? ' in the first 40 characters' : '')
    ];
    if (!ok) parts[0] = 'Could not copy automatically. Select the text in the box below and copy it. ';
    copyOut.textContent = parts.join(' · ');
    copyBtn.textContent = ok ? 'Copied ' + n + (n === 1 ? ' character' : ' characters') : 'Try again';
    copyBtn.classList.add(ok ? 'is-ok' : 'is-bad');
    window.clearTimeout(done.timer);
    done.timer = window.setTimeout(function () {
      copyBtn.textContent = 'Copy';
      copyBtn.classList.remove('is-ok', 'is-bad');
    }, 2600);
    if (ok) {
      testOut.textContent = 'Nothing is filled in for you — paste it into the test box to check it.';
    }
  }

  copyBtn.addEventListener('click', function () {
    var n = count();
    countEl.value = String(n);
    var str = charOf(selected).repeat(n);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).then(function () {
        done(str, n, true);
      }).catch(function () {
        done(str, n, fallbackCopy(str));
      });
    } else {
      done(str, n, fallbackCopy(str));
    }
  });

  countEl.addEventListener('input', function () {
    var n = parseInt(countEl.value, 10);
    if (isFinite(n) && n > 100) countEl.value = '100';
  });

  testEl.addEventListener('input', function () {
    var str = testEl.value;
    if (!str.length) {
      testOut.textContent = 'Waiting for a paste.';
      return;
    }
    var cps = codepoints(str);
    var unique = cps.filter(function (v, i, a) { return a.indexOf(v) === i; });
    var w = widthOf(str);
    var ink = inkOf(str);
    testOut.textContent = [
      cps.length + (cps.length === 1 ? ' code point' : ' code points'),
      unique.slice(0, 4).join(' ') + (unique.length > 4 ? ' +' + (unique.length - 4) : ''),
      px(w) + ' px wide at 16 px Arial',
      ink.ink + ' ink pixels' + (ink.capped ? ' in the first 40' : ''),
      trimLine(str)
    ].join(' · ');
  });

  select(chips[0]);
})();
