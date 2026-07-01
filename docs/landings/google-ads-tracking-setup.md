# Google Ads — Tracking & UTM setup

> Campaña: **iFIXX Search — South Charlotte Service Test 2026-07**
> Google Ads Conversion account: `AW-17542077404` · GA4: `G-XV0NEL86VN` · GTM: `GTM-KXPL7CDR`
> El form de las landings ya lee `gclid` + `utm_*` de la URL y los manda a GoHighLevel (`attributionSource`). Este doc es la config del lado de Google Ads para que eso funcione.

## 0) Pre-requisito: Auto-tagging ON
`Google Ads → Settings → Account settings → Auto-tagging = ON`.
Esto agrega `?gclid=...` a cada clic automáticamente. Sirve para dos cosas:
1. Importar conversiones offline desde GHL de vuelta a Google Ads.
2. El form de la landing lee ese `gclid` y lo guarda en el lead.
No necesitas poner `gclid={gclid}` manualmente si auto-tagging está ON.

## 1) Final URLs por ad group (SIN barra final = canonical)
> El sitio usa `trailingSlash: 'never'` y la canónica es sin barra. Usa las URLs sin `/` final para que el anuncio caiga directo en la canónica y no haya un salto de redirect (que puede perder params).

| Ad group | Final URL del anuncio |
|---|---|
| Drywall Repair + Paint | `https://www.ifixxnc.com/drywall-repair-south-charlotte` |
| Deck Repair & Rebuilds | `https://www.ifixxnc.com/deck-repair-south-charlotte` |
| Interior Painting | `https://www.ifixxnc.com/interior-painting-south-charlotte` |
| Deck Builder / New Deck (cuando lo lances) | `https://www.ifixxnc.com/deck-builder-south-charlotte` |
| Fence Core (install / company) | `https://www.ifixxnc.com/fence-installation-south-charlotte` |
| Fence Repair | `https://www.ifixxnc.com/fence-installation-south-charlotte` |

> **Arranque $50/día (decisión 2026-07-01):** Fence Core + Fence Repair + Deck Repair. Deck Build NO al inicio (CPC ~$36). Ambos ad groups de fence apuntan a la misma landing `/fence-installation-south-charlotte` (el `utm_content` los distingue).

## 2) Final URL suffix (método recomendado por Google)
Se configura por **ad group** (`Ad group → Settings → Final URL suffix`). Sobrevive redirects y no rompe la URL. Pega esto según el ad group:

**Drywall Repair + Paint**
```
utm_source=google&utm_medium=cpc&utm_campaign=south_charlotte_service_test_2026_07&utm_content=drywall_repair_paint&utm_term={keyword}
```
**Deck Repair & Rebuilds**
```
utm_source=google&utm_medium=cpc&utm_campaign=south_charlotte_service_test_2026_07&utm_content=deck_repair_rebuilds&utm_term={keyword}
```
**Interior Painting**
```
utm_source=google&utm_medium=cpc&utm_campaign=south_charlotte_service_test_2026_07&utm_content=interior_painting&utm_term={keyword}
```
**Fence Core**
```
utm_source=google&utm_medium=cpc&utm_campaign=south_charlotte_service_test_2026_07&utm_content=fence_core&utm_term={keyword}
```
**Fence Repair**
```
utm_source=google&utm_medium=cpc&utm_campaign=south_charlotte_service_test_2026_07&utm_content=fence_repair&utm_term={keyword}
```

> `{keyword}` es un ValueTrack que inserta el keyword que disparó el anuncio → cae en `utm_term` y llega a GHL como `attributionSource.utmTerm`. Útil para ver qué términos convierten.

## 3) Alternativa: Tracking template (si prefieres no usar suffix)
`Ad group → Settings → Tracking template`:
```
{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign=south_charlotte_service_test_2026_07&utm_content=deck_repair_rebuilds&utm_term={keyword}
```
(cambia `utm_content` por ad group). Usa **suffix O template, no ambos**. Recomiendo el **suffix**.

## 4) Cómo llega a GoHighLevel
El form manda `utm_source/medium/campaign/term/content` + `gclid` a `/api/lead`, que los mapea a `attributionSource` en el contacto:
- utm_source → utmSource, utm_medium → utmMedium, utm_campaign → utmCampaign, utm_term → utmTerm, utm_content → utmContent, gclid → gclid.

## 5) Verificación (hacer 1 vez por landing tras publicar anuncios)
1. Abre la Final URL con params de prueba a mano, ej:
   `https://www.ifixxnc.com/deck-repair-south-charlotte?utm_source=google&utm_medium=cpc&utm_campaign=test&gclid=TEST123`
2. Envía el form con datos de prueba.
3. En GHL, abre el contacto → confirma que en Attribution aparecen utm_* y el gclid `TEST123`.
4. Si NO aparecen → revisar que las env vars `GHL_API_KEY` + `GHL_LOCATION_ID` existan en Vercel prod (si faltan, el lead ni entra: `/api/lead` devuelve 500).

## 6) Conversiones (ya configuradas en el sitio)
- **Lead form submit** → dispara en `/lp/thank-you` al cargar: `AW-17542077404/mVQ-CKbl7PIbENy326xB`.
- **Phone click** → en cualquier `tel:` link: `AW-17542077404/QjnuCMqS4PIbENy326xB`.
Marca ambas como conversiones primarias del campaign en Google Ads.
