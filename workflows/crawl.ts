import { start } from 'workflow/api';

export type CrawlInput = { jobId: string; query: string; limit: number; origin: string };

async function crawlStep(input: CrawlInput) {
  'use step';
  const url = new URL('/api/search', input.origin);
  url.searchParams.set('q', input.query);
  url.searchParams.set('limit', String(input.limit));
  const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Crawler failed');
  return data;
}

export async function crawlWorkflow(input: CrawlInput) {
  'use workflow';
  return await crawlStep(input);
}

export async function startCrawl(input: CrawlInput) {
  return start(crawlWorkflow, [input]);
}
