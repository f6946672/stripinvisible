(function () {
  'use strict';

  // The pane on the right is whatever browser is reading the page. Nothing is
  // sent anywhere: the whole verdict is one call to the URL parser.
  var input = document.getElementById('pcinput');
  var out = document.getElementById('pcout');
  var verdict = document.getElementById('pcverdict');
  if (!input || !out || !verdict) return;

  var DASH = '\u2014';

  function set(text, cls) {
    verdict.textContent = text;
    verdict.className = 'verdict ' + cls;
  }

  function run() {
    var raw = input.value;

    if (!raw) {
      out.textContent = DASH;
      out.className = 'preview empty';
      set('Type or paste a hostname above.', 'idle');
      return;
    }

    var parsed;
    try {
      parsed = new URL('http://' + raw + '/').hostname;
    } catch (e) {
      out.textContent = DASH;
      out.className = 'preview empty';
      set('This browser refused it. The URL parser threw instead of returning a hostname, so there '
        + 'is no domain here to resolve at all.', 'bad');
      return;
    }

    out.textContent = parsed;
    out.className = 'preview';

    if (parsed === raw) {
      set('Nothing changed. Every character survived the mapping step as typed.', 'ok');
      return;
    }

    if (parsed.indexOf('xn--') === 0 || parsed.indexOf('.xn--') !== -1) {
      set('Encoded. Your character survived, and the address bar would carry ASCII instead of it. '
        + 'This is the outcome punycode is named after.', 'ok');
      return;
    }

    var removed = raw.length - parsed.length;
    if (removed > 0) {
      set('Shortened by ' + removed + ' character' + (removed === 1 ? '' : 's') + '. At least one '
        + 'character was deleted, and what is left is a domain in its own right \u2014 not a variant '
        + 'of one.', 'bad');
      return;
    }

    set('Rewritten. A character was translated into a different ASCII character rather than removed, '
      + 'so the length is unchanged and the text is not.', 'ok');
  }

  var fills = document.querySelectorAll('button[data-fillcp]');
  Array.prototype.forEach.call(fills, function (btn) {
    btn.addEventListener('click', function () {
      var cp = parseInt(btn.getAttribute('data-fillcp'), 10);
      input.value = 'ap' + String.fromCodePoint(cp) + 'ple.com';
      run();
      input.focus();
    });
  });

  input.addEventListener('input', run);

  // Open on the case the page is about, so the pane is never empty on arrival.
  if (!input.value) input.value = 'ap' + String.fromCodePoint(0x200b) + 'ple.com';
  run();
})();
