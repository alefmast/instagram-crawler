const REQUEST_TIMEOUT_MS = 5000;
const PAGE_SIZE = 30;

function decodeEntities(text = '') {
  return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function stripHtml(text = '') { return decodeEntities(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()); }
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
  return p[0] && !['p','reel','reels','tv','explore'].includes(p[0].toLowerCase()) ? `@${p[0]}` : '';
}
function queriesFor(q) {
  if (q.startsWith('@')) { const user=q.slice(1).trim(); return [`site:instagram.com/${user}`, `site:instagram.com "${user}"`]; }
  if (q.startsWith('#')) { const tag=q.slice(1); return [`site:instagram.com "${q}"`,`site:instagram.com/explore/tags/${tag}`,`site:instagram.com/reel "${q}"`,`site:instagram.com "${tag}"`]; }
  return [`site:instagram.com "${q}"`,`site:instagram.com/reel "${q}"`,`site:instagram.com/p "${q}"`,`site:instagram.com "${q}" Instagram`];
}
function collect(html, results, seen, limit) {
  const re=/<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi; let m;
  while ((m=re.exec(html)) && results.length<limit) {
    const url=cleanInstagramUrl(m[1]); if(!url||url==='https://www.instagram.com/'||seen.has(url)) continue;
    const title=stripHtml(m[2]); if(!title) continue;
    const next=html.slice(m.index,m.index+7000); const sm=next.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
    seen.add(url); results.push({title:title.slice(0,220),snippet:sm?stripHtml(sm[1]).slice(0,400):'',url,account:accountFromUrl(url),kind:classify(url),source:'public search index'});
  }
}
async function fetchPage(query, offset, headers) {
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try { const r=await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${offset}`,{headers,signal:controller.signal}); return r.ok?await r.text():null; }
  finally { clearTimeout(timer); }
}

export async function discover({ query, limit=20, maxPages=2 }) {
  const results=[], seen=new Set(), headers={'User-Agent':'Mozilla/5.0 (compatible; InstagramCrawler/0.7; +https://github.com/alefmast/instagram-crawler)','Accept':'text/html,application/xhtml+xml'};
  const searchedQueries=[]; let pagesFetched=0, timedOut=false;
  for(let page=0;page<maxPages&&results.length<limit;page++) {
    const batch=await Promise.all(queriesFor(query).map(async q=>{searchedQueries.push({query:q,page:page+1}); try{const html=await fetchPage(q,page*PAGE_SIZE,headers); if(html){pagesFetched++;collect(html,results,seen,limit);}}catch(e){if(e?.name==='AbortError')timedOut=true;}}));
    void batch;
  }
  return {results,pagesFetched,timedOut,searchedQueries};
}

export const name='public-search-index';
