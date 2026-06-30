# Handoff — Limpieza de indexación SEO (2026-06-29)

> **Doc de trabajo** para la siguiente sesión de Claude Code en este repo. No es un entregable de cliente.
> Estado al cierre: **PR abierto, sin merge, sin deploy.**

## Estado actual

- **PR:** https://github.com/Willsuarez85/ifixx-website-2.0/pull/3
- **Rama:** `seo/noindex-redirect-plomeria-geos-2026-06-29`
- **Build:** `npm run build` ✅ · `astro check`: 24 errores **preexistentes, 0 nuevos** (el repo no tiene script de lint).
- **Espera:** revisión de Sebas + que StarLord/Jaime definan las 2 decisiones pendientes (abajo).

## Qué ya se implementó (decidido, no volver a tocar)

Stack real: **Astro 5 + `@astrojs/sitemap` + `vercel.json`** (no Next.js, como asumía el handoff original).

Única fuente de verdad: **[`src/lib/seo-retired.ts`](../../src/lib/seo-retired.ts)** → `RETIRED_CITIES`, `RETIRED_SERVICES`. La consumen los generadores, el sitemap y todos los cross-links.

- Plomería (`plumbing`) retirada en **todas** las ciudades + pillar `/repairs/plumbing`.
- 5 ciudades fuera de foco retiradas completas (`huntersville, concord, monroe, waxhaw, rock-hill`): 11 servicios c/u + hub `/service-areas/{ciudad}`.
- **65 redirects 301** en `vercel.json`: plomería/eléctrico → `/services`; `/{ciudad-retirada}/{servicio}` → `/charlotte/{servicio}`; `/service-areas/{ciudad-retirada}` → `/service-areas`.
- Sitemap regenerado: **~173 → 106 URLs**. Guard defensivo en `astro.config.mjs`.
- Conservados intactos: charlotte, south-charlotte, ballantyne, pineville, matthews + **mint-hill**, con sus servicios reales y `electrical-fixtures` en barrios.

## Decisiones — RESUELTAS (2026-06-30)

1. **mint-hill** — ✅ **se conserva** (decisión final). Sigue viva con sus servicios reales (9, sin plumbing/electrical) + `/service-areas/mint-hill`. Sin cambios.
2. **electrical-fixtures** — ✅ **se retira** (tratado como eléctrico de oficio, no handyman). Aplicado: añadido a `RETIRED_SERVICES`; eliminada la página `src/pages/emergency-services/electrical-fixtures.astro`; 301 a `/services` desde `/{ciudad}/electrical-fixtures`, `/repairs/electrical-fixtures`, `/emergency-services/electrical-fixtures`; fuera del sitemap.

   > Nota: el slug `plumbing` resultó ser *"Faucet & Fixture Repair — fixes que no requieren plomero"* y `electrical-fixtures` *"fixes que no requieren electricista"*. Pese al matiz, ambos se retiraron por decisión.

## Follow-up: pasada de COPY (fuera de scope de este PR)

Copy promocional en ~10 lugares todavía nombra **"plumbing / electrical / HVAC"** como servicios ofrecidos → choca con la regla dura "no presentar/promocionar plomería, eléctrico, HVAC". No se tocó (es reescritura de copy, no indexación, y depende de la decisión #2). Lugares detectados:

- `src/pages/index.astro` (schema de emergencias: "emergency plumbing repairs", "emergency electrical repairs")
- `src/pages/repairs/index.astro` (description + seo.description)
- `src/pages/services/index.astro` (seoDescription)
- `src/pages/for-property-managers.astro` (lista "plumbing, electrical, HVAC")
- `src/pages/for-homeowners.astro`
- `src/pages/service-areas/[locationSlug].astro` (pillar description)
- `src/pages/service-areas/index.astro:207` (`<p>Electrical & Plumbing</p>`)
- `src/pages/emergency-services/water-damage.astro`, `fixture-repair.astro` (mencionan "licensed plumber" — referido a un tercero, revisar tono igual)

Recomendado: un PR aparte después de resolver la decisión #2.

## Verificación (replicable)

```bash
cd ~/code/ifixx-website-2.0
npm install
npm run build                                  # debe completar; genera sitemap-index.xml
SM=$(ls dist/client/sitemap-*.xml | grep -v index | head -1)
grep -c "plumbing\|huntersville\|concord\|/monroe\|waxhaw\|rock-hill" "$SM"   # => 0
# redirects (se validan parseando vercel.json; Vercel los aplica en deploy/preview):
#   /monroe/plumbing -> /services ; /rock-hill/carpentry -> /charlotte/carpentry ; /service-areas/monroe -> /service-areas
```

## Prompt de arranque (pegar en la próxima sesión de Claude Code)

```
Lee docs/seo/HANDOFF-2026-06-29-noindex-redirect.md y CLAUDE.md.

Contexto: el PR #3 (rama seo/noindex-redirect-plomeria-geos-2026-06-29) ya retiró
plomería y las 5 ciudades fuera de foco (noindex + 301 + sitemap). Está esperando
review y 2 decisiones. Reglas duras: iFIXX NO ofrece plomería/eléctrico/HVAC; un
solo teléfono (980) 391-6833; nunca "licensed"; foco Charlotte/South Charlotte.

Tarea (según lo que StarLord confirme):
- Si confirman retirar mint-hill: añádela a RETIRED_CITIES en src/lib/seo-retired.ts
  y genera sus redirects (mismo patrón que las otras 5).
- Si deciden sobre electrical-fixtures: aplícalo vía RETIRED_SERVICES (eliminar) o
  déjalo y haz la pasada de copy.
- Pasada de copy: quita plomería/eléctrico/HVAC del copy promocional listado en el
  handoff (sección "Follow-up").

Entrega: rama nueva + PR. Build antes. No deploy, no merge.
```
