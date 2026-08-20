const memoryJobs = globalThis.__instagramCrawlerJobs || new Map();
globalThis.__instagramCrawlerJobs = memoryJobs;

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const durable = Boolean(KV_URL && KV_TOKEN);

async function kv(command) {
  const response = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!response.ok) throw new Error(`Storage error: ${response.status}`);
  const data = await response.json();
  return data.result;
}
async function getJob(id) {
  if (durable) {
    const raw = await kv(['GET', `instagram:crawler:job:${id}`]);
    return raw ? JSON.parse(raw) : null;
  }
  return memoryJobs.get(id) || null;
}
async function saveJob(job) {
  if (durable) {
    await kv(['SET', `instagram:crawler:job:${job.id}`, JSON.stringify(job), 'EX', 86400]);
    // Keep one history entry per job even though the job is updated multiple times.
    await kv(['LREM', 'instagram:crawler:jobs', '0', job.id]);
    await kv(['LPUSH', 'instagram:crawler:jobs', job.id]);
    await kv(['LTRIM', 'instagram:crawler:jobs', '0', '49']);
  } else {
    memoryJobs.set(job.id, job);
  }
}
async function listJobs() {
  if (durable) {
    const ids = await kv(['LRANGE', 'instagram:crawler:jobs', '0', '19']);
    return (await Promise.all((ids || []).map(getJob))).filter(Boolean);
  }
  return [...memoryJobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
}
async function runJob(job, origin) {
  job.status = 'running';
  job.updatedAt = new Date().toISOString();
  await saveJob(job);
  try {
    const url = new URL('/api/search', origin);
    url.searchParams.set('q', job.query);
    url.searchParams.set('limit', String(job.limit));
    const response = await fetch(url, { signal: AbortSignal.timeout(28000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Crawler failed');
    job.status = 'completed';
    job.results = data.results || [];
    job.pagesFetched = data.pagesFetched || 0;
    job.totalFound = data.totalFound || job.results.length;
    job.providers = data.providers || [];
    job.errors = data.errors || [];
    job.completedAt = new Date().toISOString();
  } catch (error) {
    job.status = 'failed';
    job.error = error.name === 'TimeoutError' ? 'Crawl timed out' : (error.message || 'Crawler failed');
  }
  job.updatedAt = new Date().toISOString();
  await saveJob(job);
  return job;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST') {
    const q = String(req.body?.q || req.query?.q || '').trim();
    const limit = Math.min(Math.max(Number(req.body?.limit || req.query?.limit || 20), 1), 60);
    if (!q) return res.status(400).json({ error: 'Query is required' });
    const id = crypto.randomUUID();
    const job = { id, query: q, limit, status: 'queued', durable, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), results: [] };
    await saveJob(job);
    // Await the bounded crawl. Detached promises are not reliable in serverless runtimes.
    const completed = await runJob(job, `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`);
    return res.status(completed.status === 'failed' ? 502 : 200).json(completed);
  }
  if (req.method === 'GET') {
    const id = String(req.query?.id || '');
    if (id) {
      const job = await getJob(id);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      return res.status(200).json(job);
    }
    return res.status(200).json({ durable, jobs: await listJobs() });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
