/**
 * iFIXX enhanced conversions: user data for the Google Ads "Lead Form Submit" conversion.
 *
 * Problem this solves: every form called gtag('set', 'user_data', ...) and then
 * redirected to /lp/thank-you. The Lead Form Submit conversion fires on that new page
 * load, where the data set on the form page no longer exists, so Google received the
 * conversion without user data (enhanced conversions coverage near 0%).
 *
 * What it does:
 *   1. normalize: email trimmed and lowercased (dropped if empty or invalid); phone
 *      in E.164 with +1 (dropped unless it has 10 US digits). No address: Google
 *      ignores an address without last name, ZIP and country.
 *   2. save(): the form stores the normalized data in sessionStorage right before
 *      redirecting. Never throws, so it can never break a submission.
 *   3. apply(): the thank-you page calls gtag('set', 'user_data', ...) with it, BEFORE
 *      the conversion event. clear() removes it right after.
 *
 * gtag hashes the values before sending them. Nothing is stored beyond the tab
 * (sessionStorage), and the value is deleted as soon as it is used.
 *
 * Inlined in the <head> by src/components/common/EnhancedConversionsScript.astro
 * (BaseLayout and LandingLayout). It exposes window.ifixxEC so inline (define:vars)
 * form scripts and the inline thank-you script can use the same implementation.
 */
(function () {
  var KEY = 'ifixx_ec_user_data';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function normalizeEmail(value) {
    if (value === null || value === undefined) return '';
    var email = String(value).trim().toLowerCase();
    return EMAIL_RE.test(email) ? email : '';
  }

  function normalizePhone(value) {
    if (value === null || value === undefined) return '';
    var digits = String(value).replace(/\D/g, '');
    if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
    return digits.length === 10 ? '+1' + digits : '';
  }

  // Returns { email?, phone_number? } or null when there is nothing usable.
  function build(email, phone) {
    var data = {};
    var e = normalizeEmail(email);
    var p = normalizePhone(phone);
    if (e) data.email = e;
    if (p) data.phone_number = p;
    return e || p ? data : null;
  }

  function save(email, phone) {
    try {
      var data = build(email, phone);
      if (data) window.sessionStorage.setItem(KEY, JSON.stringify(data));
      else window.sessionStorage.removeItem(KEY);
    } catch (err) {
      /* storage blocked or full: the lead still goes through */
    }
  }

  function apply() {
    try {
      var raw = window.sessionStorage.getItem(KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      var clean = data ? build(data.email, data.phone_number) : null;
      if (clean && typeof window.gtag === 'function') {
        window.gtag('set', 'user_data', clean);
        return true;
      }
    } catch (err) {
      /* unreadable value: the conversion still fires without user data */
    }
    return false;
  }

  function clear() {
    try {
      window.sessionStorage.removeItem(KEY);
    } catch (err) {
      /* nothing to clear */
    }
  }

  window.ifixxEC = {
    build: build,
    save: save,
    apply: apply,
    clear: clear,
    normalizeEmail: normalizeEmail,
    normalizePhone: normalizePhone,
  };
})();
