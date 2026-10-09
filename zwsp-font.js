/* Font check for /zero-width-space: asks the browser what a named family does
   with the invisible set. Nothing is uploaded; everything is drawn on a canvas
   in this tab. */
(function () {
  var ROWS = [
    ['U+200B', 0x200B, 'zero width space'],
    ['U+200C', 0x200C, 'zero width non-joiner'],
    ['U+2060', 0x2060, 'word joiner'],
    ['U+FEFF', 0xFEFF, 'zero width no-break space'],
    ['U+00AD', 0x00AD, 'soft hyphen'],
    ['U+3164', 0x3164, 'Hangul filler'],
    ['U+FFFF', 0xFFFF, 'a code point no font defines']
  ];

  var input = document.getElementById('fname');
  var button = document.getElementById('fmeasure');
  var out = document.getElementById('fout');
  if (!input || !button || !out) return;

  function safe(name) {
    var clean = String(name || '').replace(/[^A-Za-z0-9 \-_.]/g, '').trim();
    return clean ? '"' + clean + '"' : 'system-ui';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function run() {
    var font = safe(input.value);
    var cv = document.createElement('canvas');
    cv.width = 260;
    cv.height = 150;
    var ctx = cv.getContext('2d');
    var html = '<table><thead><tr><th>Code point</th><th>Character</th>' +
      '<th>Advance at 64&nbsp;px</th><th>Painted pixels</th></tr></thead><tbody>';

    for (var i = 0; i < ROWS.length; i++) {
      var ch = String.fromCodePoint(ROWS[i][1]);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.font = '64px ' + font;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      var w = ctx.measureText(ch).width;
      ctx.fillText(ch, 20, 75);
      var data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      var ink = 0;
      for (var p = 3; p < data.length; p += 4) {
        if (data[p] > 8) ink++;
      }
      html += '<tr><td class="cp"><code>' + esc(ROWS[i][0]) + '</code></td>' +
        '<td class="nm">' + esc(ROWS[i][2]) + '</td>' +
        '<td class="cp">' + w.toFixed(2) + ' px</td>' +
        '<td class="cp">' + ink + '</td></tr>';
    }
    html += '</tbody></table>';
    out.innerHTML = html;
  }

  button.addEventListener('click', run);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') run();
  });
  run();
})();
