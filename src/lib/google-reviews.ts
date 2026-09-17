/**
 * Las unicas resenas que el sitio puede mostrar.
 *
 * Regla (SEO/compliance, 2026-09-17): toda resena publicada tiene que existir en
 * el Google Business Profile de iFIXX y poder comprobarse ahi. Nada de testimonios
 * redactados, nombres inventados ni empresas de administracion de propiedades que
 * no existen. Si una resena no esta en este archivo, no se publica.
 *
 * Las dos de abajo son las verificadas contra el perfil el 2026-07-14 (commit
 * "SEO schema: replace Must-Not-Say reviews with real ones") y son las mismas que
 * emite el JSON-LD `review` de BaseLayout. El texto es el de la resena, sin
 * reescribir.
 *
 * El conteo y el promedio NO viven aqui: vienen de business-facts.ts
 * (GOOGLE_REVIEW_COUNT / GOOGLE_RATING), leidos del GBP el 2026-08-02, que es lo
 * unico que alimenta el aggregateRating del schema.
 *
 * Para anadir una: copiar autor, fecha y texto del GBP tal cual, y dejar la fecha
 * de verificacion en el comentario.
 */

export interface GoogleReview {
  /** Autor tal como aparece en el perfil de Google. */
  author: string;
  /** Fecha de publicacion en el perfil (ISO). */
  datePublished: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Texto de la resena, sin editar. */
  text: string;
}

/** Perfil publico de Google donde cualquiera puede comprobar las resenas. */
export const GOOGLE_PROFILE_URL = 'https://www.google.com/maps?cid=13782573695421719060';

export const GOOGLE_REVIEWS: GoogleReview[] = [
  {
    author: 'Zack A.',
    datePublished: '2026-02-09',
    rating: 5,
    text: "I recently hired iFixx to install a fence and I couldn't be more impressed. The quality of the work is outstanding and the attention to detail is obvious. The crew was punctual every day and kept communication clear throughout the entire process. I highly recommend iFixx Remodeling for any home project - they're my go-to guys!",
  },
  {
    author: 'Jaime',
    datePublished: '2026-03-23',
    rating: 5,
    text: 'Had an amazing experience! Very knowledgeable, punctual, hard-working crew. Great prices and outstanding work. The flooring install was done in a timely fashion and we were very pleased with the results. Will definitely use them again!',
  },
];

/** "February 2026" — Google muestra fechas relativas; el sitio publica la real. */
export const reviewDateLabel = (iso: string): string =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
