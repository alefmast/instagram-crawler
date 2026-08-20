const jobs = globalThis.__instagramCrawlerJobs || new Map();
globalThis.__instagramCrawlerJobs = jobs;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const q = String(req.body?.q || req.query?.q || '').trim();
    const limit = Math.min(Math.max(Number(req.body?.limit || req.query?.limit || 20), 1), 60);
    if (!q) return res.status(400).json({ error: 'Query is required' });

    const id = crypto.randomUUID();
    const job = { id, query: q, limit, status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), results: [] };
    jobs.set(id, job);

    queueMicrotask(async () => {
      job.status = 'running'; job.updatedAt = new Date().toISOString();
      try {
        const base = new URL('/api/search', `https://${req.headers.host}`);
        base.searchParams.set('q', q); base.searchParams.set('limit', String(limit));
        const response = await fetch(base);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Crawler failed');
        job.status = 'completed'; job.results = data.results || []; job.pagesFetched = data.pagesFetched || 0;
      } catch (error) {
        job.status = 'failed'; job.error = error.message || 'Crawler failed';
      } finally { job.updatedAt = new Date().toISOString(); }
    });

    return res.status(202).json(job);
  }

  if (req.method === 'GET') {
    const id = String(req.query?.id || '');
    if (id) {
      const job = jobs.get(id);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      return res.status(200).json(job);
    }
    return res.status(200).json({ jobs: [...jobs.values()].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20) });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
