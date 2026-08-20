const MAX_RESULTS = 60;

function stripHtml(text = '') {
  return decodeEntities(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}
function decodeEntities(text = '') {
  return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function classify(url) {
  const path = new URL(url).pathname.toLowerCase();
  if (/\/(reel|reels|tv)\//.test(path)) return 'reel';
  if (/\/p\//.test(path)) return 'post';
  return 'profile';
}
function cleanInstagramUrl(href) {
  try {
    const u = new URL(href, 'https://html.duckduckgo.com');
    const candidate = u.hostname.includes('instagram.com') ? u.href : u.searchParams.get('uddg');
    if (!candidate) return null;
    const x = new URL(decodeURIComponent(candidate));
    if (!x.hostname.toLowerCase().endsWith('instagram.com')) return null;
    const path = x.pathname.replace(/\/+$/, '') || '/';
    return `https://www.instagram.com${path}/`;
  } catch { return null; }
}
function accountFromUrl(url) {
  const p = new URL(url).pathname.split('/').filter(Boolean);
  return p[0] && !['p', 'reel', 'reels', 'tv', 'explore'].includes(p[0].toLowerCase()) ? `@${p[0]}` : '';
}
function queriesFor(q) {
  if (q.startsWith('@')) {
    const user = q.slice(1).trim();
    return [`site:instagram.com/${user}`, `site:instagram.com "${user}"`];
  }
  if (q.startsWith('#')) {
    const tag = q.slice(1);
    return [`site:instagram.com "${q}"`, `site:instagram.com/explore/tags/${tag}`, `site:instagram.com/reel "${q}"`, `site:instagram.com "${tag}"`];
  }
  return [`site:instagram.com "${q}"`, `site:instagram.com/reel "${q}"`, `site:instagram.com/p "${q}"`, `site:instagram.com "${q}" Instagram`];
}
function collect(html, results, seen, limit) {
  const re = /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && results.length < limit) {
    const url = cleanInstagramUrl(m[1]);
    if (!url || url === 'https://www.instagram.com/' || seen.has(url)) continue;
    const title = stripHtml(m[2]);
    if (!title) continue;
    const next = html.slice(m.index, m.index + 6000);
    const sm = next.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
    const snippet = sm ? stripHtml(sm[1]) : '';
    seen.add(url);
    results.push({ title: title.slice(0, 220), snippet: snippet.slice(0, 400), url, account: accountFromUrl(url), kind: classify(url), source: 'public search index' });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const q = String(req.query?.q || '').trim();
  const limit = Math.min(Math.max(Number(req.query?.limit || 20), 1), MAX_RESULTS);
  if (!q) return res.status(400).json({ error: 'Query is required' });
  const results = [];
  const seen = new Set();
  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; InstagramCrawler/0.3)' };
  const searchedQueries = [];

  try {
    for (const query of queriesFor(q)) {
      if (results.length >= limit) break;
      searchedQueries.push(query);
      const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { headers });
      if (!r.ok) continue;
      collect(await r.text(), results, seen, limit);
    }
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ query: q, count: results.length, searchedQueries, results });
  } catch (error) {
    console.error('instagram crawler error', error);
    return res.status(502).json({ error: 'Unable to reach the public search provider right now.' });
  }
}
