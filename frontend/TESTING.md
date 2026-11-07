# Frontend checks

```powershell
npm ci
npx playwright install chromium
npm run typecheck
npm run build
npm run test:e2e
```

The browser suite starts the production app on port 3100 and runs at desktop
and mobile sizes. Stop any other server on that port first. Rebuild after source
changes so the browser suite tests the current code.

Coverage includes the navbar and all four routes, empty/error/retry states,
form validation, upload limits, both approvals, both hosted checkout redirects,
cancellation, failed/pending payment confirmation, shipping proof review and
resubmission, successful inspection, both refund decisions, and pending refund
status updates. Tests also check
for browser runtime errors and horizontal overflow.

The dashboard and deal room have explicit refresh controls for updates made by
another participant or a payment webhook. Refresh only reads the existing API;
it does not repeat approvals or payments. Deal refresh preserves unfinished form
inputs while the deal remains at the same stage. Browser checks cover external
status changes and recovery from failed refresh requests.

The visual check captures all four pages at desktop and mobile sizes and checks
that the original deep teal palette stays active regardless of device color preference. It also
checks the active progress step with reduced motion enabled. Screenshots are
saved under `test-results/`. Every page has a particle background and motion
that match its deal stage. Both are switched off when the device asks for
reduced motion, which the visual check uses.

API and hosted checkout responses are intercepted by Playwright. These tests
do not start or modify the backend, send real evidence, or make PayPal payments.
They verify frontend behavior against the current backend contracts; they do
not establish that external integrations are configured or available.

Before the hackathon demo, run the app against the configured backend and
PayPal sandbox accounts. Verify a full successful deal and a partial-refund
deal, including actual uploads and PayPal returns. `NEXT_PUBLIC_API_URL` must
point to the backend origin (without `/api`), and the backend's `FRONTEND_URL`
must match the frontend origin for CORS and checkout return URLs.

The frontend accepts up to three JPG, PNG, WEBP or PDF files, each up to 5 MB,
matching the default backend upload limit. Keep this UI limit aligned if the
backend upload configuration changes.
