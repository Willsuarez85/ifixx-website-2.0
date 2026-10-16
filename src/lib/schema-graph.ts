/**
 * Grafo JSON-LD del sitio, con el modelo que entrego Sebastian (SEO) el 2026-10-09.
 *
 * Su modelo: un solo negocio (#business), un WebSite (#website) y, en cada pagina,
 * un nodo WebPage (#webpage) que apunta a los dos; la pagina enlaza su
 * BreadcrumbList (#breadcrumb) y, si es de servicio, un Service (#service) cuyo
 * provider es el negocio por @id. Las FAQ van en el mismo nodo de la pagina
 * (["WebPage", "FAQPage"]).
 *
 * Lo que NO se copio literal de sus archivos, y por que:
 * - Los textos (titulos, FAQ, listas de servicios) salen del contenido vivo de cada
 *   pagina, no de sus archivos. Sus archivos se generaron con el sitio del 3-oct;
 *   desde entonces deck repair y otras seis paginas cambiaron sus FAQ, y una FAQ en
 *   el schema que no se ve en la pagina va contra las reglas de Google.
 * - El negocio sigue saliendo de business-facts.ts (horario real, zonas sin
 *   "Charlotte", resenas verificadas). Sus archivos traian el horario viejo
 *   (Lun-Vie 7-18, Sab 8-14) y a Hamed como fundador.
 *
 * Originales de Sebastian: Jarvis-OS 01-clients/ifixx/resources/sebastian/2026-10-09-schema/
 */
import { areaServedSchema } from './business-facts';

export const SITE_URL = 'https://www.ifixxnc.com';
export const BUSINESS_ID = `${SITE_URL}/#business`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const businessRef = { '@id': BUSINESS_ID };

/** URL absoluta y sin barra final (la home queda como https://www.ifixxnc.com/). */
export const absoluteUrl = (path: string): string => {
  if (!path || path === '/') return `${SITE_URL}/`;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${clean.replace(/\/+$/, '')}`;
};

export const pageIds = (path: string) => {
  const url = absoluteUrl(path);
  return {
    url,
    webpage: `${url}#webpage`,
    breadcrumb: `${url}#breadcrumb`,
    service: `${url}#service`,
    list: `${url}#list`,
  };
};

export const websiteNode = () => ({
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: `${SITE_URL}/`,
  name: 'iFIXX',
  inLanguage: 'en-US',
  publisher: businessRef,
});

export interface Crumb {
  name: string;
  /** Ruta del sitio, p. ej. "/repairs". La home es "/". */
  path: string;
}

export const breadcrumbNode = (path: string, crumbs: Crumb[]) => ({
  '@type': 'BreadcrumbList',
  '@id': pageIds(path).breadcrumb,
  itemListElement: crumbs.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: absoluteUrl(c.path),
  })),
});

export interface Faq {
  q: string;
  a: string;
}

export const webPageNode = (opts: {
  path: string;
  name: string;
  description: string;
  pageType?: string;
  faqs?: Faq[];
  hasBreadcrumb?: boolean;
}) => {
  const ids = pageIds(opts.path);
  const baseType = opts.pageType ?? 'WebPage';
  const faqs = opts.faqs ?? [];
  return {
    '@type': faqs.length > 0 ? [baseType, 'FAQPage'] : baseType,
    '@id': ids.webpage,
    url: ids.url,
    name: opts.name,
    description: opts.description,
    inLanguage: 'en-US',
    isPartOf: { '@id': WEBSITE_ID },
    about: businessRef,
    ...(opts.hasBreadcrumb ? { breadcrumb: { '@id': ids.breadcrumb } } : {}),
    ...(faqs.length > 0
      ? {
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : {}),
  };
};

export interface CatalogItem {
  name: string;
  url?: string;
}

/**
 * Service de una pagina. provider siempre por @id: antes cada plantilla repetia
 * el negocio con otro nombre ("iFixx Remodeling & Handyman Services" contra el
 * "iFIXX Remodeling" de #business) y otro correo, y Google veia dos negocios.
 */
export const serviceNode = (opts: {
  path: string;
  name: string;
  serviceType: string;
  description: string;
  image?: string;
  catalogName?: string;
  catalog?: (string | CatalogItem)[];
  areaServed?: unknown;
  audience?: string;
  offers?: Record<string, unknown>;
}) => {
  const ids = pageIds(opts.path);
  const catalog = (opts.catalog ?? []).map((c) => (typeof c === 'string' ? { name: c } : c));
  return {
    '@type': 'Service',
    '@id': ids.service,
    name: opts.name,
    serviceType: opts.serviceType,
    url: ids.url,
    description: opts.description,
    ...(opts.image ? { image: opts.image } : {}),
    provider: businessRef,
    areaServed: opts.areaServed ?? areaServedSchema(),
    ...(opts.audience ? { audience: { '@type': 'Audience', audienceType: opts.audience } } : {}),
    ...(catalog.length > 0
      ? {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: opts.catalogName ?? opts.name,
            itemListElement: catalog.map((c) => ({
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: c.name,
                ...(c.url ? { url: absoluteUrl(c.url) } : {}),
              },
            })),
          },
        }
      : {}),
    ...(opts.offers ? { offers: opts.offers } : {}),
  };
};

/**
 * Precio minimo de visita ($150). Sebastian lo puso en las once paginas de
 * reparaciones; aqui solo sale donde la propia pagina lo dice, porque un precio en
 * el schema que el visitante no ve es un dato sin respaldo.
 */
export const MINIMUM_VISIT_PRICE = 150;
export const minimumVisitOffer = () => ({
  '@type': 'Offer',
  priceCurrency: 'USD',
  description: `Minimum charge for any repair visit is $${MINIMUM_VISIT_PRICE}.`,
  priceSpecification: {
    '@type': 'PriceSpecification',
    minPrice: MINIMUM_VISIT_PRICE,
    priceCurrency: 'USD',
  },
});
