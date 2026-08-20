const MAX_RESULTS = 40;

function stripHtml(text = '') {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function decodeEntities(text = '') {
  return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function classify(url) {
  if (/\/reel(?:s)?\//i.test(url)) return 'reel';
  if (/\/p\//i.test(url) || /\/tv\//i.test(url)) return 'post';
  return 'profile';
}
function cleanInstagramUrl(href) {
  try {
    const u = new URL(href, 'https://html.duckduckgo.com');
    const candidate = u.hostname.includes('instagram.com') ? u.href : u.searchParams.get('uddg');
    if (!candidate) return null;
    const x = new URL(decodeURIComponent(candidate));
    if (!x.hostname.endsWith('instagram.com')) return null;
    return `https://www.instagram.com${x.pathname}`;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const q = String(req.query?.q || '').trim();
  const limit = Math.min(Math.max(Number(req.query?.limit || 20), 1), MAX_RESULTS);
  if (!q) return res.status(400).json({ error: 'Query is required' });

  const query = q.startsWith('@') ? `site:instagram.com/${q.slice(1)}` : `site:instagram.com ${q}`;
  try {
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InstagramCrawler/0.1)' }
    });
    if (!r.ok) throw new Error(`Search provider returned ${r.status}`);
    const html = await r.text();
    const results = [];
    const re = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = re.exec(html)) && results.length < limit) {
      const url = cleanInstagramUrl(match[1]);
      if (!url || results.some(x => x.url === url)) continue;
      const title = decodeEntities(stripHtml(match[2]));
      const next = html.slice(match.index, match.index + 5000);
      const sm = next.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
      const snippet = sm ? decodeEntities(stripHtml(sm[1])) : '';
      const path = new URL(url).pathname.split('/').filter(Boolean);
      results.push({
        title: title || 'Instagram content',
        snippet,
        url,
        account: path[0] ? `@${path[0]}` : '',
        kind: classify(url),
        source: 'public search index'
      });
    }
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ query: q, count: results.length, results });
  } catch (error) {
    console.error('instagram crawler error', error);
    return res.status(502).json({ error: 'Unable to reach the public search provider right now.' });
  }
}
