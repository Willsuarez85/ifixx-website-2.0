#!/bin/bash

# Painting + Drywall Consolidation Deployment Script
# Run from: projects/ifixx/website/

echo "🚀 Deploying Painting + Drywall Consolidation (Phase 1 Completion)"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "astro.config.mjs" ]; then
    echo "❌ Error: Must run from projects/ifixx/website/ directory"
    exit 1
fi

echo "📋 Changes to be deployed:"
echo "  - Expanded /repairs/painting/ (1,500 words)"
echo "  - Updated /repairs/drywall/ (1,180 words)"
echo "  - 18 new 301 redirects (9 painting + 9 drywall)"
echo "  - Enhanced schema markup"
echo "  - Updated sitemap filters"
echo ""

# Show git status
echo "📊 Git status:"
git status --short
echo ""

# Ask for confirmation
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Run build test
echo "🔨 Running build test..."
npm run build > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Build test passed"
else
    echo "❌ Build test failed - fix errors before deploying"
    npm run build
    exit 1
fi

# Add all changes
echo "📦 Staging changes..."
git add .

# Commit
echo "💾 Committing..."
git commit -m "SEO: Consolidate painting + drywall duplicate pages (Phase 1 completion)

- Expand /repairs/painting/ to 1,500 words with Service Areas
- Update /repairs/drywall/ with comprehensive content + Service Areas
- Implement 18 permanent 301 redirects (9 painting + 9 drywall)
- Enhance schema with AggregateOffer pricing and multi-city areaServed
- Update sitemap to exclude duplicate pages
- Complete Phase 1: 36 pages consolidated (Kitchen + Bathroom + Painting + Drywall)

Target keywords:
- painting charlotte: 1,130-1,950/mo (HIGH value)
- drywall repair charlotte: 210-390/mo (MEDIUM value)

Files modified:
- src/content/services/painting.md (expanded)
- src/content/services/drywall.md (updated)
- vercel.json (18 new redirects)
- astro.config.mjs (sitemap filters)
- src/pages/repairs/[serviceSlug].astro (schema enhancement)"

if [ $? -eq 0 ]; then
    echo "✅ Committed successfully"
else
    echo "❌ Commit failed"
    exit 1
fi

# Push to main
echo "🚀 Pushing to main branch..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Pushed successfully"
    echo ""
    echo "=================================================="
    echo "✅ DEPLOYMENT COMPLETE"
    echo "=================================================="
    echo ""
    echo "📋 Next steps:"
    echo "  1. Monitor Vercel deployment: https://vercel.com/dashboard"
    echo "  2. Wait 2-3 minutes for build to complete"
    echo "  3. Test redirects:"
    echo "     curl -I https://www.ifixxnc.com/charlotte/painting/"
    echo "     curl -I https://www.ifixxnc.com/ballantyne/drywall/"
    echo "  4. Verify canonical pages:"
    echo "     https://www.ifixxnc.com/repairs/painting/"
    echo "     https://www.ifixxnc.com/repairs/drywall/"
    echo "  5. Submit to Google Search Console"
    echo "  6. Monitor rankings for 2-4 weeks"
    echo ""
    echo "📊 Expected impact:"
    echo "  - Better rankings for 'painting charlotte' (1,130-1,950/mo)"
    echo "  - Better rankings for 'drywall repair charlotte' (210-390/mo)"
    echo "  - Consolidated authority from 18 duplicate pages"
    echo "  - Improved crawl efficiency"
    echo ""
else
    echo "❌ Push failed - check git status"
    exit 1
fi
