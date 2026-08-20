import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const demo = [
  { title: 'Search Instagram for real public results', url: 'https://www.instagram.com/', account: 'Instagram', snippet: 'Enter a keyword, hashtag or public profile to discover indexed Instagram content.', type: 'Instagram', source: 'Instagram' }
];

function App() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [limit, setLimit] = useState(20);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const visible = useMemo(() => results.filter(r => {
    if (type === 'all') return true;
    if (type === 'profile') return r.kind === 'profile';
    if (type === 'reel') return r.kind === 'reel';
    if (type === 'post') return r.kind === 'post';
    return true;
  }), [results, type]);

  async function search(e) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true); setError(''); setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results || []);
      if (!data.results?.length) setError('No indexed Instagram results were found for this query.');
    } catch (err) {
      setResults([]);
      setError(err.message || 'Something went wrong.');
    } finally { setLoading(false); }
  }

  function exportCsv() {
    if (!visible.length) return;
    const head = ['Title','URL','Account','Type','Snippet'];
    const esc = v => `"${String(v ?? '').replaceAll('"','""')}"`;
    const csv = [head, ...visible.map(r => [r.title,r.url,r.account,r.kind,r.snippet])].map(row => row.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `instagram-results-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  }

  return <div className="app">
    <header className="topbar">
      <div className="brand"><span className="mark">IC</span><div><strong>Instagram Crawler</strong><small>Public content discovery</small></div></div>
      <div className="status"><span></span> Online</div>
    </header>

    <main>
      <section className="hero">
        <div className="eyebrow">INSTAGRAM DISCOVERY ENGINE</div>
        <h1>Find the Instagram links<br/><em>that matter.</em></h1>
        <p>Search public, indexed Instagram content by keyword, hashtag or account and collect direct links in one place.</p>
        <form onSubmit={search} className="searchbox">
          <div className="searchicon">⌕</div>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try: صحنه، #music, @account" autoFocus />
          <select value={limit} onChange={e=>setLimit(Number(e.target.value))} aria-label="Result count"><option value="10">10</option><option value="20">20</option><option value="40">40</option></select>
          <button disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
        </form>
        <div className="chips"><button onClick={()=>setQuery('#صحنه')}>#صحنه</button><button onClick={()=>setQuery('music iran')}>music iran</button><button onClick={()=>setQuery('@filimo')}>@filimo</button></div>
      </section>

      <section className="results-section">
        <div className="results-head">
          <div><div className="section-label">RESULTS</div><h2>{searched ? `${visible.length} results` : 'Ready to search'}</h2></div>
          <div className="actions"><select value={type} onChange={e=>setType(e.target.value)}><option value="all">All content</option><option value="post">Posts</option><option value="reel">Reels</option><option value="profile">Profiles</option></select><button className="export" onClick={exportCsv} disabled={!visible.length}>Export CSV</button></div>
        </div>
        {error && <div className="notice">{error}</div>}
        {!searched && <div className="empty"><div className="empty-icon">⌕</div><h3>Start with a keyword</h3><p>We'll return direct Instagram URLs discovered from public search indexes.</p></div>}
        {searched && !loading && visible.length > 0 && <div className="table">
          <div className="row header"><span>CONTENT</span><span>ACCOUNT</span><span>TYPE</span><span>LINK</span></div>
          {visible.map((r,i)=><div className="row" key={`${r.url}-${i}`}>
            <div className="content"><div className="thumb">{r.kind === 'reel' ? '▶' : r.kind === 'profile' ? '@' : '◎'}</div><div><strong>{r.title || 'Instagram content'}</strong><p>{r.snippet || 'No description available.'}</p></div></div>
            <span className="account">{r.account || '—'}</span><span className="tag">{r.kind}</span>
            <a className="open" href={r.url} target="_blank" rel="noreferrer">Open ↗</a>
          </div>)}
        </div>}
      </section>
    </main>
    <footer><span>Instagram Crawler · MVP</span><span>Only publicly discoverable/indexed content</span></footer>
  </div>
}

createRoot(document.getElementById('root')).render(<App />);
