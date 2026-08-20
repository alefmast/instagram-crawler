# Instagram Crawler

A standalone Instagram public-content discovery tool.

## What it does

- Search by keyword, hashtag, or public username
- Discover Instagram URLs that are publicly indexed by search engines
- Classify results as profile, post, or reel
- Filter results in the dashboard
- Export results to CSV
- Run as a Vercel serverless app

## Important scope

This project does **not** bypass Instagram authentication, CAPTCHA, private accounts, or platform access controls. The current collector uses publicly accessible search indexes to discover Instagram URLs.

The collector is isolated behind `/api/search`, so a future compliant provider/API can replace the discovery layer without rebuilding the frontend.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## API

`GET /api/search?q=<query>&limit=<1-60>`

Example response fields:

- `title`
- `url`
- `account`
- `kind`
- `source`
