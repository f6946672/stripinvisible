(function () {
  'use strict';

  // The ten code points that split a Python str on splitlines(), verified by
  // sweeping every non-surrogate code point on this machine.
  var TEN = [
    { cp: 0x000a, name: 'Line feed' },
    { cp: 0x000b, name: 'Line tabulation (VT)' },
    { cp: 0x000c, name: 'Form feed' },
    { cp: 0x000d, name: 'Carriage return' },
    { cp: 0x001c, name: 'File separator' },
    { cp: 0x001d, name: 'Group separator' },
    { cp: 0x001e, name: 'Record separator' },
    { cp: 0x0085, name: 'Next line (NEL)' },
    { cp: 0x2028, name: 'Line separator' },
    { cp: 0x2029, name: 'Paragraph separator' }
  ];

  var CLASS = '[\\n\\r\\x0B\\x0C\\u001C\\u001D\\u001E\\u0085\\u2028\\u2029]';
  var SPLIT = new RegExp('\\r\\n|' + CLASS);
  var REWRITE = new RegExp('\\r\\n|[\\r\\x0B\\x0C\\u001C\\u001D\\u001E\\u0085\\u2028\\u2029]', 'g');

  var input = document.getElementById('lsinput');
  var output = document.getElementById('lsoutput');
  var report = document.getElementById('lsreport');
  var count = document.getElementById('lscount');
  var copied = document.getElementById('lscopied');

  if (!input || !output || !report) return;

  function hex(cp) {
    var s = cp.toString(16).toUpperCase();
    while (s.length < 4) s = '0' + s;
    return 'U+' + s;
  }

  function occurrences(text, ch) {
    var n = 0;
    var at = text.indexOf(ch);
    while (at !== -1) {
      n++;
      at = text.indexOf(ch, at + ch.length);
    }
    return n;
  }

  function draw(text) {
    var parts = [];
    var i;

    if (!text) {
      report.innerHTML = '<p class="jsonstatus">Nothing pasted yet.</p>';
      return;
    }

    var found = [];
    for (i = 0; i < TEN.length; i++) {
      var ch = String.fromCharCode(TEN[i].cp);
      var n = occurrences(text, ch);
      if (n > 0) found.push({ cp: TEN[i].cp, name: TEN[i].name, n: n });
    }

    var byLF = text.split('\n').length;
    var byTen = text.split(SPLIT).length;

    parts.push('<p class="jsonstatus">Length: ' + Array.from(text).length +
      ' code points, ' + new Blob([text]).size + ' bytes in UTF-8.</p>');

    if (found.length === 0) {
      parts.push('<p class="jsonstatus">None of the ten line-boundary characters are present. ' +
        'Splitting on "\\n" and splitting on all ten both give <strong>' + byLF +
        '</strong>, so nothing here can disagree about where the lines are.</p>');
    } else {
      parts.push('<table><thead><tr><th>Code point</th><th>Name</th><th>Occurrences</th>' +
        '</tr></thead><tbody>');
      for (i = 0; i < found.length; i++) {
        parts.push('<tr><td class="name"><code>' + hex(found[i].cp) + '</code></td>' +
          '<td class="name">' + found[i].name + '</td>' +
          '<td class="cp">' + found[i].n + '</td></tr>');
      }
      parts.push('</tbody></table>');
      parts.push('<p class="jsonstatus">Split on "\\n" only: <strong>' + byLF +
        '</strong> lines. Split on all ten: <strong>' + byTen + '</strong> lines. ' +
        'A shell tool that counts newlines sees the first number. ' +
        'A Python splitlines() call sees the second.</p>');
    }

    report.innerHTML = parts.join('');
  }

  function updateCount() {
    if (count) count.textContent = Array.from(input.value).length + ' characters';
  }

  var runBtn = document.getElementById('lsrun');
  var normBtn = document.getElementById('lsnorm');
  var clearBtn = document.getElementById('lsclear');
  var copyBtn = document.getElementById('lscopy');

  input.addEventListener('input', updateCount);

  runBtn.addEventListener('click', function () {
    output.value = input.value;
    draw(input.value);
  });

  normBtn.addEventListener('click', function () {
    var text = input.value.replace(REWRITE, '\n');
    output.value = text;
    draw(text);
    report.insertAdjacentHTML('beforeend',
      '<p class="jsonstatus">Rewritten: every one of the ten is now a plain U+000A, ' +
      'and a carriage-return plus line-feed pair became one.</p>');
  });

  clearBtn.addEventListener('click', function () {
    input.value = '';
    output.value = '';
    report.innerHTML = '';
    updateCount();
  });

  copyBtn.addEventListener('click', function () {
    if (!output.value) return;
    output.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    if (ok) {
      copied.hidden = false;
      setTimeout(function () { copied.hidden = true; }, 1500);
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(output.value).then(function () {
        copied.hidden = false;
        setTimeout(function () { copied.hidden = true; }, 1500);
      });
    }
  });

  updateCount();
})();
