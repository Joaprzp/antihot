let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.MELI_CLIENT_ID;
  const clientSecret = process.env.MELI_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("MELI_CLIENT_ID and MELI_CLIENT_SECRET are required");
  }

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`ML OAuth failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  // Cache with 5 min buffer before expiry
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  console.log("ML access token refreshed");
  return cachedToken.token;
}

export function extractMlaId(url: string): string | null {
  // Patterns:
  // /p/MLA48922190
  // /MLA-1234567-...
  const match = url.match(/MLA[- ]?(\d+)/i);
  return match ? `MLA${match[1]}` : null;
}

export function isMercadoLibreUrl(url: string): boolean {
  return url.includes("mercadolibre.com");
}

export async function scrapeFromMeliApi(
  url: string,
): Promise<{ title: string; price: number } | null> {
  const mlaId = extractMlaId(url);
  if (!mlaId) {
    console.log("Could not extract MLA ID from URL:", url);
    return null;
  }

  const token = await getAccessToken();

  const response = await fetch(
    `https://api.mercadolibre.com/items/${mlaId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    console.log(`ML API returned ${response.status} for ${mlaId}`);
    return null;
  }

  const data = (await response.json()) as {
    title: string;
    price: number;
    currency_id: string;
  };

  if (!data.title || !data.price) {
    console.log("ML API response missing title or price:", data);
    return null;
  }

  console.log(`ML API succeeded: "${data.title}" @ ${data.price} ${data.currency_id}`);
  return { title: data.title, price: data.price };
}
