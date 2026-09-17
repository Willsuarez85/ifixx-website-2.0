/**
 * Puente entre el slug de la pagina y el `value` del selector de servicio del
 * formulario de estimado (QuickEstimateCompact -> SERVICE_TAGS en /api/lead.ts).
 *
 * El componente del formulario trae su propio mapa para los slugs viejos. Los
 * silos nuevos de 2026-09 (decks, screened-porches, deck-repair, fence-repair)
 * no estan ahi, y un slug sin equivalencia deja el selector sin preseleccionar,
 * asi que la pagina manda el valor ya traducido. Cuando el formulario incorpore
 * estos slugs, este mapa se puede vaciar sin romper nada: pasar 'deck' o 'fence'
 * ya coincide con una opcion real.
 */
const PAGE_SLUG_TO_FORM_VALUE: Record<string, string> = {
  decks: 'deck',
  'deck-repair': 'deck',
  'screened-porches': 'deck',
  'fence-repair': 'fence',
};

export const estimateFormSlug = (serviceSlug: string): string =>
  PAGE_SLUG_TO_FORM_VALUE[serviceSlug] ?? serviceSlug;
