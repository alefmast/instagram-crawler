# Instagram Crawler

A lightweight web dashboard for discovering publicly indexed Instagram profiles, posts and reels from keywords, hashtags and public account names.

## MVP

- Keyword / hashtag / `@account` search
- Direct Instagram links
- Basic content classification: post, reel, profile
- Result filtering
- CSV export
- Vercel serverless API

## Architecture note

The MVP uses a public search index as the discovery layer rather than attempting to bypass Instagram authentication, CAPTCHA, rate limits or access controls. It returns **publicly discoverable/indexed** Instagram URLs, not a claim of exhaustive Instagram-wide crawling.

The collector is isolated in `api/search.js`, so a compliant Instagram data provider/API can be swapped in later without redesigning the UI.
