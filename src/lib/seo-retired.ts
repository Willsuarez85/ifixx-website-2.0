// SEO indexation cleanup (2026-06-29) — single source of truth.
//
// iFIXX is a Charlotte / South Charlotte handyman & remodeler. The page generator
// produced a city × service matrix that included cities outside that focus and a
// service iFIXX does not offer as a trade. Those URLs are excluded here from page
// generation, the sitemap, and cross-links. The matching 301 redirects live in
// vercel.json so the retired URLs consolidate authority instead of 404-ing.
//
// Cities removed entirely (matrix + /service-areas hub):
//   huntersville (north), concord (Cabarrus), monroe + waxhaw (Union), rock-hill (SC).
// Kept: charlotte, south-charlotte, ballantyne, pineville, matthews, mint-hill.
export const RETIRED_CITIES = [
  'huntersville',
  'concord',
  'monroe',
  'waxhaw',
  'rock-hill',
] as const;

// Services removed in every city. iFIXX does not offer plumbing as a trade.
//
// NOTE: 'electrical-fixtures' is intentionally NOT listed here. Whether it stays
// (handyman fixture work — fans, outlets, light fixtures) or is removed (electrical
// trade) is an open decision for StarLord/Jaime. It is only dropped where its city
// is retired (collateral of removing the whole folder), never on its own in a kept
// city. See the PR's "pending decisions" note.
export const RETIRED_SERVICES = ['plumbing'] as const;

const retiredCities: readonly string[] = RETIRED_CITIES;
const retiredServices: readonly string[] = RETIRED_SERVICES;

export const isRetiredCity = (slug: string): boolean => retiredCities.includes(slug);
export const isRetiredService = (slug: string): boolean => retiredServices.includes(slug);

/** True when a /{city}/{service} or /service-areas/{city} URL should no longer exist. */
export const isRetiredCityServiceUrl = (url: string): boolean => {
  const m = url.match(/\/(?:service-areas\/)?([a-z-]+?)(?:\/([a-z-]+))?\/?$/);
  if (!m) return false;
  const [, first, second] = m;
  if (second) return isRetiredCity(first) || isRetiredService(second);
  return isRetiredCity(first);
};
