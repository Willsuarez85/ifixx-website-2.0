// SEO indexation cleanup (2026-06-29) — single source of truth.
//
// iFIXX is a Charlotte / South Charlotte handyman & remodeler. The page generator
// produced a city × service matrix that included cities outside that focus and a
// service iFIXX does not offer as a trade. Those URLs are excluded here from page
// generation, the sitemap, and cross-links. The matching 301 redirects live in
// vercel.json so the retired URLs consolidate authority instead of 404-ing.
//
// Cities removed from the city x service matrix and from every city list that
// links into it:
//   huntersville (north), concord (Cabarrus), monroe + waxhaw (Union), rock-hill (SC),
//   mint-hill (retired per Jaime/William 2026-07-07 — focus tightened to South Charlotte).
// Kept: charlotte, south-charlotte, ballantyne, pineville, matthews.
export const RETIRED_CITIES = [
  'huntersville',
  'concord',
  'monroe',
  'waxhaw',
  'rock-hill',
  'mint-hill',
] as const;

// Subset of RETIRED_CITIES that still gets a /service-areas/{city} zone hub.
// These are markets iFIXX serves and wants to rank for, but that do not justify
// their own city x service matrix: the thin barrio x servicio pages stay dead,
// only the hub comes back.
//   mint-hill — reinstated as a service area per William 2026-07-27 (active fence
//               market) WITHOUT reviving its 9 thin matrix pages.
// Keeping these slugs inside RETIRED_CITIES is deliberate: every list that links
// into the matrix keeps excluding them. Only the hub routes opt back in, via
// hasServiceAreaHub().
export const SERVICE_AREA_ONLY_CITIES = ['mint-hill'] as const;

// Services removed in every city — iFIXX does not offer these as a trade.
//   plumbing            — never offered.
//   electrical-fixtures — retired per StarLord/Jaime decision (2026-06-30): treated
//                         as electrical trade, not handyman. Removed from the matrix,
//                         the /repairs and /emergency-services pages, and the sitemap;
//                         301'd to /services (see vercel.json).
//   basement-finishing  — retired per Jaime/William 2026-07-07: iFIXX no longer offers
//                         basement finishing. Removed from the remodeling pillar + sitemap;
//                         301'd to /remodeling (see vercel.json).
export const RETIRED_SERVICES = ['plumbing', 'electrical-fixtures', 'basement-finishing'] as const;

const retiredCities: readonly string[] = RETIRED_CITIES;
const retiredServices: readonly string[] = RETIRED_SERVICES;
const serviceAreaOnlyCities: readonly string[] = SERVICE_AREA_ONLY_CITIES;

export const isRetiredCity = (slug: string): boolean => retiredCities.includes(slug);
export const isRetiredService = (slug: string): boolean => retiredServices.includes(slug);
export const isServiceAreaOnlyCity = (slug: string): boolean => serviceAreaOnlyCities.includes(slug);

/** True when /service-areas/{slug} should exist: an in-focus city, or a service-area-only one. */
export const hasServiceAreaHub = (slug: string): boolean =>
  !isRetiredCity(slug) || isServiceAreaOnlyCity(slug);

/**
 * True when a /{city}/{service} or /service-areas/{city} URL should no longer exist.
 * A service-area-only city keeps its hub, so /service-areas/{city} survives for it
 * while its city x service URLs stay retired.
 */
export const isRetiredCityServiceUrl = (url: string): boolean => {
  const isHub = /\/service-areas\//.test(url);
  const m = url.match(/\/(?:service-areas\/)?([a-z-]+?)(?:\/([a-z-]+))?\/?$/);
  if (!m) return false;
  const [, first, second] = m;
  if (second) return isRetiredCity(first) || isRetiredService(second);
  return isHub ? !hasServiceAreaHub(first) : isRetiredCity(first);
};
