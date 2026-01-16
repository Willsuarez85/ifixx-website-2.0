import { defineCollection, z } from 'astro:content';

// Services Collection
const servicesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(['emergency', 'handyman', 'remodeling']),
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

// Cities Collection
const citiesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    state: z.string(),
    localizedIntro: z.string(),
    neighborhoods: z.array(z.string()).optional(),
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
