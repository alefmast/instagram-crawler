import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [limit, setLimit] = useState(20);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const visible = useMemo(() => results.filter(r => type === 'all' || r.kind === type), [results, type]);

  async function search(e) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true); setError(''); setSearched(true); setResults([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results || []);
      if (!data.results?.length) setError('No publicly indexed Instagram results were found. Try a broader query.');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally { setLoading(false); }
  }

  async function copyLink(url) {
    try { await navigator.clipboard.writeText(url); } catch {}
  }

  function exportCsv() {
    if (!visible.length) return;
    const head = ['Title','URL','Account','Type','Source'];
    const esc = v => `"${String(v ?? '').replaceAll('"','""')}"`;
    const csv = [head, ...visible.map(r => [r.title,r.url,r.account,r.kind,r.source])].map(row => row.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `instagram-results-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  return <div className="app">
    <header className="topbar"><div className="brand"><span className="mark">IC</span><div><strong>Instagram Crawler</strong><small>Public content discovery</small></div></div><div className="status"><span/> Online</div></header>
    <main>
      <section className="hero"><div className="eyebrow">INSTAGRAM DISCOVERY ENGINE</div><h1>Find the Instagram links<br/><em>that matter.</em></h1><p>Search public, indexed Instagram content by keyword, hashtag or account and collect direct links in one place.</p>
        <form onSubmit={search} className="searchbox"><div className="searchicon">⌕</div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try: صحنه، #music, @account" autoFocus/><select value={limit} onChange={e=>setLimit(Number(e.target.value))}><option value="10">10</option><option value="20">20</option><option value="40">40</option><option value="60">60</option></select><button disabled={loading}>{loading ? 'Searching…' : 'Search'}</button></form>
        <div className="chips"><button type="button" onClick={()=>setQuery('#صحنه')}>#صحنه</button><button type="button" onClick={()=>setQuery('music iran')}>music iran</button><button type="button" onClick={()=>setQuery('@filimo')}>@filimo</button></div>
      </section>
      <section className="results-section"><div className="results-head"><div><div className="section-label">RESULTS</div><h2>{searched ? `${visible.length} results` : 'Ready to search'}</h2></div><div className="actions"><select value={type} onChange={e=>setType(e.target.value)}><option value="all">All content</option><option value="post">Posts</option><option value="reel">Reels</option><option value="profile">Profiles</option></select><button className="export" onClick={exportCsv} disabled={!visible.length}>Export CSV</button></div></div>
        {error && <div className="notice">{error}</div>}
        {!searched && <div className="empty"><div className="empty-icon">⌕</div><h3>Start with a keyword</h3><p>Results are discovered from publicly accessible search indexes.</p></div>}
        {searched && !loading && visible.length > 0 && <div className="table"><div className="row header"><span>CONTENT</span><span>ACCOUNT</span><span>TYPE</span><span>LINK</span></div>{visible.map((r,i)=><div className="row" key={`${r.url}-${i}`}><div className="content"><div className="thumb">{r.kind === 'reel' ? '▶' : r.kind === 'profile' ? '@' : '◎'}</div><div><strong>{r.title || 'Instagram content'}</strong><p>{r.snippet || r.source}</p></div></div><span className="account">{r.account || '—'}</span><span className="tag">{r.kind}</span><span className="link-actions"><button className="copy" onClick={()=>copyLink(r.url)} title="Copy link">Copy</button><a className="open" href={r.url} target="_blank" rel="noreferrer">Open ↗</a></span></div>)}</div>}
      </section>
    </main><footer><span>Instagram Crawler · v0.2</span><span>Publicly discoverable/indexed content only</span></footer>
  </div>
}
createRoot(document.getElementById('root')).render(<App />);
