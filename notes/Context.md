# IFIXX_WEBSITE_CONTEXT.md
# iFixx Remodeling & Handyman Services — Complete Website Development Context

Version: v1.4  
Date: January 2026  
Prepared by: Simplicity Agency  
Primary Market: Charlotte, NC  
Primary Goal: Lead Generation (Calls + Webhook-Based Forms)

---

## 0) PURPOSE OF THIS DOCUMENT

This file is the **single, authoritative context** for building the iFixx website.

You are an AI coding agent (Claude Code).
Your responsibility is to build a **fast, SEO-first, conversion-focused website** using **Astro**.

### Core principles (non-negotiable)
- Clarity over creativity
- Speed over effects
- SEO structure over visual noise
- Conversion over decoration
- Scalable architecture (future-proof)

DO NOT:
- Over-design
- Add features not specified
- Invent pages, services, or cities
- Ship unnecessary JavaScript

---

## 1) BRAND POSITIONING & MESSAGING

### Top-of-Site Positioning (Homepage Hero)
- Badge: 🏆 **5 Years Transforming Homes**
- Headline (H1): **Your Trusted Handyman Team**
- Subheadline: **Emergency Services • Handyman Services • Bathrooms & Kitchen Makeovers • Everyday Repairs**
- Trust Line: **Family-owned contractors serving Charlotte, NC with expert craftsmanship and trusted service.**

### Brand Promise
Fast, reliable home repairs and remodeling — done right, with clear communication and craftsmanship you can trust.

### Brand Personality
- Trustworthy
- Local
- Calm
- Professional
- Family-owned
- No hype, no corporate fluff

### Service Priority Order (for IA, linking & CTAs)
1. Handyman Services (core, recurring demand)
2. Emergency Services (high-intent conversion)
3. Bathrooms & Kitchen Makeovers (higher-ticket)

### 24/7 USAGE RULE (IMPORTANT)
- “24/7” language is ONLY allowed on:
  - Emergency Services Hub
  - Emergency service pages
  - Emergency CTAs
- The brand is NOT positioned as emergency-only.
- Elsewhere use: “Fast response for urgent issues”.

---

## 2) SITE ARCHITECTURE (FULL MAP)

### Homepage
- `/`

---

### Emergency Services Hub
- `/emergency-services`

Subpages:
- `/emergency-services/burst-pipes`
- `/emergency-services/water-heater-failure`
- `/emergency-services/electrical-outages`
- `/emergency-services/flooding`
- `/emergency-services/broken-doors-windows`
- `/emergency-services/roof-leaks`
- + 11 additional emergency-specific services (future)

Purpose:
- Capture urgent, high-intent traffic
- Emergency CTAs allowed
- 24/7 messaging allowed

---

### Handyman Services Hub
- `/handyman-services`

Subpages:
- `/handyman-services/painting`
- `/handyman-services/drywall-repair`
- `/handyman-services/electrical`
- `/handyman-services/plumbing`
- `/handyman-services/carpentry`
- `/handyman-services/doors-windows`
- + 20+ handyman services (future)

Purpose:
- Primary SEO traffic driver
- Everyday homeowner needs

---

### Remodeling Hub
- `/home-remodeling`

Subpages:
- `/home-remodeling/kitchen-renovation`
- `/home-remodeling/bathroom-remodel`
- `/home-remodeling/whole-house`
- + 5–8 transformation pages

Purpose:
- Higher-ticket services
- Visual proof & trust

---

### About
- `/about`
  - `/about/our-story`
  - `/about/meet-the-team`
  - `/about/why-choose-ifixx`

---

### Service Areas
- `/service-areas`
  - `/service-areas/charlotte`
  - `/service-areas/south-charlotte`
  - `/service-areas/dilworth`
  - + 10+ neighborhood pages (future)

---

### Blog / Resources
- `/blog`

Categories:
- Emergency Tips
- Home Maintenance
- DIY vs Pro
- Charlotte Homeowner Guide

---

### Contact
- `/contact`

---

## 3) PHASE 1 BUILD SCOPE (IMPLEMENT NOW)

Build ONLY the following pages and templates:

1. Home `/`
2. Generic Service Template `/services/[serviceSlug]`
3. Service + City Template `/{citySlug}/{serviceSlug}`
4. Blog Index `/blog`
5. Blog Post Template `/blog/[postSlug]`
6. Contact `/contact`

All other pages listed above are **NOT built in Phase 1**, but the architecture must support them without refactoring.

---

## 4) TECHNOLOGY STACK

### Core
- Framework: **Astro**
- Styling: **Tailwind CSS**
- Interactivity: Astro Islands (React ONLY when required)
- Content: Astro Content Collections (MD / MDX)
- SEO: Astro Sitemap + JSON-LD schemas

### Performance Requirements
- Minimal JavaScript
- Optimized images (WebP / AVIF)
- Explicit width/height on images (avoid CLS)
- Mobile-first layouts
- Lighthouse targets:
  - Mobile ≥ 85
  - Desktop ≥ 90

---

## 5) LINE GRAPHIC / DESIGN SYSTEM

### Visual Direction
- Clean, modern, service-business aesthetic
- Realistic photography (NO fake stock look)
- Strong hierarchy, generous whitespace
- Light backgrounds with subtle section separation

### Color Usage (conceptual)
- Primary: Used for main CTAs only
- Secondary: Accents, icons, section highlights
- Neutral whites & grays for structure
- Emergency red ONLY in emergency contexts

### Typography
- Headings: Montserrat (clear, strong)
- Body: Inter (readable, neutral)

### DO NOT
- Heavy animations
- Parallax
- Decorative UI elements
- Dark-mode-first layouts

---

## 6) HOMEPAGE REQUIREMENTS `/`

### Hero (Exact Copy)
- Badge: 🏆 5 Years Transforming Homes
- H1: Your Trusted Handyman Team
- Subheadline: Emergency Services • Handyman Services • Bathrooms & Kitchen Makeovers • Everyday Repairs
- Trust line: Family-owned contractors serving Charlotte, NC with expert craftsmanship and trusted service.
- Primary CTA: Request Free Estimate
- Secondary CTA: Call Now

### Homepage Sections (Order)
1. Services overview (3 core services)
2. Emergency callout band (simple)
3. 3-step process
4. Why Choose iFixx
5. Featured work (6 images)
6. Testimonials (3–4)
7. Final CTA

---

## 7) SERVICE CATEGORIES (HOMEPAGE)

### H2: Complete Home Repair Services

Display 6 categories with icon, short description, CTA.

1. Painting & Drywall  
2. Electrical  
3. Doors & Windows  
4. Carpentry  
5. Plumbing  
6. General Repairs  

Each category links to its respective hub.

---

## 8) SERVICE AREAS (HOMEPAGE)

### H2: Serving Charlotte & Surrounding Areas

Highlighted neighborhoods:
- South Charlotte
- Dilworth
- Myers Park
- Plaza Midwood
- NoDa
- Ballantyne

CTA:
- View All Service Areas → `/service-areas`

### Approved Cities for Service + City Pages
- Charlotte, NC
- Matthews, NC
- Waxhaw, NC
- Rock Hill, SC
- Pineville, NC
- Monroe, NC

---

## 9) CONTENT COLLECTIONS (ASTRO)

### services
slug
title
category: emergency | handyman | remodeling
summary
heroImage
bullets[]
signs[]
processSteps[{ title, description }]
faqs[{ q, a }]
relatedServices[]
seo { title, description }

shell
Copy code

### cities
slug
name
state
localizedIntro
neighborhoods[]
seo { title, description }

shell
Copy code

### posts
slug
title
date
excerpt
coverImage
category
tags[]
seo { title, description }
body

yaml
Copy code

---

## 10) SERVICE TEMPLATE `/services/[serviceSlug]`

Structure:
- H1: {Service} in Charlotte, NC
- Intro paragraph
- Signs you need this service
- Our process (3 steps)
- Why choose iFixx
- FAQs
- Related services
- CTA section

SEO:
- Title: {Service} in Charlotte, NC | iFixx
- Schema: Service + LocalBusiness + Breadcrumb

---

## 11) SERVICE + CITY TEMPLATE `/{citySlug}/{serviceSlug}`

Requirements:
- Unique localized intro
- Reference neighborhoods / home types
- Minimum 2 city-specific FAQs
- Strong local CTA

SEO:
- Title: {Service} in {City}, NC | iFixx
- Schema: Service + LocalBusiness + Breadcrumb

---

## 12) BLOG

### Blog Index `/blog`
- Clean editorial layout
- Featured post
- Latest posts grid
- Category navigation

### Blog Post Template
- Large cover image
- Readable typography
- 800–1500 words
- Inline CTA
- Related posts
- Related services
- Final CTA

Schema:
- BlogPosting + Breadcrumb

---

## 13) CONTACT `/contact`

Requirements:
- Simple contact form
- Phone number visible
- Service area mention
- Optional lightweight map
- Trust indicators

---

## 14) CTA SYSTEM

### CTA Types
- Primary: Request Free Estimate
- Secondary: Call Now
- Emergency Only: Get Emergency Help (24/7)

Rules:
- One main CTA per section
- Emergency CTAs only in emergency contexts
- Mobile-friendly tap targets

---

## 15) FORMS & WEBHOOKS (CRITICAL)

ALL forms submit to:
POST `/api/lead`

### Forms
A) Quick Estimate  
B) Detailed Project  
C) Contact  

### Webhook Rules
- Server-side validation
- HMAC signature
- Retry once on failure
- Graceful success/error UX
- NO frontend email sending

---

## 16) ANALYTICS & EVENTS

Track:
- generate_lead
- phone_click
- form_submit
- view_service
- view_service_city
- view_blog_post

---

## 17) DEFINITION OF DONE (PHASE 1)

- Astro site built
- Templates functional
- SEO-ready
- Webhook forms working
- Fast performance
- Clean scalable structure
- Ready for Phase 2 expansion

END OF DOCUMENT
