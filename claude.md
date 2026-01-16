# iFixx Website 2.0 - Development Documentation

> **Version:** v1.4
> **Last Updated:** January 15, 2026
> **Framework:** Astro + Tailwind CSS
> **Primary Market:** Charlotte, NC
> **Goal:** Lead Generation (Calls + Webhook Forms)

---

## 📋 Project Overview

This is the official development documentation for **iFixx Remodeling & Handyman Services** website. The project follows a **SEO-first, conversion-focused** approach with emphasis on:

- ⚡ **Speed over effects** - Minimal JavaScript
- 🎯 **Conversion over decoration** - Clear CTAs
- 📱 **Mobile-first layouts** - Responsive design
- 🔍 **SEO structure** - Optimized for local search

---

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Astro |
| Styling | Tailwind CSS |
| Interactivity | Astro Islands (React when needed) |
| Content | Astro Content Collections (MD/MDX) |
| SEO | Astro Sitemap + JSON-LD schemas |
| Fonts | Montserrat (headings), Inter (body) |

### Performance Targets
- **Mobile Lighthouse:** ≥ 85
- **Desktop Lighthouse:** ≥ 90
- **Images:** WebP/AVIF with explicit dimensions

---

## 🏗️ Project Structure

```
ifixx-website/
├── src/
│   ├── components/
│   │   ├── common/          # Buttons, Icons, Cards
│   │   ├── layout/          # Header, Footer, Nav
│   │   ├── sections/        # Hero, Services, Testimonials
│   │   └── forms/           # ContactForm, QuickEstimate
│   ├── content/
│   │   ├── services/        # Service MDX files
│   │   ├── cities/          # City MDX files
│   │   └── posts/           # Blog posts
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── ServiceLayout.astro
│   │   └── BlogLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── contact.astro
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── services/
│   │   │   └── [serviceSlug].astro
│   │   ├── api/
│   │   │   └── lead.ts      # GHL Integration Endpoint
│   │   └── [citySlug]/
│   │       └── [serviceSlug].astro
│   └── styles/
│       └── global.css
├── public/
│   ├── images/
│   └── favicon.ico
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

---

## 📄 Phase 1 Pages (MVP)

### 1. Homepage `/`
- Hero with brand messaging
- 6 service categories
- Emergency callout band
- 3-step process
- Why Choose iFixx
- Featured work (6 images)
- Testimonials (3-4)
- Final CTA

### 2. Service Template `/services/[serviceSlug]`
- Dynamic service pages
- Signs you need this service
- 3-step process
- FAQs
- Related services

### 3. Service + City Template `/{citySlug}/{serviceSlug}`
- Localized intros
- Neighborhood references
- City-specific FAQs

### 4. Blog Index `/blog`
- Featured post
- Latest posts grid
- Category navigation

### 5. Blog Post Template `/blog/[postSlug]`
- Cover image
- Readable typography
- Inline & final CTAs

### 6. Contact `/contact`
- Contact form
- Phone number
- Service area map

---

## 📊 Content Collections Schema

### Services
```yaml
slug: string
title: string
category: emergency | handyman | remodeling
summary: string
heroImage: string
bullets: string[]
signs: string[]
processSteps: { title, description }[]
faqs: { q, a }[]
relatedServices: string[]
seo: { title, description }
```

### Cities
```yaml
slug: string
name: string
state: string
localizedIntro: string
neighborhoods: string[]
seo: { title, description }
```

### Posts
```yaml
slug: string
title: string
date: date
excerpt: string
coverImage: string
category: string
tags: string[]
seo: { title, description }
body: markdown
```

---

## 🎨 Design System

### Colors (Conceptual)
- **Primary:** Main CTAs only
- **Secondary:** Accents, icons, section highlights
- **Neutral:** Whites & grays for structure
- **Emergency Red:** ONLY in emergency contexts

### Typography
- **Headings:** Montserrat (bold, clear)
- **Body:** Inter (readable, neutral)

### DO NOT
- ❌ Heavy animations
- ❌ Parallax effects
- ❌ Decorative UI elements
- ❌ Dark-mode-first layouts

---

## 📞 CTA System

| Type | Label | Usage |
|------|-------|-------|
| Primary | Request Free Estimate | Main conversion |
| Secondary | Call Now | Quick contact |
| Emergency | Get Emergency Help (24/7) | Emergency pages ONLY |

### Rules
- One main CTA per section
- Emergency CTAs only in emergency contexts
- Mobile-friendly tap targets

---

## 📝 Forms & Webhooks

All forms POST to: `/api/lead`

### Form Types
1. **Quick Estimate** - Name, Phone, Service
2. **Detailed Project** - Full project details
3. **Contact** - General inquiries

### Webhook Requirements (GHL Integration)
- **Endpoint**: `POST /api/lead`
- **Actions**:
    1. Upsert Contact to GHL
    2. Add Service Tag
    3. Create Opportunity in Pipeline
- **Security**: Server-side validation, Environment variables for tokens.

---

## 📈 Analytics Events

Track these events:
- `generate_lead`
- `phone_click`
- `form_submit`
- `view_service`
- `view_service_city`
- `view_blog_post`

---

## ✅ Development Phases & Status

### Phase 1: Foundation (Completed)
- [x] Context analysis & requirements review
- [x] Astro project initialization
- [x] Tailwind CSS v4 configuration
- [x] Content Collections configuration
    - [x] Services Schema & Content
    - [ ] Cities Schema (Pending)
    - [x] Blog Schema & Content
- [x] Project directory structure setup

### Phase 2: Core Pages (Mostly Complete)
- [x] **Homepage Components**:
    - [x] Hero Section
    - [x] Services Grid (rediseñado con imágenes)
    - [x] Emergency Band
    - [x] Why Choose Us
    - [x] Featured Work
    - [x] Testimonials
    - [x] CTA Section
    - [x] TrustBar (nuevo)
    - [x] ProcessSteps (rediseñado con imagen)
    - [x] CTAIntermediate (nuevo)
- [x] **Homepage Assembly** (`src/pages/index.astro`) - *Completo con nuevo diseño*
- [x] **Service Index** (`/services`) - *Rediseñado con hero visual y cards*
- [x] **Service Template** (`/services/[serviceSlug]`) - *Rediseñado para alta conversión*
- [ ] **Service + City Template** (`/{citySlug}/{serviceSlug}`) - *Pendiente*
- [x] **Contact Page** - *Form connected to API*

### Phase 3: Blog (Complete)
- [x] Blog index layout
- [x] Blog post template
- [ ] Category filtering logic (opcional)

### Phase 4: Integration (Backend) - **COMPLETE**
- [x] **GHL Integration Endpoint (`src/pages/api/lead.ts`)**
    - [x] Setup Environment Variables (`.env`)
    - [x] Implement `POST` handler
    - [x] GHL Contact Upsert Logic
    - [x] GHL Opportunity Logic (Pipeline routing)
- [x] **Form Implementation**
    - [x] Connect Contact Form to `/api/lead`
    - [x] QuickEstimateCompact form (nuevo)
    - [x] Client-side validation
    - [x] Success/Error UI states

### Phase 5: Optimization & Polish - **IN PROGRESS**
- [x] SEO Meta Tags & JSON-LD Schemas (Service, Breadcrumb, FAQ, LocalBusiness)
- [ ] Asset optimization (Images) - *Varias imágenes faltantes*
- [ ] Performance Audit (Lighthouse)
- [ ] Mobile responsiveness final QA

---

## 🚀 Quick Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📍 Service Areas

**Approved Cities:**
- Charlotte, NC
- Matthews, NC
- Waxhaw, NC
- Rock Hill, SC
- Pineville, NC
- Monroe, NC

**Highlighted Neighborhoods:**
- South Charlotte
- Dilworth
- Myers Park
- Plaza Midwood
- NoDa
- Ballantyne

---

## 🔒 Important Rules

1. **24/7 Messaging** - ONLY on emergency pages
2. **No over-design** - Clarity over creativity
3. **No invented content** - Only specified services/cities
4. **Minimal JS** - Performance first
5. **Schema required** - Every page needs JSON-LD

---

## 🤖 Claude Code Agents

Este proyecto utiliza agentes especializados de Claude Code para diferentes dominios de trabajo. Cada agente tiene un enfoque específico y debe ser invocado según el tipo de tarea.

### 1. ifixx-orchestrator-pm
**Rol:** Project Manager / Orquestador

**Cuándo usarlo:**
- Planificación de nuevas páginas, templates o features
- Cuando no sabes por dónde empezar o necesitas dirección
- Coordinar tareas que cruzan múltiples dominios (contenido, estilos, SEO, forms)
- Preguntas como "¿Qué debo hacer ahora?" o "¿Cómo abordo esto?"

**Ejemplos de invocación:**
- "Quiero construir la página de servicio template"
- "¿Qué debo trabajar siguiente para el sitio?"
- "¿Cuánto trabajo queda para Phase 1?"

---

### 2. astro-frontend-builder
**Rol:** Especialista en Frontend / UI Components

**Cuándo usarlo:**
- Crear o modificar componentes de UI (Hero, Services grid, CTAs, Testimonials)
- Crear o actualizar componentes Astro
- Establecer layouts (BaseLayout, ServiceLayout, BlogLayout)
- Refactorizar componentes para mejor reusabilidad
- Implementar diseños mobile-first responsivos

**Ejemplos de invocación:**
- "Crea una sección de testimonios con 3 reviews"
- "El services grid está muy grande, divídelo en componentes más pequeños"
- "Necesito un layout para los blog posts"
- "El hero section no se ve bien en móvil"

---

### 3. forms-webhook-engineer
**Rol:** Especialista en Formularios y Backend

**Cuándo usarlo:**
- Crear o modificar formularios de captura de leads (ContactForm, QuickEstimate)
- Conectar formularios al endpoint `/api/lead`
- Configurar payloads para GoHighLevel webhooks
- Implementar validación de formularios
- Agregar estados de éxito/error
- Debuggear problemas de envío de formularios

**Ejemplos de invocación:**
- "Crea un formulario de estimado rápido con nombre, teléfono y servicio"
- "Conecta el contact form al webhook de GHL"
- "El contact form no está enviando leads a GoHighLevel"

---

### 4. local-seo-schema-specialist
**Rol:** Especialista en SEO Local y Schemas

**Cuándo usarlo:**
- Optimizar páginas para búsqueda local
- Implementar JSON-LD schemas
- Revisar estructura SEO antes de publicar
- Asegurar patrones SEO consistentes en templates de servicios y ciudades
- Crear meta titles, descriptions, jerarquía de headings
- Estrategias de internal linking para el mercado de Charlotte, NC

**Ejemplos de invocación:**
- "Acabo de terminar la página de bathroom-remodeling"
- "Crea la página de Matthews NC kitchen remodeling"
- "¿Puedes revisar si la página de handyman services está lista para launch?"
- "Agrega structured data a la página de contacto"

---

### 5. qa-consistency-reviewer
**Rol:** Control de Calidad y Consistencia

**Cuándo usarlo:**
- Validar calidad de código y consistencia estructural
- Antes de mergear o finalizar una nueva página o componente
- Después de construir un nuevo template, sección o layout
- Cuando el código funciona pero parece desordenado o inconsistente
- Después de refactorizaciones significativas
- Validar cambios contra los estándares de CLAUDE.md

**Ejemplos de invocación:**
- "Completé el service template en /services/[serviceSlug].astro"
- "Moví los form components a un nuevo directorio /forms"
- "¿Puedes revisar si la página de Matthews está lista para producción?"

---

### 6. marketing-messaging-reviewer
**Rol:** Revisor de Copy y Mensajería

**Cuándo usarlo:**
- Auditar o revisar copy de marketing ya implementado
- Revisar hero sections, copy de páginas de servicio, CTAs
- Verificar consistencia de voz a través de páginas
- Asegurar que el messaging coincide con la intención de conversión

**NO usar para:**
- Crear nueva estrategia de marketing
- Diseñar funnels
- Escribir contenido desde cero

**Ejemplos de invocación:**
- "Revisa el hero section copy en el homepage"
- "Verifica si las páginas de emergency services tienen messaging consistente"
- "¿Es efectivo el CTA en la página de kitchen remodeling?"
- "El copy de la página de contacto se siente débil, revísalo"

---

## 🔄 Workflow de Agentes

### Principios de Routing

**Regla #1: Un agente por dominio**
No mezcles responsabilidades. Si necesitas frontend Y SEO, usa dos agentes secuencialmente.

**Regla #2: Planificar antes de construir**
Siempre inicia con `ifixx-orchestrator-pm` para tareas complejas o multi-paso.

**Regla #3: Revisar antes de mergear**
Después de construir, usa los agentes de revisión (`qa-consistency-reviewer`, `marketing-messaging-reviewer`).

**Regla #4: No loops infinitos**
Si un agente sugiere cambios, impleméntalos y avanza. No re-revises eternamente.

---

### Flujo de Trabajo por Fase

```
┌─────────────────────────────────────────────────────────────────┐
│                         FASE 1: PLANIFICACIÓN                   │
├─────────────────────────────────────────────────────────────────┤
│  "¿Qué voy a hacer?"                                            │
│                                                                 │
│  → ifixx-orchestrator-pm                                        │
│    • Define el scope                                            │
│    • Rompe en tareas                                            │
│    • Identifica archivos afectados                              │
│    • Recomienda orden de ejecución                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       FASE 2: CONSTRUCCIÓN                      │
├─────────────────────────────────────────────────────────────────┤
│  "Estoy implementando"                                          │
│                                                                 │
│  → astro-frontend-builder (UI)                                  │
│    • Componentes Astro                                          │
│    • Layouts                                                    │
│    • Estilos Tailwind                                           │
│    • Responsividad                                              │
│                                                                 │
│  → forms-webhook-engineer (Backend)                             │
│    • Formularios                                                │
│    • API endpoints                                              │
│    • Webhooks GHL                                               │
│    • Validaciones                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      FASE 3: OPTIMIZACIÓN                       │
├─────────────────────────────────────────────────────────────────┤
│  "Ya funciona, ahora optimizo"                                  │
│                                                                 │
│  → local-seo-schema-specialist                                  │
│    • Meta tags                                                  │
│    • JSON-LD schemas                                            │
│    • Heading hierarchy                                          │
│    • Internal linking                                           │
│    • Local keywords                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        FASE 4: REVISIÓN                         │
├─────────────────────────────────────────────────────────────────┤
│  "¿Está listo para producción?"                                 │
│                                                                 │
│  → qa-consistency-reviewer                                      │
│    • Consistencia de código                                     │
│    • Estructura de archivos                                     │
│    • Adherencia a CLAUDE.md                                     │
│    • Errores o warnings                                         │
│                                                                 │
│  → marketing-messaging-reviewer                                 │
│    • Claridad del copy                                          │
│    • CTAs efectivos                                             │
│    • Voz consistente                                            │
│    • Intent de conversión                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                        ✅ DEPLOY
```

---

### Workflows por Tipo de Tarea

#### Nueva Página de Servicio
```
1. ifixx-orchestrator-pm   → "Quiero crear la página de kitchen-remodeling"
2. astro-frontend-builder  → Construye el componente/página
3. local-seo-schema-specialist → Optimiza SEO y schemas
4. qa-consistency-reviewer → Valida código
5. marketing-messaging-reviewer → Revisa copy
```

#### Nuevo Formulario
```
1. ifixx-orchestrator-pm   → "Necesito un formulario de estimado rápido"
2. forms-webhook-engineer  → Construye form + conecta API
3. qa-consistency-reviewer → Valida implementación
```

#### Página de Ciudad + Servicio
```
1. ifixx-orchestrator-pm   → "Crear Matthews NC + kitchen remodeling"
2. astro-frontend-builder  → Estructura de página
3. local-seo-schema-specialist → SEO local (crítico para esta tarea)
4. qa-consistency-reviewer → Valida
```

#### Auditoría Pre-Launch
```
1. qa-consistency-reviewer → Revisa todo el código
2. local-seo-schema-specialist → Audita SEO de todas las páginas
3. marketing-messaging-reviewer → Revisa messaging global
```

#### Bug Fix o Problema Técnico
```
→ Directo al agente del dominio afectado:
  • UI rota → astro-frontend-builder
  • Form no envía → forms-webhook-engineer
  • SEO incorrecto → local-seo-schema-specialist
```

---

### Reglas de Comportamiento

| Situación | Acción | Agente |
|-----------|--------|--------|
| No sé por dónde empezar | Planificar primero | `ifixx-orchestrator-pm` |
| Tarea simple y clara | Ir directo | Agente del dominio |
| Tarea multi-dominio | Secuencia de agentes | PM → Build → SEO → QA |
| Algo no funciona | Debug | Agente del dominio |
| Antes de mergear | Revisar | `qa-consistency-reviewer` |
| Copy se siente mal | Auditar | `marketing-messaging-reviewer` |

---

### Invocación de Agentes

Los agentes se invocan automáticamente cuando describes una tarea que coincide con su dominio. También puedes invocarlos explícitamente:

**Implícito (recomendado):**
- "Quiero crear la sección de testimonios" → `astro-frontend-builder`
- "Revisa si el homepage está listo" → `qa-consistency-reviewer`

**Explícito:**
- "Usa el agente de frontend para crear..."
- "Necesito que el SEO specialist revise..."

---

### Anti-Patrones (Evitar)

❌ **Loop de revisiones infinitas**
No re-revises el mismo copy 5 veces buscando "perfección".

❌ **Mezclar dominios en una sola tarea**
"Crea un form con SEO optimizado y revisa el copy" → Dividir en tareas separadas.

❌ **Saltar la planificación**
Para tareas complejas, siempre usa el orchestrator primero.

❌ **Usar marketing-reviewer para crear estrategia**
Solo audita y alinea. No inventa estrategia.

❌ **Ignorar QA antes de deploy**
Siempre valida con `qa-consistency-reviewer` antes de mergear.

---

## 📋 TODO - Pendientes

> **Última actualización:** January 15, 2026

---

### ✅ Pre-Launch Tasks - COMPLETADO (Enero 15, 2026)

#### Task 1: SEO Audit - Template Ciudad+Servicio
**Agente:** `local-seo-schema-specialist`

| Archivo | Cambio |
|---------|--------|
| `[citySlug]/[serviceSlug].astro` | ✅ FAQPage Schema agregado para rich snippets |
| `[citySlug]/[serviceSlug].astro` | ✅ Service Schema mejorado (serviceType, offers, telephone) |
| `[citySlug]/[serviceSlug].astro` | ✅ Breadcrumb URL corregido (`/service-areas/`) |
| `[citySlug]/[serviceSlug].astro` | ✅ Geo props dinámicos pasados a BaseLayout |
| `BaseLayout.astro` | ✅ Props geoRegion/geoPlacename agregados (dinámicos por ciudad) |

#### Task 2: Mobile QA Completo
**Agente:** `qa-consistency-reviewer`

| Archivo | Cambio |
|---------|--------|
| `global.css` | ✅ `.btn-outline-light` clase agregada |
| `QuickEstimateCompact.astro` | ✅ Touch targets aumentados (`py-3` → `py-4`) |
| `contact.astro` | ✅ Touch targets aumentados (`py-3` → `py-4`) |

**Verificaciones pasadas:**
- ✅ Sin overflow horizontal a 320px
- ✅ Grids colapsan correctamente a 1 columna
- ✅ Touch targets ≥ 44px en todos los forms
- ✅ CTAs stackean verticalmente en mobile

#### Task 3: Marketing Copy Review
**Agente:** `marketing-messaging-reviewer`

| Archivo | Cambio |
|---------|--------|
| `index.astro` | ✅ `variant="emergency"` → `variant="primary"` (línea 107) |
| `services/index.astro` | ✅ `btn-emergency` → `btn-primary` (línea 87) |
| `contact.astro` | ✅ Typo corregido: "call use" → "call us" (línea 529) |

**Brand Voice Assessment:** PASS
- Voz consistente: profesional + cálida + local
- CTAs consistentes en todo el sitio
- Emergency styling correctamente limitado a contextos de emergencia

---

### 🖼️ Imágenes - ✅ RESUELTO

Todas las referencias de imágenes han sido actualizadas para usar el portfolio disponible en `/public/images/projects/`:

| Archivo | Cambio |
|---------|--------|
| `[serviceSlug].astro` | Mappings actualizados a imágenes de portfolio Ifixx |
| `services/index.astro` | Mappings actualizados a imágenes de portfolio Ifixx |
| `gallery/index.astro` | Rutas corregidas de `/portfolio/` a `/projects/` |
| `doors-windows.md` | heroImage actualizado a `Ifixx-portfolio55.webp` |

**Imágenes de portfolio disponibles:** 65+ imágenes (`Ifixx-portfolio1.webp` - `Ifixx-portfolio65.webp`)

---

### 📄 Páginas Pendientes

#### Phase 2: Core Pages
- [x] **Service + City Template** (`/{citySlug}/{serviceSlug}`) - ✅ COMPLETADO con FAQPage schema
- [x] **Cities Content Collection** - ✅ 6 ciudades configuradas (Charlotte, Matthews, Monroe, Pineville, Rock Hill, Waxhaw)

#### Phase 3: Blog (Parcialmente completo)
- [x] Blog index layout
- [x] Blog post template
- [ ] Category filtering logic (opcional)
- [ ] Más posts de contenido

---

### 🔧 Mejoras Técnicas

#### SEO & Schemas - ✅ COMPLETADO (Enero 16, 2026)
- [x] robots.txt mejorado con AI bot blocking y crawl-delay
- [x] Sitemap.xml generando correctamente con @astrojs/sitemap
- [x] JSON-LD schemas en Contact page (LocalBusiness + ContactPoint)
- [x] JSON-LD schemas en About page (Organization)
- [x] BlogPosting schema mejorado (image, dateModified, mainEntityOfPage)
- [x] Open Graph meta tags completos (og:locale, og:image dimensions)
- [x] Twitter Cards meta tags completos
- [x] Font preload implementado para Montserrat e Inter
- [x] DNS prefetch para Google Fonts

#### Core Web Vitals - ✅ COMPLETADO (Enero 16, 2026)
- [x] Dimensiones explícitas (width/height) en todas las imágenes principales
- [x] fetchpriority="high" en imágenes hero/LCP
- [x] decoding="async" en todas las imágenes
- [x] Lazy loading verificado (above-fold: eager, below-fold: lazy)
- [x] Alt text descriptivo con keywords locales en todas las imágenes

**Archivos actualizados:**
- `Hero.astro`, `ServicesGrid.astro`, `FeaturedWork.astro`
- `ProcessSteps.astro`, `ScrollGallery.astro`
- `services/index.astro`, `services/[serviceSlug].astro`
- `gallery/index.astro`, `contact.astro`, `about.astro`
- `blog/[slug].astro`, `BaseLayout.astro`, `robots.txt`

#### Performance - En Progreso
- [ ] Lighthouse audit completo (target: Mobile ≥85, Desktop ≥90) - **Servidor listo en localhost:4322**
- [ ] Crear OG image dedicada 1200x630

#### Mobile - ✅ COMPLETADO (Enero 15, 2026)
- [x] QA completo de responsividad en todas las páginas
- [x] Verificar tap targets en móvil (mínimo 44x44px) - Forms actualizados a `py-4`
- [ ] Test en dispositivos reales (iPhone, Android) - Pendiente validación manual

---

### 🎨 Componentes Creados (Sesión Actual)

| Componente | Ruta | Estado |
|------------|------|--------|
| TrustBar | `src/components/sections/TrustBar.astro` | ✅ Completo |
| BenefitIcons | `src/components/sections/BenefitIcons.astro` | ✅ Completo |
| CTAIntermediate | `src/components/sections/CTAIntermediate.astro` | ✅ Completo |
| QuickEstimateCompact | `src/components/forms/QuickEstimateCompact.astro` | ✅ Completo |

---

### ✅ Completado (Sesión Actual)

- [x] Fix global.css - eliminar color hardcoded de headings (causaba texto negro)
- [x] Cambiar "Licensed" a "Local" en Hero.astro
- [x] Corregir rutas de imágenes en ScrollGallery.astro
- [x] Rediseñar ServicesGrid.astro con imágenes de fondo
- [x] Rediseñar ProcessSteps.astro con imagen lateral
- [x] Agregar TrustBar y CTAIntermediate al homepage
- [x] Rediseñar services/index.astro (hero visual, TrustBar, cards con imágenes)
- [x] Rediseñar [serviceSlug].astro para alta conversión:
  - Form above the fold
  - Benefit icons en hero
  - TrustBar
  - Imagen de proyecto lateral
  - CTA intermedio
  - FAQ schema para SEO

### ✅ Auditoría SEO & Core Web Vitals (Enero 16, 2026)

- [x] **robots.txt** - Mejorado con AI bot blocking (GPTBot, Claude-Web, etc.)
- [x] **sitemap.xml** - Verificado, genera 54 URLs correctamente
- [x] **JSON-LD Schemas**:
  - Contact page: LocalBusiness + ContactPoint + Breadcrumb
  - About page: Organization + Breadcrumb
  - Blog posts: BlogPosting mejorado con image, dateModified
- [x] **Meta Tags**:
  - Open Graph completo (og:locale, og:site_name, og:image dimensions)
  - Twitter Cards completo (twitter:site, twitter:image:alt)
  - Geo meta tags (geo.region, geo.placename)
- [x] **Font Performance**:
  - DNS prefetch para fonts.googleapis.com
  - Preconnect para Google Fonts
  - Preload del stylesheet de fuentes
- [x] **Image Optimization**:
  - width/height explícitos en todas las imágenes
  - fetchpriority="high" en hero/LCP images
  - decoding="async" para non-blocking decode
  - Alt text descriptivo con keywords locales
  - Lazy loading correcto (eager above-fold, lazy below-fold)

---

### 🔴 Pendiente - Pre-Launch Final

| Item | Prioridad | Estado |
|------|-----------|--------|
| **OG Image dedicada** | Alta | Pendiente - Crear imagen 1200x630 para social sharing |
| **Lighthouse Audit** | Alta | En progreso - Servidor corriendo en `localhost:4322` |
| **Test dispositivos reales** | Media | Pendiente - iPhone SE (320px), iPhone 12 (375px) |
| **hreflang** | Baja | No necesario (sitio single-language) |

---

### 🚀 Próximos Pasos Recomendados

1. ~~**Crear template de ciudad + servicio**~~ ✅ COMPLETADO
2. ~~**QA mobile completo**~~ ✅ COMPLETADO
3. ~~**Revisar copy con marketing-messaging-reviewer**~~ ✅ COMPLETADO
4. **Ejecutar Lighthouse audit** en `http://localhost:4322` (targets: Mobile ≥85, Desktop ≥90)
5. **Crear OG image dedicada** (1200x630, <300KB) para mejor social sharing
6. **Test en dispositivos reales** antes de deploy final
7. **Submit sitemap** a Google Search Console post-launch

---

### 📊 Estado de SEO por Página

| Página | Meta | OG | Schema | CWV | Geo Tags |
|--------|------|-----|--------|-----|----------|
| Homepage `/` | ✅ | ✅ | ✅ LocalBusiness | ✅ | ✅ Default |
| About `/about` | ✅ | ✅ | ✅ Organization | ✅ | ✅ Default |
| Contact `/contact` | ✅ | ✅ | ✅ LocalBusiness+ContactPoint | ✅ | ✅ Default |
| Services `/services` | ✅ | ✅ | ✅ ItemList | ✅ | ✅ Default |
| Service `[serviceSlug]` | ✅ | ✅ | ✅ Service+FAQ+Breadcrumb | ✅ | ✅ Default |
| City+Service `[city]/[service]` | ✅ | ✅ | ✅ Service+**FAQPage**+Breadcrumb | ✅ | ✅ **Dinámico** |
| Blog `/blog` | ✅ | ✅ | ⚠️ Falta ItemList | ✅ | ✅ Default |
| Blog Post `[slug]` | ✅ | ✅ | ✅ BlogPosting+Breadcrumb | ✅ | ✅ Default |
| Gallery `/gallery` | ✅ | ✅ | ✅ Breadcrumb | ✅ | ✅ Default |

**Nota:** City+Service pages ahora tienen geo tags dinámicos (US-NC/US-SC según ciudad) y FAQPage schema para rich snippets.

---

## 📚 Reference

- **Context Document:** `Context.md`
- **Design Assets:** `/public/images/`
- **Content:** `/src/content/`
