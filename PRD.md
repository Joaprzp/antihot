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

1. El usuario entra y hace sign in con Google.
2. Llega a un dashboard vacío con un campo para pegar una URL de producto.
3. Pega la URL (Fravega, MercadoLibre, Naldo, etc.).
4. La app scrapea esa URL con Playwright, extrae el título y el precio usando Claude para identificar los selectores correctos, y guarda el snapshot.
5. El producto aparece en su lista con nombre, precio actual y fecha de registro.
6. En la madrugada del HotSale, un cron job re-scrapea todos los productos registrados.
7. El usuario entra el día del evento y ve el delta: ✅ bajó / ⚠️ subió / ➖ igual.

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
6. En el re-scrape del HotSale se reutilizan los mismos caminos (datos estructurados → cache → Haiku).

**Modelo de costos:** La mayoría de las tiendas tienen datos estructurados → costo cero de Claude. Haiku solo se usa para sitios sin datos estructurados. El costo escala por cantidad de tiendas sin Schema.org, no por cantidad de usuarios.

**Limitación conocida:** MercadoLibre no está soportado — bloquea browsers headless y su API requiere OAuth de usuario.

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