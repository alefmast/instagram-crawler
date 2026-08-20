import { startCrawl } from '../workflows/crawl.ts';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const query = String(req.body?.q || '').trim();
  const limit = Math.min(Math.max(Number(req.body?.limit || 20), 1), 60);
  if (!query) return res.status(400).json({ error: 'Query is required' });
  const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  try {
    const run = await startCrawl({ jobId: crypto.randomUUID(), query, limit, origin });
    return res.status(202).json({ runId: run.runId, query, status: 'started' });
  } catch (error) {
    console.error('workflow start failed', error);
    return res.status(500).json({ error: 'Unable to start crawl workflow' });
  }
}
