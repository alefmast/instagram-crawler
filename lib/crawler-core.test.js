import { strict as assert } from 'node:assert';
import { dedupeResults, buildCrawlSummary } from './crawler-core.js';

const items = dedupeResults([
  { url: 'https://www.instagram.com/p/ABC/' },
  { url: 'https://www.instagram.com/p/ABC' },
  { url: 'https://www.instagram.com/reel/XYZ/', kind: 'reel' }
]);
assert.equal(items.length, 2);
assert.equal(items[1].kind, 'reel');
const summary = buildCrawlSummary(items, { pagesFetched: 4, timedOut: false });
assert.equal(summary.count, 2);
assert.equal(summary.pagesFetched, 4);
console.log('crawler-core tests passed');
