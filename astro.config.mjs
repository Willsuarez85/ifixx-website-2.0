// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://ifixxnc.com',
  output: 'static',
  adapter: vercel(),
  integrations: [
    sitemap({
      changefreq: 'weekly',
      lastmod: new Date(),
      // Custom priority based on page type
      serialize(item) {
        const url = item.url;

        // Homepage - highest priority
        if (url === 'https://ifixxnc.com/' || url === 'https://ifixxnc.com') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        }
        // Contact page - high priority (conversion page)
        else if (url.includes('/contact')) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        }
        // Services index and individual service pages - high priority
        else if (url.includes('/services')) {
          item.priority = 0.8;
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