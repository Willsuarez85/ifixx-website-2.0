# Tracking Implementation - IFixx Website 2.0

## Overview

Este documento describe la implementación de tracking (GTM + GA4) en el sitio IFixx Website 2.0 (Astro).

**Implementado por:** TrackMaster OS
**Fecha:** 2026-01-19
**GTM Version Live:** 6

---

## Google Tag Manager

### Container Info
- **Container ID:** GTM-5J8QWJG2
- **Account ID:** 6310359795

### Instalación

El snippet de GTM está inyectado en `src/layouts/BaseLayout.astro`:

```html
<!-- En <head> -->
<script is:inline>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-5J8QWJG2');
</script>

<!-- Después de <body> -->
<noscript>
  <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5J8QWJG2"
  height="0" width="0" style="display:none;visibility:hidden"></iframe>
</noscript>
```

---

## Google Analytics 4

### Property Info
- **Measurement ID:** G-KVM73G9H1L
- **Property ID:** 502991238

GA4 se carga automáticamente via GTM (no hay código directo de GA4 en el sitio).

---

## Eventos Trackeados

### 1. `generate_lead` - Conversión Primaria

**Trigger:** Envío exitoso de formulario
**Valor:** $150 USD

**Formularios con tracking:**
| Form ID | Form Name | Lead Type |
|---------|-----------|-----------|
| `service-estimate-form` | Service Estimate Form | `estimate_request` |
| `quick-estimate-form` | Quick Estimate Form | `quick_estimate` |
| `property-manager-form` | Property Manager Form | `property_manager` |
| `contact-form` | Contact Page Form | `contact_request` |

**Parámetros enviados:**
- `form_id` - ID del formulario
- `form_name` - Nombre del formulario
- `form_location` - Path de la página
- `lead_type` - Tipo de lead
- `value` - 150
- `currency` - USD

### 2. `click_to_call` - Conversión Secundaria

**Trigger:** Click en links `tel:`
**Valor:** $50 USD

**Parámetros:**
- `phone_number` - URL del click (ej: tel:+19803916833)
- `link_text` - Texto del enlace
- `value` - 50
- `currency` - USD

> Este evento se captura automáticamente via GTM. No requiere código en el sitio.

### 3. `click_to_email` - Conversión Secundaria

**Trigger:** Click en links `mailto:`
**Valor:** $25 USD

**Parámetros:**
- `email_address` - URL del click (ej: mailto:ifixx.hs@gmail.com)
- `link_text` - Texto del enlace
- `value` - 25
- `currency` - USD

> Este evento se captura automáticamente via GTM. No requiere código en el sitio.

### 4. `scroll_depth` - Engagement

**Trigger:** Scroll vertical a 25%, 50%, 75%, 90%

**Parámetros:**
- `percent_scrolled` - Porcentaje alcanzado
- `scroll_direction` - Dirección (vertical)

> Este evento se captura automáticamente via GTM. No requiere código en el sitio.

---

## DataLayer Implementation

### Formato Estándar para Formularios

Cada formulario debe enviar este evento al dataLayer cuando el envío sea exitoso:

```javascript
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  'event': 'form_submit',
  'form_id': 'form-id-here',
  'form_name': 'Form Name Here',
  'form_location': window.location.pathname,
  'lead_type': 'estimate_request' // o quick_estimate, property_manager, contact_request
});
```

### Archivos Modificados

| Archivo | Línea aprox. | Cambio |
|---------|--------------|--------|
| `src/layouts/BaseLayout.astro` | Head + Body | GTM snippet |
| `src/components/forms/ServiceForm.astro` | ~success handler | dataLayer.push |
| `src/components/forms/QuickEstimateCompact.astro` | ~success handler | dataLayer.push |
| `src/components/forms/PropertyManagerForm.astro` | ~success handler | dataLayer.push |
| `src/pages/contact.astro` | ~success handler | dataLayer.push (reemplazó gtag) |

---

## Agregar Tracking a Nuevos Formularios

Si agregas un nuevo formulario, sigue estos pasos:

1. **En el success handler del fetch**, agrega:

```javascript
if (result.success) {
  // ... tu código existente ...

  // Track form submission in GTM
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    'event': 'form_submit',
    'form_id': 'tu-form-id',
    'form_name': 'Tu Form Name',
    'form_location': window.location.pathname,
    'lead_type': 'tipo_de_lead'
  });
}
```

2. **Lead types válidos:**
   - `estimate_request` - Solicitud de estimado
   - `quick_estimate` - Estimado rápido
   - `property_manager` - Property manager
   - `contact_request` - Contacto general

3. **No necesitas hacer cambios en GTM** - El trigger ya captura todos los eventos `form_submit`.

---

## Testing

### GTM Preview Mode

1. Ir a https://tagmanager.google.com
2. Abrir container GTM-5J8QWJG2
3. Click en "Preview"
4. Navegar el sitio y verificar que los tags disparen

### GA4 DebugView

1. Ir a https://analytics.google.com
2. Admin → DebugView
3. Navegar el sitio y verificar eventos en tiempo real

### Verificar en Consola

```javascript
// Ver el dataLayer actual
console.log(window.dataLayer);

// Simular un evento de formulario
window.dataLayer.push({
  'event': 'form_submit',
  'form_id': 'test-form',
  'form_name': 'Test Form',
  'form_location': '/test',
  'lead_type': 'test'
});
```

---

## Links Útiles

- **GTM Container:** https://tagmanager.google.com/#/container/accounts/6310359795/containers/228499203/workspaces/7
- **GTM Live Version:** https://tagmanager.google.com/#/versions/accounts/6310359795/containers/228499203/versions/6
- **GA4 Property:** https://analytics.google.com/analytics/web/#/p502991238
- **GA4 Realtime:** https://analytics.google.com/analytics/web/#/p502991238/reports/intelligenthome

---

## Soporte

Para cambios en tracking o agregar nuevos eventos, contactar a:
- **TrackMaster OS** - Simplicity Agency

---

## Changelog

| Fecha | Versión GTM | Cambio |
|-------|-------------|--------|
| 2026-01-19 | v6 | Implementación inicial completa |
