(function () {
  var buttons = document.querySelectorAll('button[data-cp]');
  var live = document.createElement('p');
  live.className = 'copylive';
  live.setAttribute('role', 'status');
  live.hidden = true;

  var pending = '';
  var pendingMsg = '';

  function say(msg) {
    live.textContent = msg;
    live.hidden = false;
    setTimeout(function () { live.hidden = true; }, 1600);
  }

  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = pending;
    ta.setAttribute('readonly', 'readonly');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      say(pendingMsg);
    } catch (e) {
      say('Copy failed — select it manually');
    }
    document.body.removeChild(ta);
  }

  function put(text, msg) {
    pending = text;
    pendingMsg = msg;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { say(msg); }, fallback);
    } else {
      fallback();
    }
  }

  Array.prototype.forEach.call(buttons, function (btn) {
    btn.addEventListener('click', function () {
      var cp = parseInt(btn.getAttribute('data-cp'), 10);
      var label = btn.getAttribute('data-label');
      put(String.fromCodePoint(cp), 'Copied' + (label ? ' ' + label : ''));
    });
  });

  var main = document.querySelector('main');
  main.insertBefore(live, main.firstChild);
})();
