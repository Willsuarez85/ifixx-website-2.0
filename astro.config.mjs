// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.ifixxnc.com',
  output: 'static',
  adapter: vercel(),
  integrations: [
    sitemap({
      changefreq: 'weekly',
      lastmod: new Date(),
      // Exclude redirect pages from sitemap
      filter: (page) => {
        // Exclude /services/[slug] pages (these redirect to /repairs/ or /remodeling/)
        if (page.match(/\/services\/[a-z-]+\/?$/)) return false;
        // Exclude privacy and terms (low value for SEO)
        if (page.includes('/privacy') || page.includes('/terms')) return false;
        // Exclude duplicate kitchen-remodeling location pages (redirect to canonical)
        if (page.match(/\/(ballantyne|charlotte|concord|matthews|mint-hill|monroe|pineville|rock-hill|waxhaw)\/kitchen-remodeling\/?$/)) return false;
        // Exclude duplicate bathroom-remodeling location pages (redirect to canonical)
        if (page.match(/\/(ballantyne|charlotte|concord|matthews|mint-hill|monroe|pineville|rock-hill|waxhaw)\/bathroom-remodeling\/?$/)) return false;
        return true;
      },
      // Custom priority based on page type
      serialize(item) {
        const url = item.url;

        // Homepage - highest priority
        if (url === 'https://www.ifixxnc.com/' || url === 'https://www.ifixxnc.com') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        }
        // Contact page - high priority (conversion page)
        else if (url.includes('/contact')) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        }
        // Pillar pages - very high priority (SEO hubs)
        else if (url.match(/\/(repairs|remodeling|emergency-services)\/?$/)) {
          item.priority = 0.85;
          item.changefreq = 'weekly';
        }
        // Service areas index - high priority (local SEO hub)
        else if (url.match(/\/service-areas\/?$/)) {
          item.priority = 0.75;
          item.changefreq = 'weekly';
        }
        // Services index and individual service pages - high priority
        else if (url.includes('/services')) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        }
        // Individual pillar service pages (repairs/plumbing, remodeling/kitchen)
        else if (url.match(/\/(repairs|remodeling)\/[a-z-]+$/)) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        }
        // Location pages (service-areas/charlotte, etc.)
        else if (url.match(/\/service-areas\/[a-z-]+$/)) {
          item.priority = 0.75;
          item.changefreq = 'weekly';
        }
        // City + Service pages - medium-high priority (local SEO)
        else if (url.match(/\/[a-z-]+\/[a-z-]+$/)) {
          item.priority = 0.7;
          item.changefreq = 'weekly';
        }
        // About page
        else if (url.includes('/about')) {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        }
        // Gallery
        else if (url.includes('/gallery')) {
          item.priority = 0.6;
          item.changefreq = 'monthly';
        }
        // Blog index
        else if (url.endsWith('/blog') || url.endsWith('/blog/')) {
          item.priority = 0.6;
          item.changefreq = 'weekly';
        }
        // Blog posts - lower priority
        else if (url.includes('/blog/')) {
          item.priority = 0.5;
          item.changefreq = 'monthly';
        }
        // Default
        else {
          item.priority = 0.5;
        }

        return item;
      }
    })
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});