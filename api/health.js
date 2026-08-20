export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, service: 'instagram-crawler', version: '0.5.0', timestamp: new Date().toISOString() });
}
