# iFixx Website 2.0 - Development Documentation

> **Version:** v2.0 | **Updated:** January 17, 2026 | **Status:** Ready for Launch
> **Framework:** Astro + Tailwind CSS | **Market:** Charlotte, NC
> **Goal:** Lead Generation (Calls + Webhook Forms)
> **Changelog:** `docs/CHANGELOG.md`

---

## Project Overview

SEO-first, conversion-focused website for **iFixx Remodeling & Handyman Services**.

**Principles:**
- Speed over effects (minimal JS)
- Conversion over decoration (clear CTAs)
- Mobile-first layouts
- SEO structure (JSON-LD on every page)

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Astro |
| Styling | Tailwind CSS |
| Content | Astro Content Collections (MD/MDX) |
| SEO | Astro Sitemap + JSON-LD |
| Fonts | Montserrat (headings), Inter (body) |

**Performance Targets:** Mobile ≥85, Desktop ≥90 (Lighthouse)

---

## Project Structure

```
src/
├── components/
│   ├── common/          # Buttons, Icons, Cards
│   ├── layout/          # Header, Footer, Nav
│   ├── sections/        # Hero, Services, Testimonials
│   └── forms/           # ContactForm, QuickEstimate, PropertyManagerForm
├── content/
│   ├── services/        # 13 services (pillar field: repairs|remodeling)
│   ├── cities/          # 8 locations
│   └── posts/           # Blog posts
├── layouts/
│   ├── BaseLayout.astro
│   ├── PillarLayout.astro
│   ├── ServiceLayout.astro
│   ├── ServiceAreaLayout.astro
│   └── BlogLayout.astro
├── pages/
│   ├── repairs/              # Pillar + [serviceSlug]
│   ├── remodeling/           # Pillar + [serviceSlug]
│   ├── emergency-services/   # Pillar
│   ├── service-areas/        # Index + [locationSlug]
│   ├── blog/                 # Index + [slug]
│   ├── for-homeowners.astro
│   ├── for-property-managers.astro
│   ├── api/lead.ts
│   └── [citySlug]/[serviceSlug].astro
└── styles/global.css
```

---

## Content Collections

### Services Schema
```yaml
title, summary, pillar: repairs|remodeling
heroImage, bullets[], signs[]
processSteps: [{ title, description }]
faqs: [{ q, a }]
relatedServices[]
seo: { title, description }
```

### Cities Schema
```yaml
name, state, region: NC|SC
type: city|neighborhood
localizedIntro, description
neighborhoods[], highlights[], zipCodes[]
coordinates: { lat, lng }
seo: { title, description }
```

---

## Design System

**Colors:** Primary (CTAs), Secondary (accents), Neutral (structure), Emergency Red (emergency pages ONLY)

**Typography:** Montserrat (headings), Inter (body)

**Avoid:** Heavy animations, parallax, decorative elements, dark-mode-first

---

## CTA System

| Type | Label | Usage |
|------|-------|-------|
| Primary | Request Free Estimate | Main conversion |
| Secondary | Call Now | Quick contact |
| Emergency | Get Emergency Help (24/7) | Emergency pages ONLY |

---

## Forms & Webhooks

**Endpoint:** `POST /api/lead`

**Form Types:**
1. QuickEstimate - Name, Phone, Service
2. ContactForm - General inquiries
3. PropertyManagerForm - B2B with company fields

**GHL Integration:** Upsert contact, add service tag, create opportunity

---

## Quick Commands

```bash
npm install    # Install dependencies
npm run dev    # Start dev server
npm run build  # Build for production
```

---

## Service Areas

**Cities:** Charlotte, Matthews, Waxhaw, Rock Hill (SC), Pineville, Monroe, Mint Hill, Ballantyne

---

## Important Rules

1. **24/7 Messaging** - ONLY on emergency pages
2. **No over-design** - Clarity over creativity
3. **No invented content** - Only specified services/cities
4. **Minimal JS** - Performance first
5. **Schema required** - Every page needs JSON-LD

---

## Claude Code Agents

| Agent | Use For |
|-------|---------|
| `ifixx-orchestrator-pm` | Planning, coordination, "what should I do next?" |
| `astro-frontend-builder` | UI components, layouts, Tailwind, responsiveness |
| `forms-webhook-engineer` | Forms, API endpoints, GHL webhooks |
| `local-seo-schema-specialist` | SEO, JSON-LD, meta tags, internal linking |
| `qa-consistency-reviewer` | Code quality, pre-merge validation |
| `marketing-messaging-reviewer` | Copy audit, CTA effectiveness, voice consistency |

**Workflow:** Plan (PM) → Build (Frontend/Forms) → Optimize (SEO) → Review (QA/Marketing) → Deploy

---

## Current Status

**Architecture Migration: COMPLETE**
- 3 Pillar pages (repairs, remodeling, emergency)
- 13 Service pages under pillars
- 8 Location pages
- 2 Segment pages (homeowners, property managers)
- 104 City+Service combo pages
- 154 total URLs in sitemap

**SEO: COMPLETE**
- JSON-LD on all pages
- Geo meta tags (dynamic by city)
- Internal linking structure
- 301 redirects configured

---

## Pending (Pre-Launch)

| Task | Priority |
|------|----------|
| Test on real devices (iPhone, Android) | Medium |
| Submit sitemap to GSC | Post-launch |
| Monitor 404s (1 week) | Post-launch |

---

## Reference

- **Changelog:** `docs/CHANGELOG.md`
- **SEO Strategy:** `notes/Local SEO Content and Architecture Strategy for IFIXX.md`
- **Positioning:** `notes/positioning-messaging-strategy-v2-english copy.md`
