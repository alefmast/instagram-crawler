const MAX_RESULTS = 40;

function escapeHtml(text = '') {
  return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function classify(url) {
  if (/\/reel(?:s)?\//i.test(url)) return 'reel';
  if (/\/p\//i.test(url) || /\/tv\//i.test(url)) return 'post';
  return 'profile';
}

function cleanInstagramUrl(href) {
  try {
    const u = new URL(href, 'https://www.google.com');
    if (u.hostname.includes('instagram.com')) return `https://www.instagram.com${u.pathname}`;
    // DuckDuckGo may return a redirect wrapper.
    const uddg = u.searchParams.get('uddg');
    if (uddg) {
      const decoded = decodeURIComponent(uddg);
      const x = new URL(decoded);
      if (x.hostname.includes('instagram.com')) return `https://www.instagram.com${x.pathname}`;
    }
  } catch {}
  return null;
}

function textBetween(html, start, end) {
  const a = html.indexOf(start);
  if (a < 0) return '';
  const b = html.indexOf(end, a + start.length);
  return b < 0 ? '' : html.slice(a + start.length, b);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const q = String(req.query?.q || '').trim();
  const limit = Math.min(Math.max(Number(req.query?.limit || 20), 1), MAX_RESULTS);
  if (!q) return res.status(400).json({ error: 'Query is required' });

  const query = q.startsWith('@')
    ? `site:instagram.com/${q.slice(1)} Instagram`
    : `site:instagram.com ${q}`;

  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InstagramCrawler/0.1)' }
    });
    if (!r.ok) throw new Error(`Search provider returned ${r.status}`);
    const html = await r.text();
    const results = [];
    const blockRe = /<div class="result results_links results_links_deep web-result[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
    let m;
    while ((m = blockRe.exec(html)) && results.length < limit) {
      const block = m[1];
      const rawHref = textBetween(block, '<a rel="nofollow" class="result__a" href="', '"');
      const href = cleanInstagramUrl(rawHref);
      if (!href || results.some(x => x.url === href)) continue;
      const titleRaw = textBetween(block, '<a rel="nofollow" class="result__a" href="' + rawHref + '">', '</a>') || '';
      const snippetRaw = textBetween(block, '<a class="result__snippet"', '</a>') || '';
      const title = escapeHtml(titleRaw.replace(/<[^>]+>/g, '').trim());
      const snippet = escapeHtml(snippetRaw.replace(/<[^>]+>/g, '').trim());
      const path = new URL(href).pathname.split('/').filter(Boolean);
      const account = path[0] ? `@${path[0]}` : '';
      results.push({ title, snippet, url: href, account, kind: classify(href), source: 'public search index' });
    }

    // Fallback parser for minor provider markup changes.
    if (!results.length) {
      const anchors = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
      for (const a of anchors) {
        if (results.length >= limit) break;
        const href = cleanInstagramUrl(a[1]);
        if (!href || results.some(x => x.url === href)) continue;
        const title = escapeHtml(a[2].replace(/<[^>]+>/g, '').trim());
        if (!title) continue;
        const path = new URL(href).pathname.split('/').filter(Boolean);
        results.push({ title, snippet: '', url: href, account: path[0] ? `@${path[0]}` : '', kind: classify(href), source: 'public search index' });
      }
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ query: q, count: results.length, results });
  } catch (error) {
    console.error('instagram crawler error', error);
    return res.status(502).json({ error: 'Unable to reach the public search provider right now.' });
  }
}
