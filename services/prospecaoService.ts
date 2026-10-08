// Serviço de prospecção ativa via SerpApi (Google Maps)

export interface OutscraperResult {
  name:         string;
  phone:        string;
  full_address: string;
  city:         string;
  state:        string;
  website?:     string;
  rating?:      number;
  reviews?:     number;
  description?: string;
  category?:    string;
  data_id?:     string; // usado para buscar avaliações
}

export interface ReviewSnippet {
  text:   string;
  rating: number;
  date:   string;
}

interface SerpLocalResult {
  title:        string;
  phone?:       string;
  address?:     string;
  website?:     string;
  rating?:      number;
  reviews?:     number;
  description?: string;
  type?:        string;
  data_id?:     string;
  place_id?:    string;
}

interface SerpReview {
  snippet?: string;
  rating?:  number;
  date?:    string;
}

export async function searchGoogleMaps(
  query: string,
  limit = 20
): Promise<OutscraperResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error("SERPAPI_API_KEY não configurada.");

  const params = new URLSearchParams({
    engine:  "google_maps",
    q:       query,
    api_key: apiKey,
    hl:      "pt",
    gl:      "br",
    type:    "search",
    num:     String(Math.min(limit, 20)),
  });

  const res = await fetch(`https://serpapi.com/search?${params}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SerpApi error ${res.status}: ${err}`);
  }

  const json = await res.json() as { local_results?: SerpLocalResult[] };
  const results = json.local_results ?? [];

  return results
    .filter((r) => r.phone)
    .slice(0, limit)
    .map((r) => {
      const addressParts = (r.address ?? "").split(",").map((s) => s.trim());
      const city  = addressParts[addressParts.length - 2] ?? "";
      const state = addressParts[addressParts.length - 1] ?? "";
      return {
        name:         r.title,
        phone:        r.phone ?? "",
        full_address: r.address ?? "",
        city,
        state,
        website:      r.website,
        rating:       r.rating,
        reviews:      r.reviews,
        description:  r.description,
        category:     r.type,
        data_id:      r.data_id ?? r.place_id,
      };
    });
}

export async function fetchReviews(dataId: string): Promise<ReviewSnippet[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey || !dataId) return [];

  try {
    const params = new URLSearchParams({
      engine:  "google_maps_reviews",
      data_id: dataId,
      api_key: apiKey,
      hl:      "pt",
      sort_by: "newestFirst",
    });

    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return [];

    const json = await res.json() as { reviews?: SerpReview[] };
    return (json.reviews ?? [])
      .filter((r) => r.snippet)
      .slice(0, 5)
      .map((r) => ({
        text:   r.snippet ?? "",
        rating: r.rating ?? 0,
        date:   r.date ?? "",
      }));
  } catch {
    return [];
  }
}
