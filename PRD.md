# AntiHot — PRD

**Versión:** 1.0
**Fecha:** Abril 2026

---

## Problema

El HotSale argentino genera la ilusión de grandes descuentos. Sin un precio de referencia previo, el usuario no puede saber si el descuento es real o inventado.

---

## Solución

AntiHot permite registrar los precios de productos *antes* del HotSale. Cuando el evento comienza, la app re-scrapea automáticamente los mismos productos y muestra si el precio bajó, subió, o no cambió.

---

## Usuarios

Cualquier consumidor argentino que compre en ecommerce durante el HotSale.

---

## Flujo principal

1. El usuario entra y empieza sin cuenta (anónimo) o vincula su cuenta de Google.
2. Llega a un dashboard vacío con un campo para pegar una URL de producto.
3. Pega la URL (Fravega, Cetrogar, Naldo, etc. — MercadoLibre no soportado).
4. La app scrapea esa URL (datos estructurados primero, Playwright + Claude como fallback) y guarda el snapshot.
5. El producto aparece en su lista con nombre, precio actual y fecha de registro.
6. Un cron job diario (03:00 AM Argentina) re-scrapea todos los productos con datos estructurados.
7. El usuario ve el delta: ✅ bajó / ⚠️ subió / ➖ igual.

---

## Stack

Bun + React 19 + Vite 8 + Convex + TanStack Router + Tailwind 4 + Radix UI. Scraping con datos estructurados (JSON-LD, `__NEXT_DATA__`) como primera opción; Playwright + Claude Haiku via Anthropic API como fallback para sitios sin datos estructurados. Hono server en Railway (Railpack), cron jobs en Convex scheduled functions.

---

## Scraping — estrategia

1. Se intenta un fetch HTTP plano y se buscan datos estructurados: JSON-LD (`<script type="application/ld+json">`), Next.js `__NEXT_DATA__`, o patrones inline de Schema.org `@type:Product`. Esto cubre la mayoría de ecommerce argentinos (Fravega, Cetrogar, Naldo) sin necesidad de Playwright ni Claude.
2. Si no hay datos estructurados, se lanza Playwright (con stealth plugin) para renderizar la página.
3. Se busca en el cache de selectores CSS por dominio. Si hay selectores cacheados, se usan directamente.
4. Si no hay cache, se envía el HTML a Claude Haiku para extraer selectores CSS estables para precio y título.
5. Se persisten los selectores en el cache a nivel dominio (compartido entre todos los usuarios).
6. En el re-scrape diario solo se usan datos estructurados (sin Playwright ni Haiku).

**Modelo de costos:** La mayoría de las tiendas tienen datos estructurados → costo cero de Claude. Haiku solo se usa para sitios sin datos estructurados. El costo escala por cantidad de tiendas sin Schema.org, no por cantidad de usuarios.

**Limitación conocida:** MercadoLibre no está soportado — bloquea browsers headless y su API requiere OAuth de usuario.

---

## Cron diario — estrategia de escala

El cron diario (03:00 AM Argentina / 06:00 UTC) re-scrapea todos los productos registrados.

**Optimizaciones:**
1. **Solo datos estructurados** — no se usa Playwright ni Claude en el re-scrape. URLs sin datos estructurados se saltan.
2. **Dedup por URL** — si múltiples usuarios trackean el mismo producto, se scrapea una sola vez y se escribe el snapshot a todos.
3. **Batches escalonados** — 50 productos por batch, 500ms entre dominios, 2s entre batches.
4. **Upsert** — actualiza snapshots existentes en lugar de crear duplicados.
5. **Aislamiento de errores** — un URL fallido no rompe el job completo.

**Proyección a escala:** 3.000 usuarios × 5 productos = 15.000 productos. Con datos estructurados (~1-2s cada uno, batches de 50) se resuelve en ~10 minutos. Costo de Claude: cero. Costo de Railway: mínimo (solo HTTP fetches, sin Chromium).

**Nota:** Actualmente corre diario para dar valor continuo a usuarios tempranos. Cuando el volumen crezca, se puede cambiar a event-based (solo noches de HotSale).

---

## MVP — fuera de scope

- Historial de precios más allá de las dos fechas (pre y durante HotSale).
- Alertas push / email.
- Comparación entre tiendas del mismo producto.
- App mobile nativa.

---

## Riesgos

- Los sitios target pueden bloquear scrapers → mitigar con User-Agent realista y delays entre requests.
- Selectores rotos si el sitio cambia su HTML antes del HotSale → el auto-healing con Claude los resuelve.
- HotSale tiene fecha fija → si el cron falla esa noche, el producto pierde su utilidad ese año.