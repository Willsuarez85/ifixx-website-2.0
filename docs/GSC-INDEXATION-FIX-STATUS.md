# GSC Indexation Fix - Estado del Proyecto

**Fecha:** 2026-01-21
**Sesión:** Implementación de contenido único para páginas city+service
**Problema:** 163 páginas "Discovered - Currently Not Indexed" en GSC (6% tasa de indexación)

---

## Resumen del Problema

Google descubrió las 104 páginas city+service pero no las indexó debido a:
- Contenido duplicado (~85% idéntico entre páginas)
- Thin content (solo cambiaba nombre de ciudad)
- Falta de diferenciación significativa

---

## Solución Implementada

### Sistema de Contenido Único

Se creó una nueva colección `city-service` que permite agregar contenido único por cada combinación ciudad+servicio:

- **localIntro**: Introducción específica (150-200 palabras)
- **projectHighlight**: Caso de estudio con proyecto real
- **localBullets**: Puntos específicos para esa área
- **localFaqs**: FAQs locales (permisos, regulaciones, etc.)
- **localInfo**: Info de permisos/regulaciones/HOA
- **seo**: Override de title/description

Las páginas sin contenido único siguen funcionando con el contenido genérico.

---

## Progreso Completado

### Infraestructura (100%)
- [x] Nueva colección `city-service` en `src/content/config.ts`
- [x] Página `[citySlug]/[serviceSlug].astro` modificada
- [x] Guía de creación en `docs/CONTENT-CREATION-GUIDE.md`

### Contenido Creado (12 de 104 páginas = 12%)

| Ciudad | Kitchen | Bathroom | Plumbing | Painting | Total |
|--------|---------|----------|----------|----------|-------|
| Charlotte | ✅ | ✅ | ✅ | ✅ | 4/4 |
| Ballantyne | ✅ | ✅ | ✅ | ✅ | 4/4 |
| Matthews | ✅ | ✅ | ✅ | ✅ | 4/4 |
| Pineville | ❌ | ❌ | ❌ | ❌ | 0/4 |
| Mint Hill | ❌ | ❌ | ❌ | ❌ | 0/4 |
| Rock Hill | ❌ | ❌ | ❌ | ❌ | 0/4 |
| Monroe | ❌ | ❌ | ❌ | ❌ | 0/4 |
| Waxhaw | ❌ | ❌ | ❌ | ❌ | 0/4 |

**Servicios adicionales por crear (por ciudad):**
- electrical
- carpentry
- doors-windows
- flooring-installation
- tv-mounting
- furniture-assembly
- quick-fix
- outdoor-living
- basement-finishing

---

## Commits Realizados

```
811ee1e Add unique content for Matthews city+service pages
c2f4a8f Add unique content system for city+service pages to fix GSC indexation
```

---

## Próximos Pasos

### Inmediato (Post-Sesión)
1. [ ] Solicitar re-indexación en GSC para las 12 URLs con contenido único:
   - Charlotte: /charlotte/kitchen-remodeling/, bathroom-remodeling/, plumbing/, painting/
   - Ballantyne: /ballantyne/kitchen-remodeling/, bathroom-remodeling/, plumbing/, painting/
   - Matthews: /matthews/kitchen-remodeling/, bathroom-remodeling/, plumbing/, painting/

### Próxima Sesión
2. [ ] Crear contenido para Pineville (4 páginas)
3. [ ] Crear contenido para Mint Hill (4 páginas)
4. [ ] Crear contenido para Rock Hill (4 páginas)
5. [ ] Crear contenido para Monroe (4 páginas)
6. [ ] Crear contenido para Waxhaw (4 páginas)

### Opcional (Más Servicios)
7. [ ] Expandir a más servicios por ciudad (electrical, carpentry, etc.)

---

## Archivos Clave

```
src/content/config.ts                    # Colección city-service (líneas 73-123)
src/pages/[citySlug]/[serviceSlug].astro # Página que usa contenido único
src/content/city-service/                # Directorio con contenido único
docs/CONTENT-CREATION-GUIDE.md           # Guía para crear más contenido
```

---

## Métricas Objetivo

| Métrica | Actual | 30 días | 60 días | 90 días |
|---------|--------|---------|---------|---------|
| Páginas con contenido único | 12 | 32 | 52 | 80+ |
| Páginas indexadas | ~10 | 25 | 45 | 65+ |
| Tasa de indexación | 6% | 15% | 30% | 45%+ |

---

## Notas

- Cada archivo de contenido tiene ~1000 palabras únicas (~40% del contenido de la página)
- El sistema es incremental: páginas sin contenido único siguen funcionando
- Priorizar servicios de alto valor: kitchen, bathroom, plumbing, painting
- Después de crear contenido, siempre solicitar re-indexación en GSC

---

*Última actualización: 2026-01-21*
