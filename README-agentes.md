# Capa de agentes de IA

Describe la capa que deja al sitio legible y utilizable por asistentes de IA, y cómo instalarla en otro sitio.

## Qué es

Cinco piezas:

1. **Hechos publicados:** `/llms.txt` y `/llms-full.txt`, generados desde los archivos de hechos.
2. **API de pedidos:** `POST /api/agent/estimate` crea el contacto en el CRM (GHL) con la etiqueta de asistente.
3. **Victoria:** `POST /api/agent/ask` contesta solo con respuestas aprobadas; el modelo puede elegir un id aprobado, pero nunca redacta texto para el visitante.
4. **Filtro determinista:** valida los hechos y resúmenes publicados durante el build.
5. **Registro y frenos:** Supabase guarda conversaciones, pedidos y contadores de límites.

`GET /api/agent` devuelve la descripción de la API en JSON.

## Mapa de archivos

| Archivo | Qué hace |
|---|---|
| `src/lib/business-facts.ts` | Hechos de negocio: zonas (`SERVICE_AREAS`), horario, reseñas, año de fundación. **Específico del cliente.** |
| `src/lib/agent-facts.ts` | Marca (`BRAND`), las 28 respuestas aprobadas (`APPROVED_FAQ`), `VICTORIA_INTRO`, `FALLBACK_ANSWER`, `LIMITS`, `ASK_ANNOUNCED`, `AGENT_SERVICE_KEYS` (claves de servicio que acepta `estimate`; el resto queda como `other`), `AGENT_SITE_ID_DEFAULT`, `AGENT_ANTHROPIC_KEY_ENV`, generadores de llms y prompt de Victoria. **Específico del cliente.** |
| `src/lib/agent-guardrail.ts` | `checkAnswer(text, rules)` y `DEFAULT_RULES`: rechaza "licensed", plazos de obra, fechas u horas confirmadas, porcentajes y descuentos, garantías, oficios no ofrecidos, cifras fuera de la lista pública, zonas ajenas y guiones largos. |
| `src/lib/services-live.ts` | `liveServices()` lee la colección de servicios solo al generar los archivos llms; `ask` no carga `astro:content` en runtime. |
| `src/lib/lead-intake.ts` | Armado del contacto y envío al CRM (`submitLead`); lo comparten `/api/lead` y `/api/agent/estimate`. |
| `src/lib/agent-http.ts` | Respuestas JSON con CORS, `readJson` (tope de 16 KB), `clientIp`, `ipHash`, `normalizePhone`, `agentEnv` (variables). |
| `src/lib/agent-store.ts` | Supabase por fetch: `consumeRollingLimit` (ventana móvil exacta), reserva atómica de pedidos y `saveConversation`. Devuelve `null`/`false` cuando el almacén no confirma la operación. |
| `src/lib/victoria.ts` | Motor de respuestas de conjunto cerrado: `answer`, `exactMatch`, `classify`, `withIntro`. Modelo `claude-haiku-5-5` solo como clasificador. |
| `src/lib/business-schema.ts` | Nodo de negocio del JSON-LD, a partir de los hechos. |
| `src/pages/llms.txt.ts`, `src/pages/llms-full.txt.ts` | Sirven los textos de llms. |
| `src/pages/api/agent/index.ts`, `estimate.ts`, `ask.ts` | Los tres endpoints. Genéricos: todo texto del cliente viene de `agent-facts.ts`. |
| `supabase/migrations/2026-10-21-agent-layer.sql` | Tablas `agent_counters`, `agent_leads`, `agent_conversations` y función `bump_counter`. Idempotente. |
| `supabase/migrations/2026-10-22-agent-estimate-hardening.sql` | Reserva atómica y ligada al contenido para impedir dos escrituras concurrentes al CRM. |
| `supabase/migrations/2026-10-23-agent-rate-limit-rolling-window.sql` | Límites duros por ventana móvil exacta; una cerradura por sitio/clave hace atómicos el conteo y la inserción. |
| `scripts/test-victoria.mjs` | Preguntas trampa contra un servidor vivo. El bloque `SITE` de arriba es lo único que cambia por cliente. |

## Cómo contesta Victoria

Orden:

1. **Coincidencia exacta** con una pregunta aprobada (normalizada): se devuelve esa respuesta tal cual.
2. **Clasificador:** el modelo elige el id de la pregunta aprobada que corresponde, o `none` (también si la pregunta pide lo contrario). El texto sale siempre del archivo, nunca del modelo, y sin su "Yes." o "No." inicial, que solo vale para la pregunta exacta.
3. **Respaldo:** si el clasificador dice `none`, `FALLBACK_ANSWER` manda al teléfono de una persona. No se hace una segunda llamada ni se expone texto del modelo.

En el primer turno (historial vacío) toda respuesta lleva `VICTORIA_INTRO` delante (`withIntro`). Las respuestas son solo en inglés.

Sin modelo, la respuesta es siempre una aprobada o el respaldo, con `degraded: true` en el respaldo. Pasa en tres casos: falta la llave de Anthropic, el modelo falla (error, 429, 5xx o tiempo agotado) o el almacén está caído (sin contadores no se llama al modelo). Ningún caso devuelve 500, y la llamada completa se mantiene bajo 10 segundos. El historial que manda el visitante se trata como cita no verificada, nunca como turnos de Victoria.

## Variables de entorno

Los secretos se leen de `process.env` en cada petición, nunca de `import.meta.env` (Astro lo incrusta en el bundle).

| Variable | Uso | Estado en Vercel |
|---|---|---|
| `GHL_API_KEY`, `GHL_LOCATION_ID` | Escribir pedidos en el CRM | Puestas |
| `SUPABASE_URL` | URL del proyecto Supabase que usa la capa | **Falta. Poner antes del merge.** |
| `SUPABASE_SERVICE_KEY` | Llave de servicio de ese proyecto | **Falta. Poner antes del merge.** |
| `AGENT_SITE_ID` | Id del sitio en las filas (`ifixx`). Recomendada: si falta, se usa `AGENT_SITE_ID_DEFAULT` | Falta. Ponerla antes del merge. |
| `ANTHROPIC_API_KEY_IFIXX_SITE` | Llave con tope para Victoria (el nombre es `AGENT_ANTHROPIC_KEY_ENV`) | **Falta. Poner antes del merge.** |
| `AGENT_ASK_PREVIEW` | `1` enciende `ask` antes del anuncio (ver más abajo) | Solo en Preview o en local. En Production se ignora (`VERCEL_ENV=production`). |

Las cuatro que faltan van en Production y Preview. Los valores nunca van en archivos del repo: ni `.env` con secretos ni claves en el código.

Sin `SUPABASE_*`, o si Supabase no confirma un contador o una reserva, `estimate` responde 503 `temporarily_unavailable` con el teléfono y no toca el CRM. Victoria no usa el modelo sin contadores: solo respuestas aprobadas y respaldo.

## Crear la llave con tope

1. Consola de Anthropic: crear un workspace para el sitio (aquí **ifixx-site**).
2. Límite de gasto mensual del workspace: **$20**.
3. Crear una API key dentro de ese workspace.
4. Guardarla en el almacén de secretos del operador (nunca en el repo) con el nombre `ANTHROPIC_API_KEY_IFIXX_SITE`, sin espacio después del `=` si el almacén es un archivo de variables.
5. Agregarla a Vercel (Production y Preview) junto con las otras tres.

**Firewall de Vercel (opcional):** regla de rate limit sobre `/api/agent/*`, 60 peticiones por minuto por IP, acción deny. Hoy no existe ninguna regla; el freno son los contadores de Supabase.

## Límites (`LIMITS` en `agent-facts.ts`)

| Endpoint | Por IP por hora | Por sitio por día | Otros |
|---|---|---|---|
| `estimate` | 5 | 50 | Ventana móvil exacta; la misma solicitud normalizada en 10 minutos devuelve la misma `reference`; si la primera sigue en curso responde 202 para reintentar |
| `ask` | 20 | 500 | Pasado el tope diario: respaldo estático con `degraded: true` |

Cuerpo JSON máximo 16 KB (`bodyMaxBytes`). `question` hasta 1000 caracteres; `history` hasta 10 turnos de 1000; `message` hasta 2000 y sin URLs. Superar el límite por IP en `ask` responde 429 con el respaldo.

El formulario existente `/api/lead` conserva su flujo sin deadline nuevo. Solo `agent/estimate` pasa un presupuesto total de 8 segundos al CRM. Si el contacto queda confirmado pero el ruteo no termina, responde éxito con `routingPending: true` y un `nextStep` degradado que solo confirma que guardó el contacto e indica el teléfono publicado para asuntos urgentes. Registra `routing_status = 'incomplete'` en Supabase; un duplicado exacto vuelve a exponer ese estado y nunca repite la promesa de respuesta el mismo día. Si Supabase no confirma el registro final después de guardar el contacto, responde con `reconciliationPending: true`, usa el mismo `nextStep` degradado y conserva la reserva pendiente. Si el resultado del upsert es ambiguo, también mantiene la reserva pendiente para bloquear un duplicado inmediato.

Los campos libres de `agent/estimate` rechazan esquemas y dominios visibles, se normalizan como texto y se envían a campos de texto plano. La suposición operativa es que GHL y sus workflows no interpretan Project Notes, nombres o ciudad como HTML, Markdown ni plantillas; si eso cambia, el consumidor debe escapar el texto al renderizarlo.

**Compuerta `ASK_ANNOUNCED`** (`agent-facts.ts`): está en `false`, y mientras lo esté **el endpoint `ask` está apagado**. `POST /api/agent/ask` responde 404 `{ "error": "not_enabled" }` con el teléfono, sin tocar contadores ni modelo; `GET /api/agent` no lo describe; `/llms.txt` no lo enlaza y `/llms-full.txt` no publica ninguna de las 28 respuestas candidatas. Cambiarla a `true` enciende el endpoint y publica el conjunto aprobado. Se cambia solo cuando el cliente aprueba las 28 respuestas.

**Vista previa `AGENT_ASK_PREVIEW=1`:** enciende `ask` (y su descripción en `GET /api/agent`) sin cambiar `ASK_ANNOUNCED`, para probar antes del anuncio: en el entorno local, o como variable temporal de Vercel solo en Preview. Nunca en un archivo versionado. Se lee en cada petición (`askEnabled()`); cualquier otro valor la deja apagada, y con `VERCEL_ENV=production` se ignora aunque esté puesta. Los archivos llms siguen solo a `ASK_ANNOUNCED`.

## Instalar en otro cliente

1. Copiar la capa al repo del sitio (los archivos del mapa). Pasa por `business-facts.ts` y `agent-facts.ts`, que son lo único propio del cliente.
2. Llenar `business-facts.ts` y `agent-facts.ts`: marca, zonas, horario, cifras públicas, `VICTORIA_INTRO`, `FALLBACK_ANSWER` y las respuestas aprobadas (con ids `faq-NN`). Ajustar `DEFAULT_RULES` en `agent-guardrail.ts` a las reglas de lenguaje del cliente.
3. Cambiar `AGENT_SITE_ID_DEFAULT` y `AGENT_ANTHROPIC_KEY_ENV` (por ejemplo `ANTHROPIC_API_KEY_<SITE>_SITE`); crear su workspace y llave con tope como arriba.
4. Aplicar las migraciones SQL en orden. Las filas se separan por `site`, así que varios sitios pueden compartir el proyecto.
5. Variables en Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `AGENT_SITE_ID` nuevo, la llave del cliente y las del CRM.
6. Editar el bloque `SITE` de `scripts/test-victoria.mjs` (nombre, teléfono, intro, cifras permitidas, palabras prohibidas, preguntas trampa).
7. Correr las pruebas (ver abajo) y dejar `ASK_ANNOUNCED = false` hasta que el cliente apruebe las respuestas.

## Pruebas

```bash
npm test                                          # vitest: filtro, hechos, store, endpoints, Victoria, esquema
node scripts/test-attribution.mjs src/scripts/attribution.js   # atribución, debe seguir en verde
```

Preguntas trampa contra un servidor vivo. Para que ejerciten al modelo, el servidor necesita en su entorno (nunca en un archivo versionado) `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, la llave de Anthropic (`ANTHROPIC_API_KEY_IFIXX_SITE`, el nombre de `AGENT_ANTHROPIC_KEY_ENV`) y `AGENT_ASK_PREVIEW=1`. Sin el almacén, toda pregunta que no sea una respuesta aprobada sale como respaldo degradado por diseño, y `test-victoria` termina con código 1.

Una corrida con el almacén configurado **escribe filas reales** bajo `AGENT_SITE_ID`: usar un id de prueba (por ejemplo `<sitio>-dev`) para no mezclar el registro de producción. Límite: 20 preguntas por hora por IP, una corrida por hora; `--slow` espacia las preguntas.

```bash
# Terminal 1: exportar en el shell las cuatro variables y AGENT_SITE_ID=<sitio>-dev, luego
npm run dev
# Terminal 2
npm run test:victoria -- http://localhost:4321
npm run test:victoria -- https://<host-de-produccion> --slow   # solo con ASK_ANNOUNCED en true
```

Contra producción, `test-victoria` solo funciona cuando `ASK_ANNOUNCED` es `true`. Los despliegues Preview de Vercel de este proyecto están detrás del login de Vercel: una corrida contra un Preview necesita un bypass de protección.

Si el servidor no tiene `ask` encendido, el script sale con código 1 y el mensaje `ask endpoint not enabled: set AGENT_ASK_PREVIEW=1 or flip ASK_ANNOUNCED`, sin contar fallas.

Sale con código 1 si alguna respuesta rompe las reglas, si una cotización, reserva o zona ajena no deriva a una persona, o si más de la mitad llegó degradada. Degradada significa: almacén no configurado, llave de Anthropic ausente, modelo caído o tiempo agotado. Esa corrida no prueba nada.

## Dónde mirar el registro

En el proyecto Supabase de la capa, tablas `agent_conversations` (pregunta, respuesta, `matched_faq`, `flagged`, `violations`, tokens, `degraded`, filtradas por `site`) y `agent_leads` (referencias de pedidos, teléfono hasheado). Solo la llave de servicio las lee. La IP se guarda como hash de 16 caracteres.

`agent_leads` también es la bandeja durable de reconciliación. Incluye ruteos incompletos y reservas que siguen `pending` después de 10 minutos. **No hay reintento automático.** Antes de habilitar `agent/estimate` en Production debe existir una conciliación operativa que ejecute, atienda y marque fuera de este endpoint esta consulta:

```sql
select site, reference, contact_id, status, routing_status, created_at, completed_at
from public.agent_leads
where (status = 'completed' and routing_status = 'incomplete')
   or (status = 'pending' and created_at < now() - interval '10 minutes')
order by coalesce(completed_at, created_at) asc;
```

La migración agrega índices parciales para ambos casos. En una fila `pending`, buscar `Reference: XXXXXXXX` en Project Notes de GHL confirma si el contacto fue creado y permite terminar el ruteo; el teléfono no hace falta y no está guardado en claro. Una fila `pending` sin `contact_id` cuya referencia no aparece en ningún contacto es una reserva que nunca llegó al CRM (el almacén la confirmó después del tiempo de espera del endpoint, o falló la liberación tras un tope diario o un rechazo definitivo del CRM); se borra sin más. Hasta que el responsable confirme el proceso de conciliación, `routingPending` o `reconciliationPending` significan seguimiento manual pendiente, no una promesa de reintento.

Leads de asistentes en el CRM: contactos con la etiqueta `ai-assistant-lead`. El resumen diario de las conversaciones lo produce un script del operador, fuera de este repo.
