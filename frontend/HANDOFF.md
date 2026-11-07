# Frontend handoff

Reviewed: 7 November 2026. Branch: `feature/frontend-vivethasri`.

The frontend keeps the original deal workflow and uses the FastAPI endpoints.
The base is deep teal with light text. Each of the 8 deal steps has its own
colour, icon, banner and particle background, defined in `src/lib/stages.ts`.
Particles and animations turn off when the device asks for reduced motion.

Final checks on 7 November 2026:

- Production build passed, including TypeScript checking.
- All 40 Chromium browser checks passed: 20 desktop and 20 mobile emulation.
- Browser checks cover the normal deal flow, alternative outcomes, retries,
  pending refunds, navigation, validation, and the final palette.
- `git diff --check` passed; no backend changes were present.
- Live backend, Groq, PayPal sandbox, and webhook integration remain unverified.

## Run the frontend

From the repository root in PowerShell:

```powershell
cd frontend
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` to the running backend's origin, such as
`http://localhost:8000`, without a trailing slash or `/api` suffix. Then run:

```powershell
npm run dev
```

Use the URL printed by Next.js. Restart the frontend after changing environment
variables. Production builds embed `NEXT_PUBLIC_API_URL`, so rebuild when it
changes. Backend private credentials never belong in frontend environment files.

The frontend currently uses hosted PayPal checkout. The public PayPal client ID
in `.env.example` is not used by the frontend; the backend creates checkout URLs.

## Pages and flow

| Route | Purpose |
| --- | --- |
| `/` | Landing page and navigation |
| `/dashboard` | Existing deals, statuses, and refresh |
| `/deals/new` | Buyer/seller limits and negotiation submission |
| `/deals/{id}` | Deal actions, progress, negotiation transcript, and terms |
| `/guide` | What TrustCargo is, the 8 steps, AI agents, benefits and FAQ |

Normal flow: create and negotiate, both parties approve, deposit payment,
shipping proof verification, balance payment, carrier updates until delivery,
inspection, and closure. The buyer can inspect only after delivery.
Alternative outcomes: failed negotiation, proof review with resubmission or
buyer override, and suggested refund with seller approval or rejection.

PayPal returns to `/deals/{id}?paypal=return&kind=deposit` or `kind=balance`.
The frontend asks the backend to capture the payment. Failed or pending capture
can be retried without starting another checkout. Cancellation returns with
`?paypal=cancel`. A refund is shown as complete only when `refund_status` is
`COMPLETED`. Use Refresh status for updates from another participant or webhooks.

## Existing API contract

All paths below are relative to `${NEXT_PUBLIC_API_URL}/api`.

| Method | Path | Request |
| --- | --- | --- |
| GET | `/suppliers` | None |
| GET | `/deals` | None |
| POST | `/deals` | JSON product, quantity, buyer/seller names and countries, price limits in cents, delivery limits in days |
| GET | `/deals/{id}` | None |
| POST | `/deals/{id}/approve` | JSON `party`: `buyer` or `seller` |
| POST | `/deals/{id}/payments/{kind}` | None; returns `approval_url` |
| POST | `/deals/{id}/payments/{kind}/capture` | None |
| POST | `/deals/{id}/shipment` | Multipart `carrier`, `tracking_number`, `shipped_quantity`, repeated `files` |
| POST | `/deals/{id}/shipment/accept` | None |
| POST | `/deals/{id}/inspection` | Multipart `received_quantity`, `damaged_quantity`, `notes`, optional repeated `files` |
| POST | `/deals/{id}/claim/approve` | None |
| POST | `/deals/{id}/claim/reject` | None |
| POST | `/deals/{id}/tracking/updates` | JSON `kind` (`milestone` or `delay`), `delay_days` (1-14 for delays), optional `note` |
| GET | `/deals/{id}/evidence/{evidence_id}` | None; returns the stored file |
| POST | `/suppliers` | JSON seller name, country, product, minimum price in cents, lead time in days |

Deal actions return the updated deal except checkout creation, which returns
the approval URL. The frontend uses integer cents and USD display. Uploads are
limited to three JPG, PNG, WEBP or PDF files of up to 5 MB each, matching the
backend defaults.

## Verification and remaining integration check

See [TESTING.md](./TESTING.md) for build, type checking, and desktop/mobile
browser checks. Those browser tests intercept API and checkout requests; they
do not prove that a deployed backend, Groq, PayPal, or webhooks are configured.

Before the team demo, the backend owner should provide a reachable API and
configure the existing `FRONTEND_URL` setting to match the frontend origin
exactly, including scheme and port. This setting controls CORS and PayPal return
URLs. Confirm one complete deal and one refund using actual PayPal sandbox
accounts and valid shipping/inspection evidence. Check cancellation, proof
review, and refresh after external updates as well.

A "Couldn't connect to the server" message means a browser request could not
reach the API. Check API availability, `NEXT_PUBLIC_API_URL`, CORS, and HTTPS
compatibility before changing the frontend workflow.

The existing demo has no login and shares buyer/seller controls on one screen.
Supplier entries are sample data. These limitations are unchanged.

## Transferring the work

The reviewed frontend changes are local and uncommitted at the time of handoff.
A branch name alone does not transfer them. Include all modified and new
frontend files when committing/pushing or sharing the folder. Do not include
`.env.local`, `node_modules`, `.next`, or test results; dependency installation
and builds recreate generated files.
