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
    ...result,
    url,
    title: String(result.title || '').trim().slice(0, 220),
    snippet: String(result.snippet || '').trim().slice(0, 400),
    account: String(result.account || '').trim().slice(0, 120),
    kind: ['post', 'reel', 'profile'].includes(result.kind) ? result.kind : 'profile'
  };
}

export function dedupeResults(results = [], limit = 60) {
  const seen = new Set();
  const output = [];
  for (const raw of results) {
    const item = normalizeResult(raw);
    if (!item || seen.has(item.url)) continue;
    seen.add(item.url);
    output.push(item);
    if (output.length >= limit) break;
  }
  return output;
}
