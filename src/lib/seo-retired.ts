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
//   pressure-washing    — retired per William 2026-08-07: iFIXX does not offer it as a
//                         service. CONTEXT.md never listed it; the site had been selling it
//                         since PR #2. Removed from the repairs pillar + sitemap; the silo
//                         and the standalone /services/pressure-washing sales page are gone
//                         and 301 to /repairs, and the 15 city redirects that used to land
//                         on the silo were repointed there too (see vercel.json).
export const RETIRED_SERVICES = ['plumbing', 'electrical-fixtures', 'basement-finishing', 'pressure-washing'] as const;

// Services consolidated into a single canonical page: they are still offered, but they
// have NO /{city}/{service} page — the matrix skips them, and vercel.json 301s the old
// city URLs to the silo. Anything that links to a city x service URL must route these
// to the silo (or to the zone hub) instead, or it links to a hard 404.
// Single source of truth: the matrix generator and every page that links into it read
// this list. It used to be duplicated inline in two files and drifted into 404s.
export const CONSOLIDATED_SERVICES = [
  'kitchen-remodeling',
  'bathroom-remodeling',
  'painting',
  'drywall',
] as const;

// Matrix pruning, phase 2 (2026-08-06, per William) — the last 8 services that still
// had /{city}/{service} pages. Phase 1 (2026-07-28) left the 40 surviving combos live
// with noindex + canonical to their silo, on the plan of measuring for four weeks before
// deciding on a 301. William called the 301 early: these 8 services join the consolidated
// ones, the matrix stops generating entirely, and vercel.json 301s all 40 URLs to their
// service silo. The silo is where the canonical already pointed, so the target is unchanged.
//
// Consequence to know before reviving any of these: the /{city}/{service} URLs are gone as
// paid-landing destinations. Ads pointed at none of them (verified 2026-07-14), but any
// future campaign must land on the silo, the zone hub, or a dedicated money page.
export const PRUNED_MATRIX_SERVICES = [
  'carpentry',
  'doors-windows',
  'flooring-installation',
  'furniture-assembly',
  'outdoor-living',
  'pressure-washing',
  'quick-fix',
  'tv-mounting',
] as const;

const retiredCities: readonly string[] = RETIRED_CITIES;
const retiredServices: readonly string[] = RETIRED_SERVICES;
const serviceAreaOnlyCities: readonly string[] = SERVICE_AREA_ONLY_CITIES;
const consolidatedServices: readonly string[] = CONSOLIDATED_SERVICES;
const prunedMatrixServices: readonly string[] = PRUNED_MATRIX_SERVICES;

export const isRetiredCity = (slug: string): boolean => retiredCities.includes(slug);
export const isRetiredService = (slug: string): boolean => retiredServices.includes(slug);
export const isServiceAreaOnlyCity = (slug: string): boolean => serviceAreaOnlyCities.includes(slug);
export const isConsolidatedService = (slug: string): boolean => consolidatedServices.includes(slug);
export const isPrunedMatrixService = (slug: string): boolean => prunedMatrixServices.includes(slug);

/**
 * True when the /{city}/{service} page actually exists. Use before linking to one.
 * Since the 2026-08-06 pruning this is false for every combination: the matrix is gone.
 * The guard stays because every caller uses it to fall back to the silo or the zone hub,
 * and because it is what keeps a reintroduced route from linking into 404s again.
 */
export const hasCityServicePage = (citySlug: string, serviceSlug: string): boolean =>
  !isRetiredCity(citySlug) &&
  !isRetiredService(serviceSlug) &&
  !isConsolidatedService(serviceSlug) &&
  !isPrunedMatrixService(serviceSlug);

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
