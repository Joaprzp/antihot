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

Mismo stack estándar de Bllob: Bun + React 19 + Vite + Convex + TanStack Router + Tailwind 4 + Shadcn. Scraping con Playwright en Railway VPS, cron job nativo de Railway o Convex scheduled functions. Claude API para extracción de selectores (precio y título) desde el HTML crudo.

---

## Scraping — estrategia

1. Playwright fetchea el HTML de la URL pegada por el usuario.
2. Se envía el HTML a Claude con el prompt: *"Identificá el selector CSS más estable para el precio del producto y para el título. Explicá por qué es estable."*
3. Se persiste el selector junto con el producto en Convex.
4. En el re-scrape del HotSale se reutiliza ese selector; si falla, se llama a Claude de nuevo con el nuevo HTML (auto-healing).

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