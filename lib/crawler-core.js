export const PROVIDERS = ['public-search'];

export function normalizeUrl(value) {
  try {
    const url = new URL(String(value));
    url.hash = '';
    url.search = '';
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString().toLowerCase();
  } catch { return null; }
}

export function normalizeResult(result = {}) {
  const url = normalizeUrl(result.url);
  if (!url) return null;
  return {
    url,
    title: String(result.title || '').trim().slice(0, 220),
    snippet: String(result.snippet || '').trim().slice(0, 400),
    account: String(result.account || '').trim().slice(0, 120),
    kind: ['post','reel','profile'].includes(result.kind) ? result.kind : 'profile',
    source: String(result.source || 'unknown').slice(0, 80)
  };
}

export function dedupeResults(results = [], limit = 60) {
  const seen = new Set(); const out = [];
  for (const result of results) {
    const item = normalizeResult(result);
    if (!item || seen.has(item.url)) continue;
    seen.add(item.url); out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export function summarizeProviders(outputs = []) {
  return outputs.map(x => ({
    provider: x.provider,
    count: Array.isArray(x.results) ? x.results.length : 0,
    pagesFetched: Number(x.pagesFetched || 0),
    timedOut: Boolean(x.timedOut),
    error: x.error || null
  }));
}

export function buildCrawlSummary(results, meta = {}) {
  const items = dedupeResults(results, Number(meta.limit || 60));
  return {
    count: items.length,
    pagesFetched: Number(meta.pagesFetched || 0),
    timedOut: Boolean(meta.timedOut),
    providers: meta.providers || PROVIDERS,
    providerSummary: summarizeProviders(meta.providerOutputs || []),
    results: items
  };
}
