import { defineCollection, z } from 'astro:content';

// Services Collection
const servicesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(['emergency', 'handyman', 'remodeling']),
    pillar: z.enum(['repairs', 'remodeling', 'emergency-services']), // URL pillar for SEO structure
    summary: z.string(),
    heroImage: z.string().optional(),
    bullets: z.array(z.string()).optional(),
    signs: z.array(z.string()).optional(),
    processSteps: z.array(z.object({
      title: z.string(),
      description: z.string()
    })).optional(),
    faqs: z.array(z.object({
      q: z.string(),
      a: z.string()
    })).optional(),
    relatedServices: z.array(z.string()).optional(),
    seo: z.object({
      title: z.string(),
      description: z.string()
    })
  })
});

// Cities Collection (also serves as Locations for Service Areas)
const citiesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    state: z.string(),
    region: z.enum(['NC', 'SC']),
    type: z.enum(['city', 'neighborhood']).default('city'),
    parentCity: z.string().optional(), // For neighborhoods, reference parent city slug
    localizedIntro: z.string(),
    description: z.string(), // Longer description for the location page
    neighborhoods: z.array(z.string()).optional(),
    highlights: z.array(z.string()).optional(), // Key selling points for the area
    zipCodes: z.array(z.string()).optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional(),
    servicesHighlighted: z.array(z.string()).optional(), // Featured services for this location
    seo: z.object({
      title: z.string(),
      description: z.string()
    })
  })
});

// Blog Posts Collection
const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    excerpt: z.string(),
    coverImage: z.string().optional(),
    category: z.string(),
    tags: z.array(z.string()).optional(),
    seo: z.object({
      title: z.string(),
      description: z.string()
    })
  })
});

export const collections = {
  'services': servicesCollection,
  'cities': citiesCollection,
  'posts': postsCollection
};
