(function () {
  'use strict';

  // Everything here runs in the browser that is reading the page. Nothing is uploaded
  // anywhere: the picture is drawn into a canvas and the readings are taken from that
  // canvas. The three erase buttons are three plain canvas operations, and the selection
  // outline lives on a separate overlay so it never becomes part of the image.
  //
  // The built-in samples keep a copy of their own background without the text in it, so
  // the reading is taken against the true background and the numbers are the same ones the
  // tables on the page quote. A picture you load has no such copy, so there the reading is
  // taken against a straight-line model fitted to the pixels just outside the box, and the
  // row says so.

  var file = document.getElementById('rtfile');
  var canvas = document.getElementById('rtcanvas');
  var overlay = document.getElementById('rtoverlay');
  var facts = document.getElementById('rtfacts');
  var verdict = document.getElementById('rtverdict');
  if (!canvas || !overlay || !facts || !verdict) return;

  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  var ov = overlay.getContext('2d');
  var W = canvas.width;
  var H = canvas.height;

  var bg = document.createElement('canvas');   // the sample's background, no text
  bg.width = W; bg.height = H;
  var bgctx = bg.getContext('2d', { willReadFrequently: true });

  var original = null;     // the picture as loaded, before any erasing
  var trueBg = null;       // ImageData of the background alone, samples only
  var textBox = null;      // where the sample's text sits
  var sel = null;          // { x, y, w, h } in canvas pixels
  var dragging = null;     // the anchor point while the pointer is down
  var patchMax = null;     // deepest difference left by the last erase
  var picRect = null;      // where a loaded picture sits on the canvas; null for samples

  var RING = 6;
  var FONT = '600 40px Arial, sans-serif';
  var TEXT = 'Sample text';
  var TEXT_AT = [40, 90];

  // A watermark is a blend, not a replacement: a pixel under it holds (1 - a) of the
  // background plus a of the mark. WM_BOX and WM colour are the same ones the tables
  // on the page quote, so the tool and the page read the same numbers.
  var WM_BOX = { x: 40, y: 90, w: 228, h: 46 };
  var WM = [30, 30, 30];
  var markMode = 'opaque';   // 'opaque' = the text above, 'blend' = a translucent patch
  var alpha = 0.5;           // how strong the blend is
  var estAlpha = null;       // the strength read back off the picture
  var alphaSel = document.getElementById('rtalpha');

  // --- samples -----------------------------------------------------------

  function paintBackground(g, kind) {
    g.clearRect(0, 0, W, H);
    if (kind === 'flat') {
      g.fillStyle = 'rgb(240,240,240)';
      g.fillRect(0, 0, W, H);
      return;
    }
    if (kind === 'gradient') {
      var grd = g.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, 'rgb(240,244,248)');
      grd.addColorStop(1, 'rgb(222,230,238)');
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      return;
    }
    g.fillStyle = 'rgb(240,240,240)';
    g.fillRect(0, 0, W, H);
    var img = g.getImageData(0, 0, W, H);
    var d = img.data;
    var s = 20261009;
    for (var i = 0; i < d.length; i += 4) {
      s = (s * 1664525 + 1013904223) >>> 0;
      var n = Math.round(((s / 4294967296) * 2 - 1) * 6);
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  }

  var currentKind = 'flat';

  function loadSample(kind) {
    currentKind = kind;
    paintBackground(bgctx, kind);
    trueBg = bgctx.getImageData(0, 0, W, H);

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0);

    if (markMode === 'blend') {
      // one flat translucent patch over the same box the tables quote
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgb(' + WM[0] + ',' + WM[1] + ',' + WM[2] + ')';
      ctx.fillRect(WM_BOX.x, WM_BOX.y, WM_BOX.w, WM_BOX.h);
      ctx.globalAlpha = 1;
      textBox = { x: WM_BOX.x, y: WM_BOX.y, w: WM_BOX.w, h: WM_BOX.h };
    } else {
      ctx.font = FONT;
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgb(30,30,30)';
      ctx.fillText(TEXT, TEXT_AT[0], TEXT_AT[1]);

      var m = ctx.measureText(TEXT);
      textBox = {
        x: Math.max(0, TEXT_AT[0] - 3),
        y: Math.max(0, TEXT_AT[1] - 3),
        w: Math.min(W, Math.ceil(m.width) + 6),
        h: Math.min(H, 40 + 6),
      };
    }
    estAlpha = null;

    original = ctx.getImageData(0, 0, W, H);
    sel = null;
    patchMax = null;
    picRect = null;
    outline();
    run();
  }

  // --- the selection outline, on its own layer ---------------------------

  function outline() {
    ov.clearRect(0, 0, W, H);
    if (!sel) return;
    ov.save();
    ov.strokeStyle = '#1b6fd6';
    ov.lineWidth = 1;
    ov.setLineDash([4, 3]);
    ov.strokeRect(sel.x + 0.5, sel.y + 0.5, sel.w - 1, sel.h - 1);
    ov.restore();
  }

  // --- the one measurement this page is about ----------------------------

  // Blending scales the variation down along with the values: the spread of the pixels
  // under the mark is (1 - a) times the spread of the same patch without it. That gives
  // the strength back without being told it, provided there is texture there to compare.
  function sdOver(g, x, y, w, h) {
    var d = g.getImageData(x, y, w, h).data;
    var s = 0, s2 = 0, n = 0;
    for (var i = 0; i < d.length; i += 4) {
      for (var c = 0; c < 3; c++) { var v = d[i + c]; s += v; s2 += v * v; n++; }
    }
    var mean = s / n;
    return Math.sqrt(Math.max(0, s2 / n - mean * mean));
  }

  function readStrength() {
    if (!trueBg || !sel) return alpha;
    var bgC = document.createElement('canvas');
    bgC.width = W; bgC.height = H;
    var bgG = bgC.getContext('2d', { willReadFrequently: true });
    bgG.putImageData(trueBg, 0, 0);
    var sb = sdOver(bgG, sel.x, sel.y, sel.w, sel.h);
    var sc = sdOver(ctx, sel.x, sel.y, sel.w, sel.h);
    if (!(sb > 0) || !(sc > 0)) return alpha;
    var a = 1 - sc / sb;
    if (!(a > 0.02) || !(a < 0.995)) return alpha;
    return a;
  }

  function median(values) {
    values.sort(function (a, b) { return a - b; });
    var m = values.length >> 1;
    return values.length % 2 ? values[m] : (values[m - 1] + values[m]) / 2;
  }

  function stats() {
    if (!sel || sel.w < 2 || sel.h < 2) return null;

    var x0 = Math.max(0, sel.x - RING);
    var y0 = Math.max(0, sel.y - RING);
    var x1 = Math.min(W, sel.x + sel.w + RING);
    var y1 = Math.min(H, sel.y + sel.h + RING);
    var w = x1 - x0;
    var data = ctx.getImageData(x0, y0, w, y1 - y0).data;

    var ring = [[], [], []];
    var box = [[], [], []];
    for (var y = 0; y < y1 - y0; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var gx = x0 + x;
        var gy = y0 + y;
        var inside = gx >= sel.x && gx < sel.x + sel.w &&
                     gy >= sel.y && gy < sel.y + sel.h;
        // a loaded picture sits in the middle of the canvas with the page's white
        // showing around it; only pixels belonging to the picture are background
        if (!inside && picRect && (gx < picRect.x || gx >= picRect.x + picRect.w ||
                                   gy < picRect.y || gy >= picRect.y + picRect.h)) continue;
        for (var c = 0; c < 3; c++) (inside ? box[c] : ring[c]).push(data[i + c]);
      }
    }

    var med = [median(ring[0]), median(ring[1]), median(ring[2])];

    var spread = 0;
    for (var c2 = 0; c2 < 3; c2++) {
      for (var k = 0; k < ring[c2].length; k++) {
        var v = Math.abs(ring[c2][k] - med[c2]);
        if (v > spread) spread = v;
      }
    }

    var boxMax;
    if (trueBg) {
      // samples: the picture's own background, with the text never drawn on it
      boxMax = 0;
      var t = trueBg.data;
      for (var yy = sel.y; yy < sel.y + sel.h; yy++) {
        for (var xx = sel.x; xx < sel.x + sel.w; xx++) {
          var j = (yy * W + xx) * 4;
          for (var c3 = 0; c3 < 3; c3++) {
            var dv = Math.abs(data[((yy - y0) * w + (xx - x0)) * 4 + c3] - t[j + c3]);
            if (dv > boxMax) boxMax = dv;
          }
        }
      }
    } else {
      // a loaded picture: fit a straight line across the box from the pixels just outside it
      boxMax = 0;
      var full = ctx.getImageData(0, 0, W, H).data;
      for (var y3 = sel.y; y3 < sel.y + sel.h; y3++) {
        var lp = [0, 0, 0], rp = [0, 0, 0], ln = 0, rn = 0;
        for (var d2 = 1; d2 <= 3; d2++) {
          var lx = sel.x - d2, rx = sel.x + sel.w - 1 + d2;
          if (lx >= 0) { for (var cc = 0; cc < 3; cc++) lp[cc] += full[(y3 * W + lx) * 4 + cc]; ln++; }
          if (rx < W) { for (var cc2 = 0; cc2 < 3; cc2++) rp[cc2] += full[(y3 * W + rx) * 4 + cc2]; rn++; }
        }
        for (var x3 = sel.x; x3 < sel.x + sel.w; x3++) {
          var tt = (x3 - sel.x + 1) / (sel.w + 1);
          for (var c4 = 0; c4 < 3; c4++) {
            var model = ln && rn
              ? (lp[c4] / ln) * (1 - tt) + (rp[c4] / rn) * tt
              : med[c4];
            var dd = Math.abs(full[(y3 * W + x3) * 4 + c4] - model);
            if (dd > boxMax) boxMax = dd;
          }
        }
      }
      // the fitted line is a real-valued estimate, so the reading is rounded to
      // the whole 255ths the tables quote
      boxMax = Math.round(boxMax);
    }

    return { bgSpread: spread, boxMax: boxMax, med: med, exact: !!trueBg };
  }

  // --- output ------------------------------------------------------------

  function line(label, value) {
    var li = document.createElement('li');
    var b = document.createElement('b');
    b.textContent = value;
    li.appendChild(document.createTextNode(label));
    li.appendChild(b);
    return li;
  }

  function say(text, cls) {
    verdict.textContent = text;
    verdict.className = 'verdict ' + cls;
  }

  function run() {
    facts.textContent = '';
    var st = stats();
    if (!st) {
      facts.appendChild(line('Box', 'nothing selected'));
      say('Pick a sample or load a picture, then drag a box over the text in it.', 'idle');
      return;
    }

    facts.appendChild(line('Box', sel.w + ' \u00d7 ' + sel.h + ' px'));
    facts.appendChild(line('Read against',
      st.exact ? 'the sample\u2019s own background' : 'a line fitted across the box'));
    facts.appendChild(line('Deepest difference in the box', st.boxMax + ' / 255'));
    if (!st.exact) {
      // A loaded picture carries no clean copy of its background, and the ring around the box
      // can hold other text, so there is no honest threshold to compare the patch against.
      // The tool gives the two readings and the share, and leaves the judgement to the
      // picture the reader can see.
      facts.appendChild(line('Deepest difference left by the patch',
        patchMax === null ? 'nothing erased yet' : patchMax + ' / 255'));
      if (patchMax !== null && st.boxMax > 0) {
        facts.appendChild(line('Patch as a share of the text',
          Math.round(100 * patchMax / st.boxMax) + '%'));
      }
      if (patchMax === null) {
        say('There is something in the box: the deepest difference inside it is ' + st.boxMax
          + ', measured against a line fitted across it. Erase it and read the last row again.', 'idle');
        return;
      }
      if (patchMax === 0) {
        say('The patch sits on the fitted line: nothing of what was in the box is left in it.', 'ok');
        return;
      }
      say('The patch leaves ' + patchMax + ' where the text left ' + st.boxMax + ' \u2014 '
        + Math.round(100 * patchMax / st.boxMax) + ' per cent of it. A loaded picture has no clean '
        + 'copy of its background to compare against, so these are two readings rather than a '
        + 'verdict; whether ' + patchMax + ' shows is set by how much the background around the '
        + 'box varies, which is the part you can see in the picture.', 'idle');
      return;
    }

    facts.appendChild(line('Background\u2019s own variation', st.bgSpread + ' / 255'));
    if (markMode === 'blend') {
      facts.appendChild(line('Strength of the mark', alpha + ''));
      if (estAlpha !== null) {
        facts.appendChild(line('Strength read off the picture',
          estAlpha.toFixed(4) + ' (true ' + alpha + ')'));
      }
    }
    facts.appendChild(line('Deepest difference left by the patch',
      patchMax === null ? 'nothing erased yet' : patchMax + ' / 255'));
    if (patchMax !== null && st.bgSpread > 0) {
      facts.appendChild(line('Patch against background variation',
        (patchMax / st.bgSpread).toFixed(2) + '\u00d7'));
    }

    if (st.boxMax <= st.bgSpread) {
      say('Nothing in the box stands out from the background around it. The deepest difference '
        + 'inside it is ' + st.boxMax + ', and the background itself already varies by '
        + st.bgSpread + ', so nothing here reads as text.', 'ok');
      return;
    }

    if (patchMax === null) {
      say('There is something in the box: the deepest difference inside it is ' + st.boxMax
        + ', against a background that varies by ' + st.bgSpread
        + '. Erase it and read the last row again.', 'idle');
      return;
    }

    if (patchMax <= st.bgSpread) {
      say('The patch is at or below the background\u2019s own variation. What it leaves is '
        + patchMax + ' and the background around it varies by ' + st.bgSpread
        + ', so nothing about the patch stands out from the picture it sits in.', 'ok');
      return;
    }

    say('The patch still shows. What it leaves is ' + patchMax
      + ' against a background that varies by ' + st.bgSpread + ' \u2014 '
      + (patchMax / st.bgSpread).toFixed(1) + ' times the background\u2019s own variation, so the '
      + 'region is flatter or darker than anything around it. Try a different way of clearing it '
      + 'and watch this number.', 'bad');
  }

  // --- dragging a box ----------------------------------------------------

  function toCanvas(ev) {
    var r = canvas.getBoundingClientRect();
    return {
      x: Math.round((ev.clientX - r.left) * (W / r.width)),
      y: Math.round((ev.clientY - r.top) * (H / r.height)),
    };
  }

  canvas.addEventListener('pointerdown', function (ev) {
    if (!original) return;
    dragging = toCanvas(ev);
    try { if (canvas.setPointerCapture) canvas.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic events */ }
  });

  canvas.addEventListener('pointermove', function (ev) {
    if (!dragging) return;
    var p = toCanvas(ev);
    // the box is kept on the picture, so the ring around it is picture and not margin
    var bx = picRect ? picRect.x : 0;
    var by = picRect ? picRect.y : 0;
    var bw = picRect ? picRect.w : W;
    var bh = picRect ? picRect.h : H;
    sel = {
      x: Math.max(bx, Math.min(Math.min(dragging.x, p.x), bx + bw)),
      y: Math.max(by, Math.min(Math.min(dragging.y, p.y), by + bh)),
      w: 0,
      h: 0,
    };
    sel.w = Math.min(bx + bw, Math.max(dragging.x, p.x)) - sel.x;
    sel.h = Math.min(by + bh, Math.max(dragging.y, p.y)) - sel.y;
    patchMax = null;
    ctx.putImageData(original, 0, 0);
    outline();
    run();
  });

  canvas.addEventListener('pointerup', function (ev) {
    dragging = null;
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(ev.pointerId)) {
      canvas.releasePointerCapture(ev.pointerId);
    }
    run();
  });

  // --- the three ways of clearing the box --------------------------------

  var erasers = {
    flat: function () {
      var st = stats();
      ctx.fillStyle = 'rgb(' + Math.round(st.med[0]) + ',' + Math.round(st.med[1])
        + ',' + Math.round(st.med[2]) + ')';
      ctx.fillRect(sel.x, sel.y, sel.w, sel.h);
    },
    blur: function () {
      ctx.save();
      ctx.filter = 'blur(6px)';
      ctx.drawImage(canvas, sel.x, sel.y, sel.w, sel.h, sel.x, sel.y, sel.w, sel.h);
      ctx.restore();
    },
    invert: function () {
      var a = alpha;
      estAlpha = null;
      var data = ctx.getImageData(sel.x, sel.y, sel.w, sel.h);
      var d = data.data;
      for (var i = 0; i < d.length; i += 4) {
        for (var c = 0; c < 3; c++) {
          var v = (d[i + c] - a * WM[c]) / (1 - a);
          d[i + c] = Math.max(0, Math.min(255, Math.round(v)));
        }
      }
      ctx.putImageData(data, sel.x, sel.y);
    },
    invertest: function () {
      var a = readStrength();
      estAlpha = a;
      var data = ctx.getImageData(sel.x, sel.y, sel.w, sel.h);
      var d = data.data;
      for (var i = 0; i < d.length; i += 4) {
        for (var c = 0; c < 3; c++) {
          var v = (d[i + c] - a * WM[c]) / (1 - a);
          d[i + c] = Math.max(0, Math.min(255, Math.round(v)));
        }
      }
      ctx.putImageData(data, sel.x, sel.y);
    },
    interp: function () {
      var data = ctx.getImageData(0, 0, W, H);
      var d = data.data;
      var left = Math.max(0, sel.x - 1);
      var right = Math.min(W - 1, sel.x + sel.w);
      for (var y = sel.y; y < sel.y + sel.h; y++) {
        for (var x = sel.x; x < sel.x + sel.w; x++) {
          var i = (y * W + x) * 4;
          var a = (y * W + left) * 4;
          var b = (y * W + right) * 4;
          var t = (x - sel.x + 1) / (sel.w + 1);
          for (var c = 0; c < 3; c++) d[i + c] = d[a + c] * (1 - t) + d[b + c] * t;
        }
      }
      ctx.putImageData(data, 0, 0);
    },
  };

  Array.prototype.forEach.call(document.querySelectorAll('button[data-rterase]'), function (btn) {
    btn.addEventListener('click', function () {
      if (!sel || sel.w < 2 || sel.h < 2 || !original) return;
      // every erase starts from the same picture, so the reading does not depend on
      // how many times the buttons have been pressed before
      ctx.putImageData(original, 0, 0);
      // undoing a blend needs the strength, and a loaded picture carries no clean copy
      // to read one off; there the two invert buttons fall back to nothing
      var how = btn.getAttribute('data-rterase');
      if ((how === 'invert' || how === 'invertest') && (!trueBg || markMode !== 'blend')) {
        say('The blend buttons work on the blended samples, where the strength is known and the '
          + 'sample carries a clean copy of its own background to read one off. Load a sample first.',
          'idle');
        outline();
        run();
        return;
      }
      erasers[how]();
      var st = stats();
      patchMax = st ? st.boxMax : null;
      outline();
      run();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('button[data-rtmark]'), function (btn) {
    btn.addEventListener('click', function () {
      markMode = btn.getAttribute('data-rtmark');
      if (alphaSel) alpha = parseFloat(alphaSel.value) || 0.5;
      loadSample(currentKind);
    });
  });

  if (alphaSel) {
    alphaSel.addEventListener('change', function () {
      alpha = parseFloat(alphaSel.value) || 0.5;
      if (markMode === 'blend') loadSample(currentKind);
      run();
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('button[data-rtreset]'), function (btn) {
    btn.addEventListener('click', function () {
      if (!original) return;
      sel = null;
      patchMax = null;
      ctx.putImageData(original, 0, 0);
      outline();
      run();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('button[data-rtselect]'), function (btn) {
    btn.addEventListener('click', function () {
      if (!textBox) return;
      sel = textBox;
      patchMax = null;
      ctx.putImageData(original, 0, 0);
      outline();
      run();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('button[data-rtsample]'), function (btn) {
    btn.addEventListener('click', function () {
      loadSample(btn.getAttribute('data-rtsample'));
    });
  });

  if (file) {
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var im = new Image();
        im.onload = function () {
          var scale = Math.min(W / im.width, H / im.height, 1);
          var w = Math.max(1, Math.round(im.width * scale));
          var h = Math.max(1, Math.round(im.height * scale));
          ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, W, H);
          ctx.drawImage(im, Math.round((W - w) / 2), Math.round((H - h) / 2), w, h);
          trueBg = null;
          textBox = null;
          estAlpha = null;
          markMode = 'opaque';
          picRect = {
            x: Math.round((W - w) / 2),
            y: Math.round((H - h) / 2),
            w: w,
            h: h,
          };
          original = ctx.getImageData(0, 0, W, H);
          sel = null;
          patchMax = null;
          outline();
          run();
        };
        im.src = reader.result;
      };
      reader.readAsDataURL(f);
    });
  }

  run();
})();
