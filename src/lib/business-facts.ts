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
export const GOOGLE_REVIEW_COUNT: number = 16;
export const GOOGLE_RATING = 5.0;

/** Texto listo para copy visible: "16 reviews" / "1 review". */
export const googleReviewLabel = (): string =>
  `${GOOGLE_REVIEW_COUNT} ${GOOGLE_REVIEW_COUNT === 1 ? 'review' : 'reviews'}`;

/**
 * Ano de fundacion. Es el que el sitio ya publicaba como `foundingDate` en el
 * JSON-LD de todas las paginas y en /about; el footer y la pagina de painting
 * decian 2021 y se contradecian con el schema de su propia pagina.
 */
export const FOUNDING_YEAR = 2019;

/** Texto listo para copy visible: "since 2019". */
export const sinceFoundingLabel = (): string => `since ${FOUNDING_YEAR}`;

/**
 * CONTEO DE PROYECTOS: deliberadamente ausente.
 *
 * El sitio publicaba "500+ projects" como total de la empresa y, al mismo
 * tiempo, sub-totales por servicio que sumaban 2.050+ (500+ drywall, 400+
 * painting, 200+ bathroom, 150+ kitchen, 200+ furniture assembly, 500+
 * quick-fix, 100+ floors), mas un "100+ Remodels Completed" que no cabe dentro
 * de sus propios 150+ kitchen y 200+ bathroom. Ninguna de esas cifras tiene
 * respaldo en el repo y no hay herramienta del loop que las mida.
 *
 * Hasta que Jaime o William den el numero real, el sitio hace la afirmacion
 * cualitativa (que no exige respaldo numerico) en vez de publicar una cifra
 * inventada. Si llega el dato, se anade aqui como PROJECT_COUNT y se vuelve a
 * cablear desde este archivo, no como literal repetido.
 */
