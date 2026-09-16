export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.warn(`[safeFetchJson] Non-JSON response from ${url} (HTTP ${res.status}):`, text.slice(0, 150));
      return {
        success: false,
        error: `Server returned non-JSON response (HTTP ${res.status})`,
      };
    }

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}`,
      };
    }

    return data;
  } catch (err: any) {
    console.error(`[safeFetchJson] Network or parse error for ${url}:`, err);
    return {
      success: false,
      error: err.message || 'Network request failed',
    };
  }
}
