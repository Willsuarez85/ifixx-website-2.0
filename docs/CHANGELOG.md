# iFixx Website 2.0 - Changelog

> **Archivo de historial de desarrollo. Para documentación activa ver `CLAUDE.md`**

---

## GTM + GA4 Production Verification (Enero 19, 2026) - COMPLETADO

**Objetivo:** Verificar que el tracking funcione correctamente en producción.

### Problema Detectado
- Formularios mostraban "Server configuration error" al enviar
- Causa: Variables de entorno `GHL_API_KEY` y `GHL_LOCATION_ID` no estaban configuradas en Vercel

### Solución Implementada
- Configuración de variables de entorno en Vercel Dashboard:
  - `GHL_API_KEY` → API Key de la location específica de GHL
  - `GHL_LOCATION_ID` → Location ID de GoHighLevel
- Re-deploy del sitio para aplicar cambios

### Verificación Exitosa
| Componente | Estado |
|------------|--------|
| GTM Container (`GTM-5J8QWJG2`) | ✅ Cargando |
| GA4 Property (`G-KVM73G9H1L`) | ✅ Recibiendo eventos |
| API `/api/lead` | ✅ Enviando a GHL |
| Evento `form_submit` | ✅ Disparando en dataLayer |
| Evento `generate_lead` ($150) | ✅ Configurado en GTM |
| Evento `click_to_call` ($50) | ✅ Automático vía GTM |
| Evento `scroll_depth` | ✅ Automático vía GTM |

### Test Realizado
- Formulario de contacto enviado exitosamente
- Lead de prueba creado en GHL con tags correctos
- Evento capturado en dataLayer:
```javascript
{
  "event": "form_submit",
  "form_id": "contact-form",
  "form_name": "Contact Page Form",
  "form_location": "/contact",
  "lead_type": "contact_request"
}
```

---

## Sprint 6: QA & Launch (Enero 17, 2026) - COMPLETADO

### Completado
- Verificar redirects 301 (13 en vercel.json)
- Validar schemas con Schema.org validator
- Lighthouse audit (Performance 56 dev, SEO 92, A11y 94)
- Sitemap.xml verificado (154 URLs)
- robots.txt con AI bot blocking
- GTM + GA4 tracking verificado en producción ✅

### Pendiente
- Submit sitemap a Google Search Console (post-launch)
- Monitorear 404s (1 semana post-launch)
- Monitorear conversiones en GA4 (7 días post-launch)

---

## Sprint 5: Internal Linking (Enero 16, 2026) - COMPLETADO

**Objetivo:** Estructura de internal links para distribuir autoridad SEO.

### Implementaciones
- Links Pillar → Services en cada pillar page
- Links Services → Pillar (breadcrumb + contextual)
- Links Services → Locations
- Links Locations → Services relevantes
- Cross-links entre Locations cercanas
- Footer: Top 8 services + 8 locations
- Related articles/services en blog posts
- Auditoría orphan pages (ninguna encontrada)

---

## Sprint 4: Segment Pages (Enero 16, 2026) - COMPLETADO

**Objetivo:** Páginas específicas para homeowners (B2C) y property managers (B2B).

### Archivos Creados
- `src/pages/for-homeowners.astro` - Página de conversión B2C
- `src/pages/for-property-managers.astro` - Página SEO B2B
- `src/components/forms/PropertyManagerForm.astro` - Form B2B

### Modificaciones
- `Testimonials.astro` - Prop `segment` + 8 nuevos testimonials
- `Header.astro` - Dropdown "Who We Serve"
- `Footer.astro` - Links a segment pages
- `api/lead.ts` - Tags de segmento para GHL

### GHL Tags
| Segment | Tags |
|---------|------|
| Property Manager | `website-lead`, `segment-property-manager`, `b2b-lead` |
| Homeowner | `website-lead`, `segment-homeowner` |

---

## Sprint 3: Service Pages Restructure (Enero 16, 2026) - COMPLETADO

**Objetivo:** Mover services bajo pillar parents + crear nuevos servicios.

### Nuevos Services (7)
**Remodeling (5):**
- kitchen-remodeling.md
- bathroom-remodeling.md
- basement-finishing.md
- flooring-installation.md
- outdoor-living.md

**Repairs (2):**
- furniture-assembly.md
- tv-mounting.md

### URL Redirects (vercel.json)
| Antes | Después |
|-------|---------|
| `/services/plumbing` | `/repairs/plumbing/` |
| `/services/electrical` | `/repairs/electrical/` |
| `/services/painting` | `/repairs/painting/` |
| `/services/carpentry` | `/repairs/carpentry/` |
| `/services/doors-windows` | `/repairs/doors-windows/` |
| `/services/quick-fix` | `/repairs/quick-fix/` |
| `/services/kitchen-remodeling` | `/remodeling/kitchen-remodeling/` |
| `/services/bathroom-remodeling` | `/remodeling/bathroom-remodeling/` |
| `/services/basement-finishing` | `/remodeling/basement-finishing/` |
| `/services/flooring-installation` | `/remodeling/flooring-installation/` |
| `/services/outdoor-living` | `/remodeling/outdoor-living/` |

---

## Sprint 2: Pillar Pages (Enero 16, 2026) - COMPLETADO

**Objetivo:** Crear páginas hub para autoridad temática.

### Páginas Creadas
| Ruta | Descripción |
|------|-------------|
| `/repairs/` | Pillar de reparaciones (8 servicios) |
| `/remodeling/` | Pillar de remodelación (5 servicios) |
| `/emergency-services/` | Pillar de emergencias 24/7 |

### Archivos
- `src/pages/repairs/index.astro`
- `src/pages/remodeling/index.astro`
- `src/pages/emergency-services/index.astro`
- `src/layouts/PillarLayout.astro`
- `src/components/layout/Header.astro` (dropdown navigation)

---

## Sprint 1: Location Pages (Enero 16, 2026) - COMPLETADO

**Objetivo:** Páginas dedicadas por ciudad/área para SEO local.

### Páginas Creadas (8)
| Ruta | Tipo |
|------|------|
| `/service-areas/charlotte` | City (NC) |
| `/service-areas/ballantyne` | Neighborhood (NC) |
| `/service-areas/matthews` | City (NC) |
| `/service-areas/waxhaw` | City (NC) |
| `/service-areas/mint-hill` | City (NC) |
| `/service-areas/pineville` | City (NC) |
| `/service-areas/monroe` | City (NC) |
| `/service-areas/rock-hill` | City (SC) |

### Archivos
- `src/pages/service-areas/[locationSlug].astro`
- `src/layouts/ServiceAreaLayout.astro`
- `src/content/cities/*.md` (8 archivos)

### Schema Implementado
```typescript
{
  name, state, region: 'NC'|'SC',
  type: 'city'|'neighborhood',
  parentCity?, localizedIntro, description,
  neighborhoods?, highlights?, zipCodes?,
  coordinates: { lat, lng },
  servicesHighlighted?, seo: { title, description }
}
```

---

## Pre-Launch QA (Enero 15, 2026) - COMPLETADO

### SEO Audit
- FAQPage Schema en city+service pages
- Service Schema mejorado (serviceType, offers, telephone)
- Geo props dinámicos en BaseLayout

### Mobile QA
- `.btn-outline-light` clase en global.css
- Touch targets aumentados (`py-4`) en forms

### Copy Review
- `variant="emergency"` → `variant="primary"` corregido
- Typo "call use" → "call us" corregido

---

## Auditoría SEO & Core Web Vitals (Enero 16, 2026) - COMPLETADO

### robots.txt
- AI bot blocking (GPTBot, Claude-Web, etc.)
- Crawl-delay configurado

### JSON-LD Schemas
- Contact: LocalBusiness + ContactPoint
- About: Organization
- Blog: BlogPosting mejorado

### Meta Tags
- Open Graph completo
- Twitter Cards completo
- Geo meta tags dinámicos

### Image Optimization
- width/height explícitos
- fetchpriority="high" en hero
- decoding="async"
- Alt text con keywords locales

---

## Métricas Finales

| Métrica | Inicial | Final |
|---------|---------|-------|
| Páginas | ~20 | 154 |
| Location pages | 1 | 8 |
| Pillar pages | 0 | 3 |
| Service pages | 6 | 13 |
| Segment pages | 0 | 2 |
| City+Service combos | 36 | 104 |
| Internal links/page | ~3 | ~10 |
