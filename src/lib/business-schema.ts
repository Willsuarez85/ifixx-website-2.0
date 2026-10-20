/**
 * Nodo JSON-LD del negocio (@id #business), extraido de BaseLayout.astro para poder
 * probarlo sin importar archivos .astro. Mantiene el modelo de Sebastian (PR #73):
 * mismo @id, tipos, direccion, geo, horario, zonas, calificacion y sameAs.
 *
 * Lo que sale de los hechos de la marca (agent-facts.ts): slogan, fundador, correo,
 * telefono, razon social y la descripcion (remodeling primero, quick fixes como puerta).
 * Ademas del ReserveAction y el "Call Now" existentes, publica una CommunicateAction
 * que apunta a los asistentes de IA al endpoint de estimados.
 *
 * Este modulo es puro: no importa astro:content.
 */
import { BRAND } from './agent-facts';
import { FOUNDING_YEAR, GOOGLE_RATING, GOOGLE_REVIEW_COUNT, areaServedSchema, openingHoursSchema } from './business-facts';
import { GOOGLE_REVIEWS } from './google-reviews';
import { BUSINESS_ID, SITE_URL } from './schema-graph';

// Las resenas del schema salen de google-reviews.ts, que es la copia verbatim del
// perfil de Google. Antes habia dos resenas escritas a mano ("Zack A." hablando de
// una cerca, "Jaime" mezclando frases de dos autores) que no existen en el perfil:
// una resena inventada en el markup es exactamente lo que Google penaliza. Se
// publican las 6 mas recientes; el conteo y el promedio siguen viniendo de
// business-facts.ts.
const schemaReviews = () =>
  GOOGLE_REVIEWS.slice(0, 6).map((r) => ({
    '@type': 'Review',
    reviewRating: {
      '@type': 'Rating',
      ratingValue: r.rating,
      bestRating: 5,
      worstRating: 1,
    },
    author: {
      '@type': 'Person',
      name: r.author,
    },
    datePublished: r.datePublished,
    reviewBody: r.text,
  }));

/** Remodeling first, quick fixes as the door, fully insured, since the founding year. */
export const BUSINESS_DESCRIPTION =
  `Family-owned, fully insured remodeling and handyman crew serving South Charlotte, NC and nearby towns since ${FOUNDING_YEAR}. ` +
  'Kitchen and bathroom remodeling, decks and screened porches, plus the quick fixes and home repairs that open the door.';

/** Nodo del negocio sin @context (va dentro del @graph de la pagina). */
export function businessNode() {
  return {
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness'],
    '@id': BUSINESS_ID,
    name: 'iFIXX Remodeling',
    description: BUSINESS_DESCRIPTION,
    slogan: BRAND.tagline,
    founder: { '@type': 'Person', name: BRAND.owner },
    email: BRAND.email,
    knowsAbout: [
      'Kitchen remodeling',
      'Bathroom remodeling',
      'Deck building',
      'Screened porches',
      'Flooring installation',
      'Drywall repair',
      'Painting',
      'Carpentry',
      'Deck repair',
      'Door and window repair',
    ],
    legalName: BRAND.legalName,
    foundingDate: String(FOUNDING_YEAR),
    telephone: BRAND.phone,
    url: SITE_URL,
    image: `${SITE_URL}/images/ui/hero-bg.jpg`,
    logo: `${SITE_URL}/images/ui/logo.png`,
    priceRange: '$$',
    openingHoursSpecification: openingHoursSchema(),
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Charlotte',
      addressRegion: 'NC',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '35.2271',
      longitude: '-80.8431',
    },
    areaServed: areaServedSchema(),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: GOOGLE_RATING,
      reviewCount: GOOGLE_REVIEW_COUNT,
    },
    review: schemaReviews(),
    potentialAction: [
      {
        '@type': 'ReserveAction',
        name: 'Request Free Estimate',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/contact`,
          actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/MobileWebPlatform'],
        },
        result: {
          '@type': 'Reservation',
          name: 'Free Estimate Request',
        },
      },
      {
        '@type': 'CommunicateAction',
        name: 'Call Now',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'tel:+19803916833',
          actionPlatform: ['http://schema.org/MobileWebPlatform'],
        },
      },
      {
        '@type': 'CommunicateAction',
        name: 'Request an estimate (AI assistants)',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/api/agent/estimate`,
          contentType: 'application/json',
          httpMethod: 'POST',
        },
      },
    ],
    alternateName: ['iFIXX', 'iFixx', 'iFIXX NC', 'iFIXX Charlotte', 'I Fixx Remodeling Services', 'iFixx Handyman'],
    sameAs: [
      'https://www.google.com/maps?cid=13782573695421719060',
      'https://www.bbb.org/us/nc/concord/profile/handyman/i-fixx-remodeling-services-0473-92036918',
      'https://www.facebook.com/ifixxnc',
      'https://www.instagram.com/ifixxnc',
      'https://www.yelp.com/biz/i-fixx-handyman-services-concord',
      'https://nextdoor.com/page/ifixx-remodeling-services-concord-nc',
      'https://citysquares.com/b/ifixx-handyman-26640189',
      'https://www.hotfrog.com/company/f5902215ad9fba2bc78abe3f4f5595f0/ifixx-handyman/concord/home-improvement',
      'https://www.mapquest.com/us/north-carolina/ifixx-handyman-790561324',
      'https://www.showmelocal.com/38969280-ifixx-handyman-concord',
    ],
  };
}
