# 🎨 iFIXX Website Visual Upgrade Plan
> **Created:** 2026-02-04
> **Status:** In Progress
> **Branch:** `visual-upgrade`
> **Goal:** Make ALL pages match the homepage in colors, forms, fonts, and visual energy

---

## 📊 Diagnosis

The **homepage** has strong brand energy — real photos, gold/red/charcoal palette, Montserrat headings, EmergencyBand, FeaturedWork grid, WhyChooseUs cards, ProcessSteps with image.

The **pillar pages** (repairs/, remodeling/) and **service pages** (/repairs/plumbing, etc.) feel generic — missing key components, custom one-off sections that don't match the homepage style.

## 🎨 Design System (from Homepage)

| Element | Value |
|---------|-------|
| **Primary Gold** | `#e4bc5d` |
| **Emergency Red** | `#ac1318` |
| **Charcoal** | `#111010` / `#1c191a` |
| **Heading Font** | Montserrat Bold (600-800) |
| **Body Font** | Inter (400-600) |
| **btn-primary** | Red bg, white text |
| **btn-secondary** | White bg, charcoal border |
| **Cards** | White, gold border on hover, lift effect |
| **Sections** | Alternate: white → gray → dark → gold |

## 📸 Available Photos (100+ total)

- **65 portfolio photos** — `Ifixx-portfolio1.webp` to `65.webp`
- **30+ named project photos** — kitchen, bathroom, carpentry, plumbing, electrical, doors, painting, outdoor
- **8 service category images** — `/images/services/`
- **4 UI images** — team, hero-bg, logo, contractors
- **All already in `/public/images/`** — no new assets needed

## ✅ Homepage Flow (The Standard)

```
Hero (dark bg, gold accent headline, CTAs)
→ TrustBar (review badges)
→ ServicesGrid (photo cards)
→ EmergencyBand (red band)
→ ProcessSteps (image + numbered steps)
→ WhyChooseUs (6 icon cards)
→ FeaturedWork (project photo grid with hover)
→ CTAIntermediate (gold "Like What You See?")
→ Testimonials (customer reviews)
→ CTASection (final CTA)
```

---

## 🔧 Changes by Page

### Phase 1: Pillar Pages (BIGGEST gap)

#### `/repairs/index.astro`
- [ ] Add `EmergencyBand` after TrustBar
- [ ] Add `ScrollGallery` after services grid
- [ ] Replace custom WhyChooseUs → use `WhyChooseUs.astro` component
- [ ] Add `FeaturedWork` component
- [ ] Add `CTAIntermediate` ("Like What You See?")
- [ ] Add `GoogleReviews` before final CTA
- [ ] Fix CTA section → use `CTASection.astro` component
- [ ] Ensure section alternation matches homepage pattern

#### `/remodeling/index.astro`
- [ ] Add `EmergencyBand` after TrustBar
- [ ] Add `ScrollGallery` after services grid
- [ ] Replace custom WhyChooseUs → use `WhyChooseUs.astro` component
- [ ] Replace custom ProcessSteps → use `ProcessSteps.astro` component (with image)
- [ ] Add `FeaturedWork` component
- [ ] Add `CTAIntermediate`
- [ ] Add `GoogleReviews` before final CTA
- [ ] Fix CTA section → use `CTASection.astro` component

### Phase 2: Service Pages (Good but incomplete)

#### `/repairs/[serviceSlug].astro`
- [ ] Add `EmergencyBand` after TrustBar
- [ ] Add `FeaturedWork` after ScrollGallery
- [ ] Add `WhyChooseUs` component after signs section

#### `/remodeling/[serviceSlug].astro`
- [ ] Add `EmergencyBand` after TrustBar
- [ ] Add `FeaturedWork` after ScrollGallery
- [ ] Add `WhyChooseUs` component

### Phase 3: Emergency Pages

#### `/emergency-services/index.astro`
- [ ] Add `ScrollGallery` with relevant photos
- [ ] Add `FeaturedWork`
- [ ] Add `GoogleReviews`

#### `/emergency-services/*.astro` (individual)
- [ ] Add `FeaturedWork`
- [ ] Add `WhyChooseUs`

---

## 🚀 Execution

1. Create branch `visual-upgrade` from main
2. Update pillar pages first (biggest impact)
3. Update service pages
4. Update emergency pages
5. Test locally / Vercel preview
6. Merge to main

---

*Plan by Jarvis — 2026-02-04*
