import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

type Selectors = { price: string; title: string };

const EXTRACTION_PROMPT = `You are analyzing an ecommerce product page HTML. Extract the most stable CSS selectors for the product title and price.

Rules:
- Prefer selectors using data attributes, IDs, or semantic class names over positional selectors.
- The price selector should target the CURRENT/MAIN price, not crossed-out original prices or installment prices.
- The title selector should target the main product heading.
- Return ONLY valid JSON, no explanation.

Return format:
{"price": "css selector for price", "title": "css selector for title"}`;

export async function extractSelectors(
  html: string,
  model: "haiku" | "sonnet" = "haiku",
): Promise<Selectors> {
  const modelId =
    model === "haiku"
      ? "claude-haiku-3-5-20241022"
      : "claude-sonnet-4-5-20250414";

  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nHTML:\n${html.slice(0, 50000)}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error("Failed to parse selector JSON from Claude");

  const parsed = JSON.parse(match[0]) as Selectors;
  if (!parsed.price || !parsed.title) {
    throw new Error("Missing price or title selector in Claude response");
  }

  return parsed;
}
