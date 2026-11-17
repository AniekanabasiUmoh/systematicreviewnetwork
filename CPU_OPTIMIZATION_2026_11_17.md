# CPU optimisation — 17 November 2026

Recent Vercel function usage was led by the homepage (101 invocations, 41 seconds
CPU) and news index (69 invocations, 15 seconds CPU) over 12 hours.

- Public editorial data now has a one-hour fallback instead of five minutes.
  Existing authorised editorial actions invalidate srn-public after saves.
- News index, filtered news and event pages revalidate every five minutes rather
  than every 30 seconds. Displayed registration status/seats may lag by this window;
  registration acceptance still checks the current database and capacity.
- Public navigation and card links no longer speculatively fetch destinations.
  Pages load when followed; this trades preloaded navigation for fewer requests.
- Account, admin, payments, private files and live submission checks are unchanged.

Validation: existing public-filter/cache-isolation tests and production webpack
build. Confirm repeat GET requests hit the CDN after deployment. Measure actual
CPU usage after rollout; theoretical regeneration reduction is not measured savings.
