# Public-page CPU reduction

Public news lists and event detail pages use a 30-second page cache. Public
resources and editorial data use a five-minute cache. Filter URLs still work
without JavaScript: middleware maps the approved query parameters to a stable
internal route parameter, allowing HTML and RSC variants to be cached.

Public-filter requests return before the authentication middleware, including
POST requests used by the public newsletter footer. Next server actions retain
their normal cache bypass. Private admin/account/enrolment/learner routes keep
the original authentication and authorization checks.

Only the anonymous content client in `lib/queries.ts` uses the `srn-public`
data tag. The service-role seat-count client, registration submissions,
payments, private files and account data do not use that shared cache.
Registration submissions continue checking current event state and capacity
against the database. A displayed badge can be up to the short ISR window old;
it is never the authority for accepting registration.

Successful editorial saves expire the public-data tag and relevant route
subtrees. Staff closing or reopening an event also expires public content
immediately. Cache intervals revalidate on demand rather than running a cron.

Validation:

```
node --experimental-strip-types --test tests/public-filters.test.mjs tests/public-cache-policy.test.mjs
npm run build -- --webpack
```

Check repeat HTML requests for CDN hits, category-specific resources in the
server HTML, public form validation, and unauthorized redirects on private
routes. Do not infer an account-wide CPU saving percentage from these checks.
