# Site Audit + Ads-Readiness — Fences + Decks (2026-07-01)

> Base auditada: `origin/main` (rama de trabajo `fences-decks-2026-07` creada desde ahí). Nota: el worktree venía de una rama vieja de SEO sin 2 de las 4 landings; se corrigió partiendo de main.

> **DECISIONES DE WILL (2026-07-01):**
> - ✅ **Fence: iFIXX instala con crew propio** (confirmado). El copy viejo del sitio ("we can recommend trusted partners") queda anulado; podemos anunciar fence installation + repair.
> - ✅ **Arquitectura: landings separadas** Fence / Deck.
> - ⏸️ **Ejecución EN PAUSA hasta recibir los datos de negocio** (materiales de cerca, pago/depósito, garantía, rango de precio, financiamiento, reviews). No tocar código todavía. Solo quedan los docs de research.

## A) Lo que YA tenemos (verificado en código, no solo en doc)

| Pieza | Estado | Evidencia |
|---|---|---|
| 4 landings South Charlotte vivas | ✅ | `src/pages/{deck-builder,deck-repair,drywall-repair,interior-painting}-south-charlotte.astro` |
| Form compartida con captura de gclid + utm | ✅ | `LandingEstimateForm.astro` lee `URLSearchParams` + `BaseLayout.astro` guarda utm/gclid a sessionStorage |
| API de leads → GHL upsert con attributionSource | ✅ | `src/pages/api/lead.ts` mapea utm_*/gclid a `attributionSource` |
| Tags GHL por servicio incl. `deck-outdoor` (routing de decks) | ✅ | `SERVICE_TAGS`: `deck-repair` y `deck-build` llevan `deck-outdoor` |
| Conversión form-submit (Google Ads) | ✅ | `lp/thank-you.astro` dispara `AW-17542077404/mVQ-CKbl7PIb...` al cargar |
| Conversión phone-click | ✅ | `BaseLayout.astro` + `LandingLayout.astro` en todo `a[href^="tel:"]` → `AW-17542077404/Qjnu...` |
| Doc de tracking (URLs sin barra, suffix por ad group) | ✅ | `docs/landings/google-ads-tracking-setup.md` |
| Reglas de attribution (auto-tagging, suffix) documentadas | ✅ | mismo doc |

**Conclusión:** la infra de tracking/atribución/conversión para DECK ya está lista para ads. Falta el test de humo (1 lead de prueba por landing verificando utm+gclid en GHL) y arreglar posicionamiento/copy.

## B) Lo que FALTA o está mal para correr ads de fences+decks

### Fence = greenfield total
| Falta | Dónde | Acción |
|---|---|---|
| Landing de fence | `src/pages/` | Crear `fence-installation-south-charlotte.astro` |
| `serviceSlug`/`leadType` de fence en la form | `LandingEstimateForm.astro` (union de tipos) | Agregar `'fence-install' \| 'fence-repair'` etc. |
| Tag/pipeline de fence en API | `api/lead.ts` `SERVICE_TAGS` | Agregar entrada(s) fence con tag de routing (ej. `fence-outdoor` o `service-fence`) |
| Fila de fence en tracking doc | `google-ads-tracking-setup.md` | URL final + suffix del ad group fence |
| ✅ Capacidad real de fence | negocio | **RESUELTO: iFIXX instala con crew propio.** Actualizar el copy viejo que deriva (`rock-hill-outdoor-living.md`) cuando se toque. |

### Deck: corregir posicionamiento y copy
| Problema | Dónde | Acción |
|---|---|---|
| CTA "Free Design Consultation" (viola decisión + suena a lujo) | `deck-builder-south-charlotte.astro` (hero CTA + `submitLabel`) | Cambiar a "Request a Free Deck Estimate" |
| Label fijo "What needs repair?" hasta en página de build | `LandingEstimateForm.astro` | Hacer la primera pregunta configurable (build/install vs repair) |
| Guiones largos en copy visible | 4 landings (deck-builder 13, deck-repair 8, drywall 8, interior 12) | Scrub → reescribir frase, no cambiar guion por guion |
| Posicionamiento no-luxury / repair-first no explícito | ambas landings de deck | Aplicar wedge honesto + safety framing + repair-or-replace |
| Foto opcional en la form (diferenciador) | form | Ya existe input de foto ✅ (verificar que aplica a todas) |

### Deuda de reglas duras fuera de las landings (site-wide, prioridad media)
| Violación | Dónde | Nota |
|---|---|---|
| "We handle all permitting" / "We handle all the paperwork" | `content/services/outdoor-living.md` (FAQ), `content/cities/rock-hill.md` | Viola "permits NO son promesa". Reescribir honesto. |
| "permits handled" | `posts/how-much-{bathroom,kitchen}-remodel-charlotte.md` | Blogs de remodel, prioridad baja. |
| "Design Consultation" + framing de lujo (custom decks, pergolas, outdoor kitchens) | `outdoor-living.md`, varios `city-service/*-outdoor-living.md` | Alinear a posicionamiento práctico. |
| "licensed" (self-claim) | No hay en superficies de deck/fence. Los usos son "you'll need a licensed plumber/electrician" (correcto, se refiere a terceros) | Sin acción urgente. |

## C) Plan de ejecución propuesto (por fases, tras OK + datos de negocio)

**Fase 0 — desbloqueo (William/Jaime):** confirmar capacidad de fence + materiales, pago/depósito, garantía, rango de precio, financiamiento, reviews reales. Verificar keywords en Keyword Planner. *(Sin esto no escribo claims nuevos; puedo avanzar lo mecánico que no depende de datos.)*

**Fase 1 — arreglos de deck (no dependen de datos nuevos):**
1. Cambiar CTA deck-builder a "Request a Free Deck Estimate" (hero + submit).
2. Scrub de guiones largos en las 4 landings.
3. Form: primera pregunta configurable build/install-vs-repair (prop nueva, sin romper drywall/painting).
4. build + astro check. → PR (Will mergea).

**Fase 2 — reposicionamiento de copy de deck (necesita datos de negocio):** aplicar wedge honesto, safety framing, materiales composite vs wood, price section, FAQ honesto de permit/HOA (sin prometer). Fotos reales cuando lleguen (nano-banana).

**Fase 3 — infra + landing de fence (necesita confirmación de capacidad):**
1. `SERVICE_TAGS` fence en `api/lead.ts` + union de tipos en la form.
2. Nueva landing `fence-installation-south-charlotte.astro` con la estructura de §7 de la síntesis.
3. Fila de fence en `google-ads-tracking-setup.md`.
4. build + astro check. → PR.

**Fase 4 — estructura de ads (doc, no build):** campañas Fence/Deck, ad groups, negativos, budget scenarios, launch gates. Test de humo de conversiones.

**Regla de proceso:** yo no hago merge (Will da el botón). build + astro check antes de cualquier PR. Rama actual: `fences-decks-2026-07`.
</content>
