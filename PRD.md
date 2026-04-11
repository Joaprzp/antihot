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

Bun + React 19 + Vite 8 + Convex + TanStack Router + Tailwind 4 + Radix UI. Scraping con Playwright en Railway VPS (Hono server, Docker), cron jobs en Convex scheduled functions. Claude Haiku via Anthropic API para extracción de selectores CSS (precio y título) desde el HTML crudo, con fallback a Claude Sonnet para auto-healing.

---

## Scraping — estrategia

1. Playwright fetchea el HTML de la URL pegada por el usuario.
2. Se busca en el cache de selectores por dominio. Si hay selectores cacheados para ese dominio, se usan directamente (sin llamada a Claude).
3. Si no hay cache, se envía el HTML a Claude Haiku con el prompt: *"Identificá el selector CSS más estable para el precio del producto y para el título."*
4. Se persisten los selectores en el cache a nivel dominio (un solo set de selectores por tienda, compartido entre todos los usuarios).
5. En el re-scrape del HotSale se reutilizan los selectores cacheados. Si fallan, se escala a Claude Sonnet para auto-healing con el nuevo HTML y se actualiza el cache.

**Modelo de costos:** Haiku por defecto (~10x más barato que Sonnet). Sonnet solo como fallback para auto-healing. Con cache por dominio, el costo escala por cantidad de tiendas, no por cantidad de usuarios.

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