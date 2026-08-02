/**
 * Datos de negocio verificables que se publican en el sitio.
 *
 * Regla: cualquier cifra que el sitio afirme sobre iFIXX vive aqui, en un solo
 * lugar. Antes estaba repetida como literal en el JSON-LD de dos layouts, en
 * cuatro paginas de emergency-services y en el TrustBar, y los numeros habian
 * divergido entre si.
 *
 * GOOGLE_REVIEW_COUNT y GOOGLE_RATING alimentan el aggregateRating del schema.
 * Google exige que ese numero coincida con las resenas reales del negocio.
 *
 * Fuente: Google Business Profile de iFIXX, leido el 2026-08-02.
 * Al actualizarlo, cambiar tambien la fecha de esta linea.
 */
export const GOOGLE_REVIEW_COUNT = 16;
export const GOOGLE_RATING = 5.0;

/** Texto listo para copy visible: "16 reviews" / "1 review". */
export const googleReviewLabel = (): string =>
  `${GOOGLE_REVIEW_COUNT} ${GOOGLE_REVIEW_COUNT === 1 ? 'review' : 'reviews'}`;
