/**
 * Las unicas resenas que el sitio puede mostrar.
 *
 * Fuente: Google Business Profile publico de iFIXX (IFixx handyman, 3298 Shining
 * Rock St SW, Concord, NC). Lectura del 2026-09-17: 16 resenas, promedio 5.0.
 * Crudo archivado en 01-clients/ifixx/resources/2026-09-17-gbp-reviews.json.
 *
 * Regla (SEO/compliance): toda resena publicada tiene que existir en ese perfil y
 * poder comprobarse ahi. El texto va verbatim, tal como lo escribio el cliente,
 * sin corregir ortografia ni puntuacion y sin recortar. Si una resena no esta en
 * este archivo, no se publica. Nada de testimonios redactados ni nombres
 * inventados.
 *
 * Las dos que vivian aqui antes ("Zack A." con una cerca y "Jaime" mezclando
 * frases de dos autores) no correspondian a ninguna resena real y se retiraron el
 * 2026-09-17.
 *
 * El conteo y el promedio NO viven aqui: vienen de business-facts.ts
 * (GOOGLE_REVIEW_COUNT / GOOGLE_RATING), que es lo unico que alimenta el
 * aggregateRating del schema.
 *
 * Para actualizar: volver a leer el perfil, copiar autor, fecha y texto tal cual,
 * y mover la fecha de lectura de este comentario.
 */

export interface GoogleReview {
  /** Autor tal como aparece en el perfil de Google. */
  author: string;
  /** Fecha de publicacion en el perfil (ISO). */
  datePublished: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Texto de la resena, verbatim. */
  text: string;
  /** Permalink de la resena en Google Maps, cuando el perfil lo expone. */
  reviewUrl?: string;
}

/** Perfil publico de Google donde cualquiera puede comprobar las resenas. */
export const GOOGLE_PROFILE_URL = 'https://www.google.com/maps?cid=13782573695421719060';

/** Las 16 resenas del perfil, de la mas reciente a la mas antigua. */
const ALL_GOOGLE_REVIEWS: GoogleReview[] = [
  {
    author: "Jen Jen",
    datePublished: "2026-06-30",
    rating: 5,
    text: "Had an amazing experience! Very knowledge , punctual , hard working crew . Great prices and outstanding work . Will definitely use them again",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT21Sd1ltSnZjM2hEYW1ka1VrSkhVVkptZEd4aWFuYxAB!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CAIQACodChtycF9oOmRwYmJvc3hDamdkUkJHUVJmdGxianc%7C%7C?hl=en-US",
  },
  {
    author: "Alfonzo Jowers",
    datePublished: "2026-03-20",
    rating: 5,
    text: "Crew was on time and very professional. Work was done in a timely fashion and we was very pleased with the results.",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT2xOUFJWaHZRMk5HTlZaclVXRkZUbDgwTW05MlYzYxAB!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CAIQACodChtycF9oOlNPRVhvQ2NGNVZrUWFFTl80Mm92V3c%7C%7C?hl=en-US",
  },
  {
    author: "Zack Aschliman",
    datePublished: "2026-02-07",
    rating: 5,
    text: "I recently hired Jaime to drywall a storage closet from start to finish, and I couldn't be more impressed. The quality of his work is outstanding; the walls are perfectly smooth and the attention to detail is obvious.\n\nBeyond the craftsmanship, his professionalism really stood out. He was punctual every day and kept communication clear throughout the entire process, so I always knew exactly what to expect. It is rare to find someone who is as reliable as they are skilled. I highly recommend I Fixx Remodeling for any home project! They are my go-to guys!",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT25wWlNWbElTRWxJVm1VeVJWOUhXRkpvWlRkRk4yYxAB!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CAIQACodChtycF9oOnpZSVlISElIVmUyRV9HWFJoZTdFN2c%7C%7C?hl=en-US",
  },
  {
    author: "Mark Thomas",
    datePublished: "2026-01-01",
    rating: 5,
    text: "Jamie and his team did an excellent job installing new flooring at a fair price. I would recommend his services to everyone I know.",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT25Wa1NrdFNXVVpTYlUxSVlXd3hkVkYxUjNVeE1XYxAB!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CAIQACodChtycF9oOnVkSktSWUZSbU1IYWwxdVF1R3UxMWc%7C%7C?hl=en-US",
  },
  {
    author: "Vincent Bracaliello",
    datePublished: "2025-08-04",
    rating: 5,
    text: "Hamed and Jamie are the best. Like they say\"they're not a franchise\"!!! They are real guys that are here to accommodate budgets, make great recommendations and at the end of the day just DO THE RIGHT THING! I can confidently recommend them on the next project, big or small!",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT2poblFuVlZhVkJ0VFRKWk4yNU5WbXBOUlZka1UxRRAB!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CAIQACodChtycF9oOjhnQnVVaVBtTTJZN25NVmpNRVdkU1E%7C%7C?hl=en-US",
  },
  {
    author: "Charlie Klingler",
    datePublished: "2025-07-21",
    rating: 5,
    text: "I have used Jaime and Hamed for multiple projects and every time work was great. They are very particular about their work and it shows when you see the finished results. Recommend for all projects big and small",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT25Wa2RYTklTR1Z4ZG14bU4yNDNVbVpGVTBKV1EyYxAB!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CAIQACodChtycF9oOnVkdXNISGVxdmxmN243UmZFU0JWQ2c%7C%7C?hl=en-US",
  },
  {
    author: "RoadRunnabeats",
    datePublished: "2025-07-18",
    rating: 5,
    text: "Best guys you could have in your home or business anything you could need they can provide on a service level with with good cost and even better work. These are your guys!",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT2xkNFVVeDNUMXB0ZUY5bFNGWkZiRGN0Y25GdWQyYxAB!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CAIQACodChtycF9oOld4UUx3T1pteF9lSFZFbDctcnFud2c%7C%7C?hl=en-US",
  },
  {
    author: "Jean & Howie Hohwiesner",
    datePublished: "2025-07-18",
    rating: 5,
    text: "Hamed and Jamie have done several jobs for me. The most recent is my screened room. I have had several complements, we love how it turned out. I would recommend them to anyone needing work done.",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT2xWWWExUklUV3d6Y2xaSmFrTjFlamxHVkc1VmNXYxAB!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CAIQACodChtycF9oOlVYa1RITWwzclZJakN1ejlGVG5VcWc%7C%7C?hl=en-US",
  },
  {
    author: "Danny Black",
    datePublished: "2025-07-18",
    rating: 5,
    text: "Great attention to detail, awesome craftsmanship with our home remodel!!  Would highly recommend for any home remodel or fixer up project!  Very knowledgeable and price point for quality work is superb!!!",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT21aRmRXNXNRMjlaTkdKaVRYVnVZbVpmZEV0YWRtYxAB!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CAIQACodChtycF9oOmZFdW5sQ29ZNGJiTXVuYmZfdEtadmc%7C%7C?hl=en-US",
  },
  {
    author: "Lori Beth Johnson",
    datePublished: "2025-02-04",
    rating: 5,
    text: "Amazing guys - VERY patient with me and my many questions about the complete primary bathroom renovation due to plumbing leaks.",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sChdDSUhNMG9nS0VJQ0FnTUNBdTRhOTB3RRAB!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CIHM0ogKEICAgMCAu4a90wE%7C%7C?hl=en-US",
  },
  {
    author: "T Bat",
    datePublished: "2025-01-12",
    rating: 5,
    text: "One of the best experiences I’ve had. Showed up on time, very respectful, clean and did amazing work! Would recommend to anyone needing work done!",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sChZDSUhNMG9nS0VJQ0FnSUNfaE1yOFJBEAE!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CIHM0ogKEICAgIC_hMr8RA%7C%7C?hl=en-US",
  },
  {
    author: "Matt Crisp",
    datePublished: "2025-01-07",
    rating: 5,
    text: "We have used Jaime for several jobs recently and been impressed with the speed and quality of his and his teams’ work. Jaime is always prompt and communicative. It is nice to find a handyman that is as reliable as Jaime.",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sChZDSUhNMG9nS0VJQ0FnSURmeWVLNGVREAE!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CIHM0ogKEICAgIDfyeK4eQ%7C%7C?hl=en-US",
  },
  {
    author: "Adam Pfleegor",
    datePublished: "2024-12-15",
    rating: 5,
    text: "All the services that this team has accomplished for me has been done with care and competency.  The prices are fair for the level of craftsmanship.  Communication and consistency are excellent.  Would recommend to everyone.",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sChZDSUhNMG9nS0VJQ0FnSUN2MV92SVJ3EAE!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CIHM0ogKEICAgICv1_vIRw%7C%7C?hl=en-US",
  },
  {
    author: "Kami Valdez",
    datePublished: "2024-12-13",
    rating: 5,
    text: "We have recently used Jaime and his team for several jobs. They have been very responsive and reliable. Great people to work with and have done a wonderful job! We will continue to work with them for other projects. Check out I Fixx handyman services LLC!",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sChdDSUhNMG9nS0VJQ0FnSUN2clpUdG5RRRAB!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CIHM0ogKEICAgICvrZTtnQE%7C%7C?hl=en-US",
  },
  {
    author: "Kim Pratt",
    datePublished: "2024-12-13",
    rating: 5,
    text: "I love my garage. Jaime did my walls and floor. We get so many compliments. Jaime has done several other jobs in our house.",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sChZDSUhNMG9nS0VJQ0FnSUN2cGZiSmV3EAE!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CIHM0ogKEICAgICvpfbJew%7C%7C?hl=en-US",
  },
  {
    author: "Russell Pratt",
    datePublished: "2024-12-13",
    rating: 5,
    text: "Great guy to work with since I moved here. Very knowledgeable of a lot of things .",
    reviewUrl: "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sChZDSUhNMG9nS0VJQ0FnSUN2cGF5d1lREAE!2m1!1s0x0:0xbf4589c0b6412214!3m1!1s2@1:CIHM0ogKEICAgICvpaywYQ%7C%7C?hl=en-US",
  },
];

/**
 * Lo que el sitio muestra y marca en el schema. Jaime Aguila es el unico dueno;
 * las resenas que nombran a Hamed (ex trabajador, salio en agosto de 2026) no se
 * publican en el sitio. No se editan ni se recortan: siguen completas en el perfil
 * de Google y en ALL_GOOGLE_REVIEWS. El conteo y el promedio no cambian porque
 * describen el perfil, no esta seleccion.
 */
export const GOOGLE_REVIEWS: GoogleReview[] = ALL_GOOGLE_REVIEWS.filter(
  (review) => !/hamed/i.test(review.text)
);

/**
 * Seleccion del hub de reparaciones: drywall y handyman.
 * Se excluyen a proposito las resenas que nombran a Hamed (ex trabajador, salio
 * en agosto de 2026) y cualquiera que mencione plomeria o electrico, servicios
 * que iFIXX no ofrece. Tampoco salen en la lista general (ver GOOGLE_REVIEWS).
 */
export const REPAIRS_FEATURED_AUTHORS = ['Zack Aschliman', 'Matt Crisp', 'Kami Valdez'] as const;

/**
 * Seleccion del hub de remodeling: bano, flooring, remodel y espacios exteriores.
 * Mismas exclusiones que arriba.
 */
export const REMODELING_FEATURED_AUTHORS = ['Mark Thomas', 'Danny Black', 'Kim Pratt'] as const;

/** Devuelve las resenas de esos autores, en el orden en que se piden. */
export const reviewsByAuthor = (authors: readonly string[]): GoogleReview[] =>
  authors
    .map((name) => GOOGLE_REVIEWS.find((review) => review.author === name))
    .filter((review): review is GoogleReview => review !== undefined);

/** "February 2026" — Google muestra fechas relativas; el sitio publica la real. */
export const reviewDateLabel = (iso: string): string =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
