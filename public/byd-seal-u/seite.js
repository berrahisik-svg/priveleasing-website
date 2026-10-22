/* Angebotsseite BYD SEAL U DM-i: Einwilligung, Meta-Pixel, Formular. */
(function () {
  var KEY = 'prive:consent';
  var PIXEL = '1739942817113576';
  var loaded = false;

  function getConsent() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'ja' || v === 'nein' ? v : null;
    } catch (e) {
      return null;
    }
  }
  function setConsent(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  function loadPixel() {
    if (loaded) return;
    loaded = true;
    var w = window;
    if (!w.fbq) {
      var f = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
      f.push = f; f.loaded = true; f.version = '2.0'; f.queue = [];
      w.fbq = f; w._fbq = f;
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(s);
    }
    w.fbq('init', PIXEL);
    w.fbq('track', 'PageView');
    w.fbq('track', 'ViewContent', { content_name: 'BYD SEAL U DM-i', value: 39990, currency: 'EUR' });
  }

  function track(name, data) {
    if (getConsent() === 'ja' && window.fbq) window.fbq('track', name, data || {});
  }

  function initConsent() {
    var box = document.getElementById('consent');
    var c = getConsent();
    if (c === 'ja') loadPixel();
    if (c !== null || !box) return;
    box.hidden = false;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]');
      if (!b) return;
      var v = b.getAttribute('data-consent');
      setConsent(v);
      box.hidden = true;
      if (v === 'ja') loadPixel();
    });
  }

  function initForm() {
    var form = document.getElementById('form');
    if (!form) return;
    var q = document.getElementById('quelle');
    try {
      var p = new URLSearchParams(location.search);
      var parts = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
        .map(function (k) { return p.get(k) ? k.replace('utm_', '') + '=' + p.get(k) : null; })
        .filter(Boolean);
      if (q && parts.length) q.value = 'Angebotsseite byd-seal-u · ' + parts.join(' · ');
    } catch (e) {}

    var msg = document.getElementById('msg');
    var sending = false;
    form.addEventListener('submit', function (e) {
      if (sending) { e.preventDefault(); return; }
      if (!form.checkValidity()) {
        e.preventDefault();
        form.reportValidity();
        if (msg) msg.textContent = 'Bitte Kaufart, Name, Telefon und Datenschutz ausfüllen.';
        return;
      }
      sending = true;
      if (msg) msg.textContent = 'Wird gesendet …';
      if (getConsent() === 'ja' && window.fbq) {
        e.preventDefault();
        track('Lead', { content_name: 'BYD SEAL U DM-i', value: 39990, currency: 'EUR' });
        setTimeout(function () { form.submit(); }, 350);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initConsent(); initForm(); });
  } else {
    initConsent(); initForm();
  }
})();
