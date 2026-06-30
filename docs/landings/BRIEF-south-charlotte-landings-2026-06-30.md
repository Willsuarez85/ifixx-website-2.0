# Brief — Revisión y mejora de las 2 landings de South Charlotte

> Para el agente que tome la revisión de `drywall-repair-south-charlotte` y `deck-repair-south-charlotte`.
> Doc de trabajo. URLs: https://www.ifixxnc.com/drywall-repair-south-charlotte · https://www.ifixxnc.com/deck-repair-south-charlotte

## Contexto de negocio (NO romper)

iFIXX = **handyman / remodelador de Charlotte**. Posicionamiento (de `CONTEXT.md` del cliente):
> "Charlotte's same-day emergency handyman. Fast, honest, local home repairs."

- **Must say:** same-day/emergency handyman (cuando aplique), fast/honest/local, **insured**, los dueños (Jaime & Hamed) responden directo, precios transparentes.
- **Must NOT say:** nunca "licensed"; **no** plomería, **no** eléctrico, **no** HVAC; **un solo teléfono: (980) 391-6833**, ningún otro.
- Estas dos son **landings de campaña paga** (Google Ads — `campaign_test: ifixx_south_charlotte_service_test_2026_07`). Su objetivo es **conversión + message-match con el anuncio**, no SEO orgánico. Optimiza para que el lead entre, no para rankear.

## 🚨 URGENTE — arreglar antes de cualquier mejora

**El botón "Call" del deck landing está roto.** En `src/pages/deck-repair-south-charlotte.astro:92` el `href` es `tel:+198****6833` (con asteriscos, no marca). El texto visible dice (980) 391-6833 pero el link no funciona → **se están perdiendo llamadas en vivo** y viola la regla del teléfono único. Fix: `tel:+19803916833`. (El drywall landing sí lo tiene bien.)

## Tarea 1 — Verificar que los leads llegan al CRM (GoHighLevel)

Flujo: `LandingEstimateForm` → `POST /api/lead.ts` → GHL `contacts/upsert` (leadconnectorhq.com). GHL Location `KoSPUTpwwHX6t12vY7TO`.

Verificar punto por punto:
1. **Env vars en Vercel (prod):** `GHL_API_KEY` y `GHL_LOCATION_ID`. Si faltan, el API devuelve 500 "Server configuration error" y **no entra ningún lead**. Hacer un submit de prueba real y confirmar que el contacto aparece en GHL.
2. **Tags correctos** (los workflows de GHL rutean por tag):
   - drywall-repair → `service-drywall-repair, service-painting, handyman, south-charlotte-test`
   - deck-repair → `service-deck-repair, service-carpentry, handyman, south-charlotte-test`
   - Confirmar que caen en el pipeline **Handyman** (`68c5d888-...`).
3. **Custom fields:** Service Needed (`6PzFTQhylccNWI2VtAn7`) y Project Notes (`HhBO7YQAST3aZR770LJO`) se llenan.
4. **Atribución Google Ads:** `/api/lead.ts` acepta `utm_*`/`gclid` y los manda como `attributionSource`. **Pero verificar que el form realmente los envía** — el `LandingEstimateForm` no parece incluir utm/gclid en el body del POST (BaseLayout los captura, ¿llegan al form?). Si no llegan, se pierde la conversión offline de Google Ads.
5. **thank-you / conversión:** al enviar, el form redirige a `/lp/thank-you`. Confirmar que ahí (o en el submit) dispara el evento de conversión GA4/Google Ads.
6. **Fotos:** el form v1 **no sube fotos a GHL** — el copy debe pedir al cliente textear fotos a (980) 391-6833. Confirmar que queda claro.
7. **Bug latente (no bloquea estas 2):** los custom fields de Property Manager (`company_name`, `number_of_properties`, `property_types`) usan IDs placeholder con `// TODO: create in GHL` → fallan en GHL. Arreglar solo si se toca el form de PM.

## Tarea 2 — Drywall: corregir el enfoque (decisión de StarLord)

**Hoy la página está sobre-enfocada en "paint matching"** — está en el `title`, el H1 ("Drywall Repair + Paint Matching"), el `serviceSchema`, el badge y toda la narrativa de "the patch still shows / paint blending".

**Reenfocar a: reparación de drywall y "arreglar pedazos de la casa".** Headline y cuerpo sobre: huecos, grietas, nail pops, juntas, **techos**, **daño por agua** (una vez resuelta la fuente), texturas (orange peel/knockdown/popcorn), y **punch-list de reparaciones del hogar**. Framing de **handyman repair**.

- Bajar "paint matching/blending" a **un bullet de apoyo** ("también ayudamos a difuminar el acabado tras el parche"), nunca el headline.
- Quitar "Paint Matching" del `title`, H1 y `serviceSchema.serviceType`.
- Revisar FAQ #2 (hoy es 100% sobre pintura) y el primer bloque de cuerpo.
- Considerar quitar el tag `service-painting` del lead (Tarea 1) si ya no es la promesa central.

**¿Va con la estrategia? Sí, y la refuerza.** iFIXX es handyman de reparaciones; "drywall repair / arreglar pedazos de la casa" es servicio core. Liderar con "paint matching" (a) deriva el posicionamiento hacia *pintor* en vez de *handyman*, y (b) fija expectativa de match de pintura perfecto —difícil con paredes/sol/edad— que genera clientes insatisfechos. Reparación primero, acabado como apoyo, es más honesto y más on-brand.

## Tarea 3 — Deck: conservar el ángulo, pulir

- **El ángulo "repair-first / repair-before-replace" es excelente y on-strategy** (honesto, handyman, evita vender un rebuild innecesario). Conservarlo.
- Fix del teléfono (arriba).
- **Galería:** varias imágenes son de construcción nueva / outdoor-living (porches, decks nuevos), no de *reparación*. Alinear la galería a reparación real (tablas podridas, barandas, escalones) para no prometer obra nueva.
- Reforzar same-day, dueños responden, precio transparente.

## Tarea 4 — Diseño / copy / organización (ambas)

- **Aprender de las landings existentes:** `src/pages/lp/handyman.astro`, `src/pages/lp/water-damage.astro`, `lp/emergency.astro`, `lp/fixture-repair.astro` (voz, urgencia, estructura de conversión) y las páginas `src/pages/repairs/*` (precisión de servicio). Voz también en `CONTEXT.md` del cliente.
- **Voz iFIXX:** rápido, honesto, local; dueños (Jaime & Hamed) responden directo; insured; precio transparente. Nunca licensed/plumbing/electrical/HVAC.
- **Conversión:** form above-the-fold ✓. Revisar: prueba social más arriba, reducir campos del form (menos fricción = más leads), peso/velocidad del hero, experiencia mobile, claridad del CTA.
- **Consistencia:** ambas ya comparten estructura (hero+form, trustbar, dolor, galería, proceso, who-is-iFIXX, FAQ, reviews, CTA). Mantenerla; mejorar dentro de ese molde.

## Tarea 5 — Posicionamiento / info correcta

- Cero menciones de plumbing/electrical/HVAC. "Insured", nunca "licensed". Un solo teléfono.
- **Áreas de servicio:** ambas listan Waxhaw/Weddington. Ojo: en la limpieza SEO reciente, Waxhaw se retiró de la matriz orgánica (fuera de foco). En una **landing de campaña paga** mencionarla como área servida puede ser aceptable, pero decidir conscientemente — mantener coherencia con el foco South Charlotte. (mint-hill se conserva.)

## Entrega

- **Rama nueva + PR.** No commit directo a `main` (eso auto-deploya a producción sin review). `npm run build` y `npx astro check` antes (línea base: 24 errores preexistentes, 0 nuevos). **No merge, no deploy.**

## Prompt de arranque (pegar en el otro agente)

```
Lee docs/landings/BRIEF-south-charlotte-landings-2026-06-30.md y CLAUDE.md (raíz).

Trabaja las 2 landings de campaña de South Charlotte:
  src/pages/drywall-repair-south-charlotte.astro
  src/pages/deck-repair-south-charlotte.astro

1. URGENTE: arregla el tel: roto del deck landing (tel:+198****6833 -> tel:+19803916833).
2. Verifica el flujo de leads al CRM (GHL) según la Tarea 1 del brief: env vars en
   Vercel, tags, custom fields, atribución utm/gclid, conversión en thank-you.
3. Drywall: reenfoca de "paint matching" a reparación de drywall + arreglar pedazos
   de la casa (huecos, grietas, techos, daño por agua, punch-list). Paint blending
   solo como apoyo. Ajusta title, H1, schema, badge, cuerpo y FAQ.
4. Deck: conserva el ángulo repair-first; alinea galería a reparación real; pule copy.
5. Aprende de src/pages/lp/*.astro y src/pages/repairs/* para voz y estructura.

Reglas duras (CONTEXT iFIXX): handyman, no plumbing/electrical/HVAC; "insured", nunca
"licensed"; teléfono único (980) 391-6833; foco Charlotte / South Charlotte; dueños
Jaime & Hamed responden directo; precio transparente.

Entrega: rama + PR. build + astro check antes. No deploy, no merge.
```
