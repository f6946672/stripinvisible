(function () {
  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  var ZWSP = '​';

  var METHODS = [
    { id: 'plain', label: 'no hiding at all (control)',
      html: function (w) { return '<span>' + esc(w) + '</span>'; } },
    { id: 'white', label: 'color: #fff on a white background',
      html: function (w) { return '<span style="color:#ffffff">' + esc(w) + '</span>'; } },
    { id: 'transparent', label: 'color: transparent',
      html: function (w) { return '<span style="color:transparent">' + esc(w) + '</span>'; } },
    { id: 'opacity', label: 'opacity: 0',
      html: function (w) { return '<span style="opacity:0">' + esc(w) + '</span>'; } },
    { id: 'fontzero', label: 'font-size: 0',
      html: function (w) { return '<span style="font-size:0">' + esc(w) + '</span>'; } },
    { id: 'clip', label: 'clip-path: inset(100%)',
      html: function (w) { return '<span style="clip-path:inset(100%)">' + esc(w) + '</span>'; } },
    { id: 'zeroheight', label: 'height: 0 with overflow: hidden',
      html: function (w) { return '<span style="display:inline-block;height:0;overflow:hidden">' + esc(w) + '</span>'; } },
    { id: 'indent', label: 'text-indent: -9999px',
      html: function (w) { return '<span style="display:block;text-indent:-9999px;overflow:hidden">' + esc(w) + '</span>'; } },
    { id: 'offscreen', label: 'position: absolute, left: -9999px',
      html: function (w) { return '<span style="position:absolute;left:-9999px">' + esc(w) + '</span>'; } },
    { id: 'sronly', label: 'screen-reader-only clip',
      html: function (w) { return '<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap">' + esc(w) + '</span>'; } },
    { id: 'covered', label: 'an opaque white box drawn over it',
      html: function (w) { return '<span style="position:relative">' + esc(w) +
        '<span style="position:absolute;left:0;top:0;right:0;bottom:0;background:#ffffff"></span></span>'; } },
    { id: 'userselect', label: 'user-select: none',
      html: function (w) { return '<span style="user-select:none;-webkit-user-select:none">' + esc(w) + '</span>'; } },
    { id: 'ariahidden', label: 'aria-hidden="true"',
      html: function (w) { return '<span aria-hidden="true">' + esc(w) + '</span>'; } },
    { id: 'visibility', label: 'visibility: hidden',
      html: function (w) { return '<span style="visibility:hidden">' + esc(w) + '</span>'; } },
    { id: 'display', label: 'display: none',
      html: function (w) { return '<span style="display:none">' + esc(w) + '</span>'; } },
    { id: 'comment', label: 'an HTML comment',
      html: function (w) { return '<!-- ' + esc(w) + ' -->'; } },
    { id: 'zwsp', label: 'U+200B inside a visible word',
      html: function (w) {
        var mid = Math.max(1, Math.floor(w.length / 2));
        return '<span>' + esc(w.slice(0, mid)) + ZWSP + esc(w.slice(mid)) + '</span>';
      } }
  ];

  var wordEl = document.getElementById('ht-word');
  var methodEl = document.getElementById('ht-method');
  var previewEl = document.getElementById('ht-preview');
  var outEl = document.getElementById('ht-out');
  if (!wordEl || !methodEl || !previewEl || !outEl) return;

  METHODS.forEach(function (m) {
    var o = document.createElement('option');
    o.value = m.id; o.textContent = m.label;
    methodEl.appendChild(o);
  });
  methodEl.value = 'white';

  function current() {
    for (var i = 0; i < METHODS.length; i++) if (METHODS[i].id === methodEl.value) return METHODS[i];
    return METHODS[0];
  }

  function render() {
    var w = wordEl.value === '' ? 'SECRET-42' : wordEl.value;
    previewEl.innerHTML = current().html(w);
    idle('Preview updated. Run a test to see what survives.');
  }

  function idle(msg) {
    outEl.innerHTML = '<p class="verdict idle">' + esc(msg) + '</p>';
  }

  function codepoints(s) {
    var out = [];
    Array.from(s).forEach(function (c) {
      var cp = c.codePointAt(0).toString(16).toUpperCase();
      while (cp.length < 4) cp = '0' + cp;
      if (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) out.push('U+' + cp);
      else if (cp === '200B' || cp === '200C' || cp === '200D' || cp === 'FEFF' || cp === '2060' || cp === '00AD')
        out.push('[U+' + cp + ']');
      else out.push(c);
    });
    return out.join('');
  }

  function selectedText() {
    var sel = window.getSelection();
    sel.removeAllRanges();
    var r = document.createRange();
    r.selectNodeContents(previewEl);
    sel.addRange(r);
    var t = sel.toString();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (e) { copied = false; }
    sel.removeAllRanges();
    return { text: t, copied: copied };
  }

  document.getElementById('ht-copy').addEventListener('click', function () {
    var w = wordEl.value === '' ? 'SECRET-42' : wordEl.value;
    var res = selectedText();
    var present = res.text.indexOf(w) >= 0;
    var kept = res.text.indexOf(ZWSP) >= 0;
    var stripped = res.text.replace(/[​-‏⁠﻿­]/g, '');
    var split = !present && stripped.indexOf(w) >= 0;
    var lines = [];
    if (present) {
      lines.push('<p class="verdict bad">Survives. The word is in what Ctrl+A then Ctrl+C would give you.</p>');
    } else if (split) {
      lines.push('<p class="verdict bad">Survives, but broken. The word is in the copy with an invisible character inside it, so a plain search for the word will not match it.</p>');
    } else {
      lines.push('<p class="verdict ok">Gone. The word is not in what Ctrl+A then Ctrl+C would give you.</p>');
    }
    lines.push('<p><strong>What lands on the clipboard:</strong> ' +
      (res.text === '' ? '<em>empty</em>' : '<code>' + esc(codepoints(res.text)) + '</code>') + '</p>');
    if (kept) lines.push('<p>An invisible character came along in the copy. Square brackets above mark it.</p>');
    if (res.copied) lines.push('<p class="hint">It is on your clipboard now &mdash; paste into a plain text editor to check.</p>');
    else lines.push('<p class="hint">This browser blocked the copy command; the string above is still what a selection produces.</p>');
    outEl.innerHTML = lines.join('');
  });

  document.getElementById('ht-find').addEventListener('click', function () {
    var w = wordEl.value === '' ? 'SECRET-42' : wordEl.value;
    if (typeof window.find !== 'function') {
      idle('This browser does not expose find-in-page to scripts.');
      return;
    }
    var sel = window.getSelection();
    sel.removeAllRanges();
    // the word also appears elsewhere on the page, so walk the hits until one
    // lands inside the preview or the search runs out
    var inside = false;
    for (var i = 0; i < 40; i++) {
      var hit = false;
      try { hit = window.find(w, false, false, true); } catch (e) { hit = false; }
      if (!hit) break;
      if (sel.anchorNode && previewEl.contains(sel.anchorNode)) { inside = true; break; }
    }
    sel.removeAllRanges();
    outEl.innerHTML = '<p class="verdict ' + (inside ? 'bad' : 'ok') + '">' +
      (inside ? 'Findable. Ctrl+F for the word finds it in the preview.'
              : 'Not findable. Ctrl+F for the word does not reach the preview.') + '</p>';
  });

  document.getElementById('ht-source').addEventListener('click', function () {
    var w = wordEl.value === '' ? 'SECRET-42' : wordEl.value;
    var inDom = previewEl.innerHTML.indexOf(w) >= 0;
    outEl.innerHTML = '<p class="verdict ' + (inDom ? 'bad' : 'ok') + '">' +
      (inDom ? 'In the source. The word is in the HTML of this page, so view-source shows it.'
             : 'Not in the source of this page &mdash; this method keeps it out of the markup.') + '</p>';
  });

  wordEl.addEventListener('input', render);
  methodEl.addEventListener('change', render);
  render();
})();
