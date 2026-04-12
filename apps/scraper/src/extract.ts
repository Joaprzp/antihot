import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

type Selectors = { price: string; title: string };

const EXTRACTION_PROMPT = `You are analyzing an ecommerce product page HTML to find CSS selectors for the product title and price.

Rules:
- Prefer selectors using data attributes, IDs, or semantic class names.
- The price selector should target the CURRENT/MAIN price element, not crossed-out original prices, installment prices, or shipping costs.
- The title selector should target the main product heading (h1, or the most prominent product name).
- Return ONLY a JSON object on a single line, no markdown, no explanation, no code blocks.

You MUST respond with exactly this format:
{"price": "your css selector", "title": "your css selector"}`;

export async function extractSelectors(html: string): Promise<Selectors> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nHTML (truncated):\n${html.slice(0, 60000)}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  console.log("Claude raw response:", text.slice(0, 500));

  const jsonMatches = text.match(
    /\{[^{}]*"price"[^{}]*"title"[^{}]*\}|\{[^{}]*"title"[^{}]*"price"[^{}]*\}/,
  );
  if (!jsonMatches) {
    console.error("Claude response did not contain valid selectors:", text.slice(0, 200));
    throw new Error("No se pudieron extraer selectores de la página");
  }

  const parsed = JSON.parse(jsonMatches[0]) as Selectors;
  if (!parsed.price || !parsed.title) {
    console.error("Claude returned incomplete selectors:", jsonMatches[0]);
    throw new Error("No se pudieron extraer selectores de la página");
  }

  return parsed;
}
