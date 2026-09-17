(function () {
  var text = '';
  var buttons = document.querySelectorAll('button.copycp');
  var live = document.createElement('p');
  live.className = 'copylive';
  live.setAttribute('role', 'status');
  live.hidden = true;

  function say(msg) {
    live.textContent = msg;
    live.hidden = false;
    setTimeout(function () { live.hidden = true; }, 1600);
  }

  function put(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { say('Copied'); }, fallback);
    } else {
      fallback();
    }
  }

  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', 'readonly');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); say('Copied'); } catch (e) { say('Copy failed — select it manually'); }
    document.body.removeChild(ta);
  }

  var text = '';

  Array.prototype.forEach.call(buttons, function (btn) {
    btn.addEventListener('click', function () {
      var cp = parseInt(btn.getAttribute('data-cp'), 10);
      text = String.fromCodePoint(cp);
      put(text);
    });
  });

  var main = document.querySelector('main');
  main.insertBefore(live, main.firstChild);
})();
