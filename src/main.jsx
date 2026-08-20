import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const HISTORY_KEY = 'instagram-crawler-history';

function readHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function App() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [limit, setLimit] = useState(20);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [pagesFetched, setPagesFetched] = useState(0);
  const [history, setHistory] = useState(readHistory);
  const [copied, setCopied] = useState('');

  const visible = useMemo(
    () => results.filter(r => type === 'all' || r.kind === type),
    [results, type]
  );

  function saveHistory(q, count) {
    const next = [{ q, count, at: Date.now() }, ...history.filter(x => x.q !== q)].slice(0, 10);
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
  }

  async function search(e, forcedQuery = null) {
    e?.preventDefault();
    const q = (forcedQuery ?? query).trim();
    if (!q || loading) return;
    setQuery(q);
    setLoading(true);
    setError('');
    setSearched(true);
    setResults([]);
    setPagesFetched(0);
    setCopied('');
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results || []);
      setPagesFetched(data.pagesFetched || 0);
      saveHistory(q, data.count || 0);
      if (!data.results?.length) setError('No publicly indexed Instagram results were found. Try a broader query.');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(''), 1400);
    } catch {}
  }

  function exportCsv() {
    if (!visible.length) return;
    const head = ['Title', 'URL', 'Account', 'Type', 'Source'];
    const esc = v => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const csv = [head, ...visible.map(r => [r.title, r.url, r.account, r.kind, r.source])]
      .map(row => row.map(esc).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `instagram-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return <div className="app">
    <header className="topbar">
      <div className="brand">
        <span className="mark">IC</span>
        <div><strong>Instagram Crawler</strong><small>Public content discovery</small></div>
      </div>
      <div className="status"><span /> Online</div>
    </header>

    <main>
      <section className="hero">
        <div className="eyebrow">INSTAGRAM DISCOVERY ENGINE</div>
        <h1>Find the Instagram links<br /><em>that matter.</em></h1>
        <p>Search publicly indexed Instagram content by keyword, hashtag or account and collect direct links in one place.</p>
        <form onSubmit={search} className="searchbox">
          <div className="searchicon">⌕</div>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Try: صحنه، #music, @account" autoFocus />
          <select value={limit} onChange={e => setLimit(Number(e.target.value))} aria-label="Result limit">
            <option value="10">10</option><option value="20">20</option><option value="40">40</option><option value="60">60</option>
          </select>
          <button disabled={loading}>{loading ? 'Crawling…' : 'Search'}</button>
        </form>
        <div className="chips">
          <button type="button" onClick={() => search(null, '#صحنه')}>#صحنه</button>
          <button type="button" onClick={() => search(null, 'music iran')}>music iran</button>
          <button type="button" onClick={() => search(null, '@filimo')}>@filimo</button>
        </div>
      </section>

      <section className="results-section">
        <div className="results-head">
          <div><div className="section-label">RESULTS</div><h2>{searched ? `${visible.length} results` : 'Ready to search'}</h2></div>
          <div className="actions">
            <select value={type} onChange={e => setType(e.target.value)} aria-label="Content type">
              <option value="all">All content</option><option value="post">Posts</option><option value="reel">Reels</option><option value="profile">Profiles</option>
            </select>
            <button className="export" onClick={exportCsv} disabled={!visible.length}>Export CSV</button>
          </div>
        </div>

        {history.length > 0 && !searched && <div className="history"><span>Recent:</span>{history.slice(0, 5).map(item => <button key={item.q} onClick={() => search(null, item.q)}>{item.q}</button>)}</div>}
        {error && <div className="notice">{error}</div>}
        {!searched && <div className="empty"><div className="empty-icon">⌕</div><h3>Start with a keyword</h3><p>Results are discovered from publicly accessible search indexes.</p></div>}
        {searched && loading && <div className="empty"><div className="spinner" /><h3>Searching public indexes</h3><p>Checking multiple discovery queries and pages.</p></div>}
        {searched && !loading && visible.length > 0 && <>
          <div className="crawl-meta">Checked {pagesFetched} search pages · {visible.length} unique Instagram links</div>
          <div className="table">
            <div className="row header"><span>CONTENT</span><span>ACCOUNT</span><span>TYPE</span><span>LINK</span></div>
            {visible.map((r, i) => <div className="row" key={`${r.url}-${i}`}>
              <div className="content"><div className="thumb">{r.kind === 'reel' ? '▶' : r.kind === 'profile' ? '@' : '◎'}</div><div><strong>{r.title || 'Instagram content'}</strong><p>{r.snippet || r.source}</p></div></div>
              <span className="account">{r.account || '—'}</span><span className="tag">{r.kind}</span>
              <span className="link-actions"><button className="copy" onClick={() => copyLink(r.url)}>{copied === r.url ? 'Copied' : 'Copy'}</button><a className="open" href={r.url} target="_blank" rel="noreferrer">Open ↗</a></span>
            </div>)}
          </div>
        </>}
      </section>
    </main>
    <footer><span>Instagram Crawler · v0.4</span><span>Publicly discoverable/indexed content only</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
