# Ads Campaign Brief — Fences + Decks South Charlotte (2026-07)

> Prompt / brief para el agente (o media buyer) que va a ARMAR las campañas de Google Ads de iFIXX para Fences y Decks. Data verificada; no inventar. Reglas duras abajo son obligatorias.
> Estado del sitio: landings en vivo tras merge del PR de copy. Tracking ya cableado en el código.

---

Eres un especialista en Google Ads. Vas a ARMAR (estructura + copy + tracking) las campañas de búsqueda de iFIXX para Fences y Decks en South Charlotte. NO inventes datos: todo lo verificado está abajo y en los docs del repo.

## Negocio
iFIXX Remodeling & Handyman Services. Empresa LOCAL, family-owned, Charlotte NC. Foco: South Charlotte y alrededores (Ballantyne, SouthPark, Waxhaw, Weddington, Pineville, Matthews, y en SC: Fort Mill, Indian Land). Teléfono ÚNICO: (980) 391-6833. Líneas a promocionar ahora: FENCE (install + repair, wood/vinyl/aluminum) y DECK (repair; build queda para después por CPC alto). Instalan con crew propio, +10 años en decks, pago por hitos, estimados online, precios claros, rápido.

## Reglas duras de copy (no romper)
- Sin guiones largos (— ni –).
- "insured", NUNCA "licensed". No publicar número de licencia.
- NO prometer "permits handled" ni manejo de permisos/HOA.
- NO luxury / premier / custom-design / franquicia / call-center.
- NO "cheapest / affordable". Usar fair, honest, clear, local, fast.
- Proyectos calificados, no jobs chiquitos (evitar 1 tabla / 1 picket).
- Ángulos ganadores (unclaimed en el SERP): "a real person answers and shows up", repair-or-replace honesto, precio claro, genuinamente local, family-owned, insured & accountable. Fence: privacidad + protección.

## Cuentas / tracking (ya configurado en el sitio)
- Google Ads Conversion ID: AW-17542077404
- GA4: G-XV0NEL86VN · GTM: GTM-KXPL7CDR
- Conversión "Lead form submit": AW-17542077404/mVQ-CKbl7PIbENy326xB (dispara al cargar /lp/thank-you tras enviar el form).
- Conversión "Phone click": AW-17542077404/QjnuCMqS4PIbENy326xB (dispara en cualquier tel: link).
- Marca ambas como conversiones PRIMARIAS de la campaña.
- Auto-tagging = ON (Account settings) para capturar gclid.

## Cómo llega la atribución a GHL (respétalo)
El form de las landings lee gclid + utm_* de la URL y los manda a GoHighLevel (attributionSource). Por eso:
- Usa el sitio con URLs SIN barra final (canonical trailingSlash: never). Manda el anuncio directo a la URL canónica.
- Configura Final URL suffix POR AD GROUP (sobrevive redirects, no rompe la URL). Formato:
  `utm_source=google&utm_medium=cpc&utm_campaign=south_charlotte_service_test_2026_07&utm_content=<ADGROUP>&utm_term={keyword}`
- utm_content por ad group: fence_core, fence_repair, deck_repair (y luego deck_build, screened_porch).
- No uses tracking template Y suffix a la vez; usa suffix.

## Landing URLs + CTA (usar como Final URL del ad group)
- Fence Core y Fence Repair → https://www.ifixxnc.com/fence-installation-south-charlotte  (CTA en página: "Request a Free Fence Estimate" + Call (980) 391-6833)
- Deck Repair → https://www.ifixxnc.com/deck-repair-south-charlotte  (CTA: "Request a Free Online Estimate")
- (Después) Deck Build → https://www.ifixxnc.com/deck-builder-south-charlotte  (CTA: "Request a Free Deck Estimate")

## Budget de arranque: $50/día
Distribución: Fence Core + Fence Repair + Deck Repair. Deck Build NO al inicio (CPC ~$36 real). Screened Porch como test si sobra budget.

## Estructura de campañas (data VERIFICADA de DataForSEO, Charlotte)
CAMPAÑA 1 — "iFIXX Search — Fence South Charlotte 2026"
- Ad group Fence Core (utm_content=fence_core): fence company charlotte (260/mo, CPC ~$8.78), fence contractor charlotte, fence installation charlotte nc (90/mo, ~$21), fence installers near me / fence installation near me (170/mo, ~$13.6). Materiales como keywords: privacy fence, wood fence, vinyl fence, aluminum fence (volúmenes bajos, match phrase/exact).
- Ad group Fence Repair (utm_content=fence_repair): fence repair charlotte (50/mo, ~$14), fence repair near me (30/mo, ~$17.7). Watch tiny-job: agrega negativos de un solo picket/post.

CAMPAÑA 2 — "iFIXX Search — Deck South Charlotte 2026"
- Ad group Deck Repair (utm_content=deck_repair): deck repair charlotte (70/mo, ~$14.7), deck repair near me (30/mo, ~$6.7). Sweet spot barato.
- (Later) Ad group Deck Build (utm_content=deck_build): deck builder charlotte nc / deck builders charlotte (320/mo, CPC ~$36), deck builders near me (170/mo, ~$13). Bid con techo, alto ticket.
- (Test) Ad group Screened Porch (utm_content=screened_porch): screened porch charlotte (40/mo, ~$30.8), screened porch builder.

Match types: exact + phrase para los money terms; nada de broad sin tCPA maduro.

## Negativos de arranque (agrega a ambas campañas)
diy, how to, how do i, build your own, plans, tutorial, youtube, ideas, pictures; job, jobs, career, hiring, salary, pay, apprentice; cheap, cheapest, free, discount, coupon, grant; home depot, lowes, menards, costco, amazon, panels, pickets, boards for sale, kit, supplies, for sale, wholesale; rental, rent, temporary, used, craigslist; pool deck, deck of cards, boat deck, invisible fence, electric fence, farm fence, barbed wire, dog fence (monitor), deck cleaning (monitor), deck stain diy. "license/licensed" como monitor, no hard block.

## Geo
Targeting por radio + zips afluentes: Ballantyne, SouthPark, Waxhaw, Weddington, Pineville, Matthews, Mint Hill. Incluir EXPLÍCITAMENTE Fort Mill SC e Indian Land SC (son SC, caen fuera del radio Charlotte-NC). Presence: "people in or regularly in" (no interés).

## RSA (respetando reglas duras) — direcciones, no copiar literal
Headlines mezclando: "Fences Built Right in South Charlotte", "A Real Person Answers", "We Tell You Repair or Replace", "Fair, Clear Quote", "Privacy Fences for South Charlotte", "Insured, Local, Family Owned", "Local Crew, Not a Call Center", "Free Online Estimate", "Call (980) 391-6833, We Pick Up", "Wood, Vinyl, and Aluminum Fences", "Deck Repair Done Honestly".
Descriptions: "Local, family-owned crew. Insured. We answer, we show up, and we finish. Get a clear quote on your fence or deck. Call (980) 391-6833.", "Privacy fences and honest repairs for South Charlotte homes. Fair price, fast work, free online estimate."
Extensions: Sitelinks (Privacy Fences, Fence Repair, Deck Repair, Free Estimate). Callouts (Insured & Accountable, Local Family Owned, We Answer the Phone, Fair Clear Quotes, Wood Vinyl Aluminum). Call extension con (980) 391-6833. Structured snippets (Services: Fence Installation, Fence Repair, Privacy Fence, Deck Repair).

## Gates ANTES de encender (checklist)
1. Auto-tagging ON. 2. Las 2 conversiones importando/activas y marcadas primarias. 3. Test de humo: abrir cada Final URL con `?gclid=TEST123&utm_source=google&utm_medium=cpc&utm_campaign=test`, enviar el form, confirmar en GHL que aparecen utm_* y gclid TEST123. 4. Pipeline GHL de routing por tag (deck-outdoor, fence-outdoor) creado. 5. Negativos cargados. 6. Geo verificado (incluye SC).

## Señales 7-14 días (escalar vs pausar)
- Escalar: search terms limpios y on-topic, CPL en rango (~$150-$300 estimado), llamadas/forms reales.
- Pausar/ajustar: muchos términos DIY/tiny-job/precio-shopping, CPC por encima del techo, 0 conversiones con clics (revisar landing/tracking).
- Reasignar budget al ad group con mejor CPL; fence suele ser más eficiente que deck build.

## Docs de referencia en el repo (leer antes de armar)
- `docs/landings/research/fences-decks-2026-07/04b-keywords-VERIFIED-dataforseo.md` (volúmenes/CPC reales + CSV)
- `docs/landings/research/fences-decks-2026-07/05-serp-ads.md` (ángulos vs competencia)
- `docs/landings/research/fences-decks-2026-07/SYNTHESIS-fences-decks-2026-07.md` (posicionamiento + messaging bank)
- `docs/landings/google-ads-tracking-setup.md` (UTM/suffix/conversiones, filas de fence)

Entregable: estructura de campañas/ad groups/keywords + negativos + geo + RSAs + extensions + los Final URL suffix por ad group, listos para cargar. NO enciendas hasta pasar los gates.
</content>
