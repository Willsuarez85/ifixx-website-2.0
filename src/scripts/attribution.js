/**
 * iFIXX lead attribution — single source of truth for every form on the site.
 *
 * Problem this solves: the old capture wrote utm_* / gclid to sessionStorage only,
 * so a visitor who clicked an ad on Monday and came back on Thursday submitted a
 * lead with no gclid and no campaign. Offline conversions never tied back to the click.
 *
 * What it does:
 *   1. On every page load, any attribution parameter present in the URL is written to
 *      BOTH sessionStorage (same-visit, back-compat with the old flat keys) and
 *      localStorage (90-day window, survives closing the browser).
 *   2. At submit time, forms call payload() and get the resolved attribution plus the
 *      page identity (source + page_path + landing_page + referrer).
 *
 * Resolution order at submit time: sessionStorage -> localStorage (if not expired)
 * -> the _gcl_aw cookie left by the Google Ads tag (gclid only).
 * The session and localStorage sets are taken whole, never merged key by key, so a
 * lead can never carry the campaign of one visit with the gclid of another. For the
 * same reason a new attributed URL replaces the whole stored set (keys it does not
 * carry are cleared), and the cookie fallback is skipped when the resolved visit
 * came from a non-Google or non-paid source, or when the cookie is older than the
 * visit (it would be the click of an earlier campaign).
 *
 * Inlined in the <head> by src/components/common/AttributionScript.astro, which is
 * included by BaseLayout and LandingLayout. It exposes window.ifixxAttribution so
 * both inline (define:vars) and bundled form scripts can use the same implementation.
 */
(function () {
  var PARAM_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'gbraid',
    'wbraid'
  ];

  var LOCAL_KEY = 'ifixx_attr';
  var MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
  var SESSION_LANDING_KEY = 'ifixx_landing_page';
  var SESSION_REFERRER_KEY = 'ifixx_referrer';
  var SESSION_TIME_KEY = 'ifixx_attr_t';
  var COOKIE_TOLERANCE_MS = 2 * 60 * 1000; // clock slack between our capture and the tag's cookie
  var SESSION_FIRST_PAGE_KEY = 'ifixx_first_page';
  var SESSION_FIRST_REFERRER_KEY = 'ifixx_first_referrer';
  var MAX_VALUE_LENGTH = 500;

  // Storage can throw (Safari private mode, blocked cookies). Attribution must never
  // be the reason a lead form fails to submit.
  function sessionGet(key) {
    try {
      return window.sessionStorage.getItem(key) || '';
    } catch (e) {
      return '';
    }
  }

  function sessionSet(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (e) {
      /* no-op */
    }
  }

  function sessionRemove(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch (e) {
      /* no-op */
    }
  }

  function localGetRaw() {
    try {
      return window.localStorage.getItem(LOCAL_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function localSetRaw(value) {
    try {
      window.localStorage.setItem(LOCAL_KEY, value);
    } catch (e) {
      /* no-op */
    }
  }

  function readCookie(name) {
    try {
      var parts = String(document.cookie || '').split(';');
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i].trim();
        if (part.indexOf(name + '=') === 0) {
          return decodeURIComponent(part.slice(name.length + 1));
        }
      }
    } catch (e) {
      /* no-op */
    }
    return '';
  }

  /**
   * The Google Ads tag stores the click id as `GCL.<timestamp>.<gclid>`.
   * The gclid itself never contains a dot, but slice+join is the safe read.
   */
  function clickFromCookie() {
    var raw = readCookie('_gcl_aw');
    if (!raw) return null;
    var parts = raw.split('.');
    if (parts.length < 3 || parts[0] !== 'GCL') return null;
    var stamp = Number(parts[1]);
    if (!isFinite(stamp)) stamp = 0;
    // The tag writes seconds; normalise to milliseconds.
    if (stamp < 1e12) stamp = stamp * 1000;
    return { gclid: parts.slice(2).join('.'), t: stamp };
  }

  function hasAnyParam(source) {
    if (!source) return false;
    for (var i = 0; i < PARAM_KEYS.length; i++) {
      if (source[PARAM_KEYS[i]]) return true;
    }
    return false;
  }

  /**
   * The cookie click id is only trusted when it belongs to the visit being resolved.
   *   - No stored set at all: the cookie is the only trace of the ad click, use it.
   *   - A stored set without gclid: use the cookie only if the visit is a Google paid
   *     one AND the cookie was written during that visit or later. An older cookie is
   *     the click of a previous campaign (or the visit is a Business Profile link
   *     tagged utm_source=google&utm_medium=organic) and must not be attached.
   */
  function cookieGclidFor(resolved, visitTime) {
    var click = clickFromCookie();
    if (!click) return '';
    if (!hasAnyParam(resolved)) return click.gclid;
    if (resolved.gbraid || resolved.wbraid) return '';
    var source = String(resolved.utm_source || '').toLowerCase();
    if (source && source.indexOf('google') === -1 && source !== 'adwords') return '';
    var medium = String(resolved.utm_medium || '').toLowerCase();
    if (medium === 'organic' || medium === 'referral') return '';
    if (!visitTime || !click.t) return '';
    return click.t >= visitTime - COOKIE_TOLERANCE_MS ? click.gclid : '';
  }

  function readLocal() {
    var raw = localGetRaw();
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      var savedAt = Number(parsed.t);
      if (!isFinite(savedAt) || Date.now() - savedAt > MAX_AGE_MS) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function readSession() {
    var found = {};
    for (var i = 0; i < PARAM_KEYS.length; i++) {
      var value = sessionGet(PARAM_KEYS[i]);
      if (value) found[PARAM_KEYS[i]] = value;
    }
    return found;
  }

  function currentPath() {
    try {
      return window.location.pathname || '/';
    } catch (e) {
      return '/';
    }
  }

  /**
   * Records the first page of the visit always, and the full attribution set
   * whenever the URL carries one. A new attributed visit overwrites the stored set
   * (last click wins, which is how Google Ads reports the conversion anyway).
   */
  function capture() {
    if (!sessionGet(SESSION_FIRST_PAGE_KEY)) {
      sessionSet(SESSION_FIRST_PAGE_KEY, currentPath());
      sessionSet(SESSION_FIRST_REFERRER_KEY, document.referrer || '');
    }

    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (e) {
      return;
    }

    var found = {};
    for (var i = 0; i < PARAM_KEYS.length; i++) {
      var value = params.get(PARAM_KEYS[i]);
      if (value) found[PARAM_KEYS[i]] = String(value).slice(0, MAX_VALUE_LENGTH);
    }

    if (!hasAnyParam(found)) return;

    var landingPage = currentPath();
    var referrer = document.referrer || '';

    // Replace the whole set: a key the new URL does not carry is cleared, otherwise
    // a Facebook visit in the same tab would keep the gclid of an earlier Google click.
    for (var j = 0; j < PARAM_KEYS.length; j++) {
      var key = PARAM_KEYS[j];
      if (found[key]) sessionSet(key, found[key]);
      else sessionRemove(key);
    }
    sessionSet(SESSION_LANDING_KEY, landingPage);
    sessionSet(SESSION_REFERRER_KEY, referrer);

    found.t = Date.now();
    sessionSet(SESSION_TIME_KEY, String(found.t));
    found.landing_page = landingPage;
    found.referrer = referrer;
    localSetRaw(JSON.stringify(found));
  }

  function get() {
    var base = null;
    var session = readSession();
    var local = null;

    if (hasAnyParam(session)) {
      base = session;
      base.landing_page = sessionGet(SESSION_LANDING_KEY);
      base.referrer = sessionGet(SESSION_REFERRER_KEY);
      base.t = Number(sessionGet(SESSION_TIME_KEY)) || 0;
    } else {
      local = readLocal();
      if (hasAnyParam(local)) base = local;
    }

    var resolved = {};
    for (var i = 0; i < PARAM_KEYS.length; i++) {
      resolved[PARAM_KEYS[i]] = (base && base[PARAM_KEYS[i]]) || '';
    }

    // Last resort for the click id: the cookie the Google Ads tag drops on the
    // landing page. It outlives sessionStorage and is written even if this script
    // never saw the parameter (e.g. auto-tagging redirect handled by gtag).
    // Skipped when the resolved visit is attributed to something other than a Google
    // paid click, or when the cookie is older than the visit: it would belong to an
    // earlier campaign.
    if (!resolved.gclid) {
      resolved.gclid = cookieGclidFor(resolved, base ? Number(base.t) || 0 : 0);
    }

    resolved.landing_page =
      (base && base.landing_page) || sessionGet(SESSION_FIRST_PAGE_KEY) || currentPath();
    resolved.referrer =
      (base && base.referrer) || sessionGet(SESSION_FIRST_REFERRER_KEY) || '';

    return resolved;
  }

  function titleFromPath(path) {
    var segments = String(path || '')
      .split('?')[0]
      .split('#')[0]
      .split('/')
      .filter(Boolean);

    if (!segments.length) return 'Home';

    // The last two segments identify the page without turning deep paths into a
    // sentence: /remodeling/kitchen-remodeling -> "Remodeling Kitchen Remodeling".
    var tail = segments.slice(-2);
    var words = [];
    for (var i = 0; i < tail.length; i++) {
      if (i > 0 && tail[i] === tail[i - 1]) continue;
      var parts = tail[i].split('-');
      for (var j = 0; j < parts.length; j++) {
        if (!parts[j]) continue;
        words.push(parts[j].charAt(0).toUpperCase() + parts[j].slice(1));
      }
    }
    return words.join(' ') || 'Home';
  }

  function sourceFromPath() {
    return titleFromPath(currentPath()) + ' Page Form';
  }

  /**
   * What a form sends to /api/lead. `formLabel` is the human-readable, page-specific
   * name of the form; when a component cannot know it (generic component reused on
   * many pages), the label is derived from the path.
   */
  function payload(formLabel) {
    var attribution = get();
    return {
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_term: attribution.utm_term,
      utm_content: attribution.utm_content,
      gclid: attribution.gclid,
      gbraid: attribution.gbraid,
      wbraid: attribution.wbraid,
      landing_page: attribution.landing_page,
      referrer: attribution.referrer,
      page_path: currentPath(),
      source: formLabel || sourceFromPath()
    };
  }

  window.ifixxAttribution = {
    capture: capture,
    get: get,
    payload: payload,
    sourceFromPath: sourceFromPath
  };

  capture();
})();
