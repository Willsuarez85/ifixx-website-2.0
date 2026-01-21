# Content Creation Guide for City+Service Pages

## Overview

This guide explains how to create unique content for city+service pages to improve Google indexation.

**Current Status:**
- Total city+service combinations: 104 pages (8 cities × 13 services)
- Infrastructure: Ready (city-service collection created)
- Charlotte priority pages: 4 completed

---

## How It Works

1. Create a markdown file in `src/content/city-service/`
2. Name it `{citySlug}-{serviceSlug}.md` (e.g., `matthews-plumbing.md`)
3. Fill in the unique local content
4. Run `npm run build` to generate the updated page

If a file exists, the page uses its unique content. If not, it uses the generic content (current behavior).

---

## File Template

Copy this template and customize for each city+service combination:

```markdown
---
citySlug: "CITY_SLUG"  # e.g., "charlotte", "matthews", "ballantyne"
serviceSlug: "SERVICE_SLUG"  # e.g., "kitchen-remodeling", "plumbing"

localIntro: "150-200 word introduction specific to this city and service. Mention local neighborhoods, specific challenges in this area, and your experience there."

projectHighlight:
  title: "Project Title with Neighborhood"
  neighborhood: "Specific Neighborhood"
  description: "200-300 word case study of a real or realistic project. Include before/after details, specific challenges solved, and results."
  # beforeImage: "/images/projects/before.jpg"  # optional
  # afterImage: "/images/projects/after.jpg"    # optional

localBullets:
  - "Specific experience stat for this area"
  - "Local knowledge point"
  - "Unique advantage for this city"
  - "Local permit/process familiarity"
  - "Timeline or availability note"
  - "Trust signal specific to area"

localFaqs:
  - q: "Local-specific question about permits/regulations?"
    a: "Detailed answer mentioning Mecklenburg/York County, local requirements, etc."
  - q: "Question about working in this specific area?"
    a: "Answer highlighting local expertise and challenges."
  - q: "Question about timeline/process in this city?"
    a: "Answer with local-specific details."
  - q: "Question about pricing/availability in this area?"
    a: "Answer addressing local market factors."

localInfo:
  permits: "Local permit information for this county/city. Which office handles permits, typical timeline, requirements."
  regulations: "Local building code specifics. NC vs SC differences if applicable."
  hoaConsiderations: "HOA prevalence in this area and how you work with them."

seo:
  title: "Service Name City ST | Stat | iFixx"  # max 60 chars
  description: "Service + city + neighborhoods + key differentiator. Free estimates! 160 chars max."
---

## Main Content Heading

2-3 paragraphs of unique content about this service in this city. This appears in the right column of the page.

### Subheading About Local Expertise

More unique content specific to this combination.

### Another Relevant Subheading

Final section with call to action.
```

---

## Content Creation Priority

### Phase 1: Charlotte (DONE)
- [x] charlotte-kitchen-remodeling.md
- [x] charlotte-bathroom-remodeling.md
- [x] charlotte-plumbing.md
- [x] charlotte-painting.md

### Phase 2: High-Value Cities (Week 1-2)
Priority: Ballantyne, Matthews

**Ballantyne:**
- [ ] ballantyne-kitchen-remodeling.md
- [ ] ballantyne-bathroom-remodeling.md
- [ ] ballantyne-plumbing.md
- [ ] ballantyne-painting.md

**Matthews:**
- [ ] matthews-kitchen-remodeling.md
- [ ] matthews-bathroom-remodeling.md
- [ ] matthews-plumbing.md
- [ ] matthews-painting.md

### Phase 3: Secondary Markets (Week 2-3)
Priority: Pineville, Mint Hill, Rock Hill

### Phase 4: Remaining Cities (Week 3-4)
Priority: Monroe, Waxhaw

---

## Content Guidelines

### What Makes Content "Unique"

Google needs to see **meaningful differences** between pages. Each page should have:

1. **Specific intro** (not just swapping city names)
2. **Real/realistic project example** from that area
3. **Local FAQs** addressing city-specific questions
4. **Local info** (permits, regulations, HOA details)

### Word Count Targets

| Section | Target Words |
|---------|-------------|
| localIntro | 150-200 |
| projectHighlight.description | 200-300 |
| Each FAQ answer | 50-100 |
| Main content body | 200-400 |
| **Total unique content** | **~700-1000 words** |

### Tips for Unique Content

1. **Neighborhoods**: Mention specific neighborhoods within each city
2. **Home Types**: Reference common house styles in the area
3. **Local Issues**: Mention challenges specific to that area (older plumbing, HOA rules, etc.)
4. **Project Details**: Use real project details when possible
5. **Local Regulations**: Research actual permit requirements for each county

### County Information

| City | County | Permit Office |
|------|--------|---------------|
| Charlotte | Mecklenburg | Mecklenburg County Code Enforcement |
| Matthews | Mecklenburg | Same as Charlotte |
| Ballantyne | Mecklenburg | Same as Charlotte |
| Mint Hill | Mecklenburg | Same as Charlotte |
| Pineville | Mecklenburg | Same as Charlotte |
| Monroe | Union | Union County Building Department |
| Waxhaw | Union | Union County Building Department |
| Rock Hill | York (SC) | City of Rock Hill Building Services |

---

## After Creating Content

1. Run `npm run build` to verify no errors
2. Deploy to production
3. Request re-indexing in Google Search Console:
   - Go to GSC > URL Inspection
   - Enter the page URL
   - Click "Request Indexing"
4. Monitor indexation status in GSC Coverage report

---

## Quick Reference: City and Service Slugs

**Cities:**
- charlotte
- ballantyne
- matthews
- pineville
- mint-hill
- monroe
- waxhaw
- rock-hill

**Services:**
- kitchen-remodeling
- bathroom-remodeling
- plumbing
- painting
- electrical
- carpentry
- doors-windows
- flooring-installation
- tv-mounting
- furniture-assembly
- quick-fix
- outdoor-living
- basement-finishing

---

## Questions?

This system is designed to be flexible. You can:
- Add content gradually (pages without unique content still work)
- Focus on high-value combinations first
- Update content anytime without breaking existing pages
