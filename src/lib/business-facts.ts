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
 * Fuente: Google Business Profile de iFIXX, leido el 2026-09-17 (16 resenas,
 * promedio 5.0). Crudo en 01-clients/ifixx/resources/2026-09-17-gbp-reviews.json.
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

/**
 * ZONAS DE SERVICIO: las diez que el sitio publica, y nada mas.
 *
 * Son exactamente las diez que tienen hub en /service-areas/. La lista se mantiene
 * pegada a esos hubs: si una ciudad no tiene pagina, no va aqui, y al reves.
 *
 * Historia: el schema llego a declarar once ciudades sin pagina, /contact enumeraba
 * Rock Hill y Monroe, y las paginas de emergency-services ofrecian Huntersville,
 * Cornelius, Davidson e Indian Trail. Se recorto a seis el 2026-09-17. El 2026-09-19
 * William reabrio cuatro zonas con pagina propia (Waxhaw, Weddington, Fort Mill SC e
 * Indian Land SC), que son las que Google Ads ya estaba comprando sin destino local.
 *
 * Cada entrada lleva su estado porque dos de ellas son de Carolina del Sur: el texto
 * visible decia "{ciudad}, NC" cableado y habria publicado "Fort Mill, NC".
 *
 * Los barrios de Charlotte (Dilworth, Myers Park, SouthPark) no son ciudades y
 * no van en areaServed; viven en el contenido de cada hub.
 */
export const SERVICE_AREAS = [
  { name: 'South Charlotte', state: 'NC' },
  { name: 'Ballantyne', state: 'NC' },
  { name: 'Matthews', state: 'NC' },
  { name: 'Mint Hill', state: 'NC' },
  { name: 'Pineville', state: 'NC' },
  { name: 'Waxhaw', state: 'NC' },
  { name: 'Weddington', state: 'NC' },
  { name: 'Fort Mill', state: 'SC' },
  { name: 'Indian Land', state: 'SC' },
] as const;

/** Texto listo para copy visible: "Fort Mill, SC". */
export const serviceAreaLabels = (): string[] =>
  SERVICE_AREAS.map(({ name, state }) => `${name}, ${state}`);

/** areaServed listo para JSON-LD. */
export const areaServedSchema = () =>
  SERVICE_AREAS.map(({ name, state }) => ({ '@type': 'City', name, addressRegion: state }));

/**
 * HORARIO: Lun a Sab, 8:30 AM a 5:30 PM (CONTEXT.md, confirmado por Jaime/William
 * el 2026-07-07). El schema publicaba Lun-Vie 07:00-18:00 y Sab 08:00-14:00, que
 * no coincidia con ningun horario real ni con el texto visible del sitio.
 */
export const OPENING_TIME = '08:30';
export const CLOSING_TIME = '17:30';

/** openingHoursSpecification listo para JSON-LD. */
export const openingHoursSchema = () => [
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: OPENING_TIME,
    closes: CLOSING_TIME,
  },
];

/** Texto listo para copy visible. */
export const BUSINESS_HOURS_LABEL = 'Monday - Saturday: 8:30am - 5:30pm';
export const BUSINESS_HOURS_SHORT = 'Mon - Sat, 8:30am - 5:30pm';
