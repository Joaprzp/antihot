import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

type Selectors = { price: string; title: string };

const EXTRACTION_PROMPT = `You are analyzing an ecommerce product page HTML to find CSS selectors for the product title and price.

Rules:
- Prefer selectors using data attributes, IDs, or semantic class names.
- The price selector should target the CURRENT/MAIN price element, not crossed-out original prices, installment prices, or shipping costs.
- The title selector should target the main product heading (h1, or the most prominent product name).
- For MercadoLibre: price is usually in a .andes-money-amount__fraction element, title in an h1.ui-pdp-title.
- Return ONLY a JSON object on a single line, no markdown, no explanation, no code blocks.

You MUST respond with exactly this format:
{"price": "your css selector", "title": "your css selector"}`;

export async function extractSelectors(
  html: string,
  model: "haiku" | "sonnet" = "haiku",
): Promise<Selectors> {
  const modelId =
    model === "haiku"
      ? "claude-haiku-4-5-20251001"
      : "claude-sonnet-4-20250514";

  const response = await anthropic.messages.create({
    model: modelId,
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

  // Find JSON object containing both "price" and "title" keys
  const jsonMatches = text.match(/\{[^{}]*"price"[^{}]*"title"[^{}]*\}|\{[^{}]*"title"[^{}]*"price"[^{}]*\}/);
  if (!jsonMatches) {
    throw new Error(`Failed to parse selector JSON from Claude. Response: ${text.slice(0, 200)}`);
  }

  const parsed = JSON.parse(jsonMatches[0]) as Selectors;
  if (!parsed.price || !parsed.title) {
    throw new Error(`Missing price or title in Claude response: ${jsonMatches[0]}`);
  }

  return parsed;
}
