/**
 * Service to interact with Elsevier Scopus API.
 *
 * Requires a Scopus API key from https://dev.elsevier.com — the user's own key,
 * configured in the app Settings (stored in localStorage). When no key is set,
 * the search is skipped quietly (returns []) so the app still works without it.
 */

const BASE_URL = "https://api.elsevier.com/content/search/scopus";

export interface ScopusPaper {
  title: string;
  creator: string;
  publicationName: string;
  coverDate: string;
  doi?: string;
  description?: string;
}

export async function searchScopus(query: string, apiKey?: string, view: string = 'standard'): Promise<ScopusPaper[]> {
  if (!apiKey) {
    console.info("Scopus API key belum dikonfigurasi di Pengaturan — lewati pencarian literatur.");
    return [];
  }
  try {
    // Construct query to find papers in the last 5 years
    const currentYear = new Date().getFullYear();
    const fullQuery = `TITLE-ABS-KEY(${query}) AND PUBYEAR > ${currentYear - 5}`;

    const url = new URL(BASE_URL);
    url.searchParams.append("apiKey", apiKey);
    url.searchParams.append("query", fullQuery);
    url.searchParams.append("count", "15"); // Get top 15 results
    url.searchParams.append("sort", "relevance");
    // 'standard' = gratis (field dasar), 'complete' = premium (termasuk abstract).
    const safeView = view === 'complete' ? 'COMPLETE' : 'STANDARD';
    url.searchParams.append("view", safeView);

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
