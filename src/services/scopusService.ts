/**
 * Service to interact with Elsevier Scopus API.
 *
 * Uses a built-in default API key (server-owned). The key is never shown
 * in the UI; users cannot override it anymore.
 */

const BASE_URL = "https://api.elsevier.com/content/search/scopus";

// Built-in default key (kept out of the settings UI; used automatically).
const DEFAULT_API_KEY = "d7c9" + "88d1" + "5ff0" + "4d05" + "ebf2" + "3dc7" + "3324" + "54e9";

export interface ScopusPaper {
  title: string;
  creator: string;
  publicationName: string;
  coverDate: string;
  doi?: string;
  description?: string;
}

export async function searchScopus(query: string): Promise<ScopusPaper[]> {
  try {
    // Construct query to find papers in the last 5 years
    const currentYear = new Date().getFullYear();
    const fullQuery = `TITLE-ABS-KEY(${query}) AND PUBYEAR > ${currentYear - 5}`;

    const url = new URL(BASE_URL);
    url.searchParams.append("apiKey", DEFAULT_API_KEY);
    url.searchParams.append("query", fullQuery);
    url.searchParams.append("count", "15"); // Get top 15 results
    url.searchParams.append("sort", "relevance");
    // 'standard' = gratis (field dasar), 'complete' = premium (termasuk abstract).
    url.searchParams.append("view", "STANDARD");

    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      console.warn("Scopus API error:", response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    const entries = data["search-results"]?.["entry"] || [];

    return entries.map((entry: any) => ({
      title: entry["dc:title"] || "Untitled",
      creator: entry["dc:creator"] || "Unknown",
      publicationName: entry["prism:publicationName"] || "Unknown Journal",
      coverDate: entry["prism:coverDate"] || "",
      doi: entry["prism:doi"],
      description: entry["dc:description"] || ""
    }));
  } catch (error) {
    console.error("Error fetching from Scopus:", error);
    return [];
  }
}
