# Frontend handoff

Reviewed: 7 November 2026. Branch: `feature/frontend-vivethasri`.

The frontend keeps the original deal workflow and uses the FastAPI endpoints.
The base is deep teal with light text. Each of the 8 deal steps has its own
colour, icon, banner and particle background, defined in `src/lib/stages.ts`.
Each step also has its own layout in `src/components/stages/`: a contract to
sign, a PayPal invoice, a waybill, a voyage map, a counting station, a refund
ruling and a closing statement.
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

Set `API_URL` in `.env.local` to the running backend's origin, such as
`http://localhost:8000`, without `/api`. The site forwards every `/api` request
there, so the browser only ever talks to the frontend's own address and the
sign-in cookie stays first-party. Then run:

```powershell
npm run dev
```

Use the URL printed by Next.js. Restart the frontend after changing environment
variables. Production builds read `API_URL` at build time, so rebuild when it
changes. Backend private credentials never belong in frontend environment files.

The frontend currently uses hosted PayPal checkout. The public PayPal client ID
in `.env.example` is not used by the frontend; the backend creates checkout URLs.

## Pages and flow

| Route | Purpose |
| --- | --- |
| `/` | Landing page and navigation |
| `/login`, `/signup` | Accounts. Both return to `?next=` (same-site paths only) |
| `/dashboard` | Invitations, deals waiting on you, and everything else. Signed-in only |
| `/deals/new` | Pick buyer or seller, your own private limit, and the partner's email. Signed-in only |
| `/deals/{id}` | The deal for whoever is signed in. Each person sees only their own actions and limit |
| `/guide` | What TrustCargo is, the 8 steps, AI agents, benefits and FAQ |

Normal flow: one side creates the deal and invites the other, the invitee joins
with their limit and the agents negotiate, both parties approve, deposit payment,
shipping proof verification, balance payment, carrier updates until delivery,
inspection, and closure. The buyer can inspect only after delivery.
Alternative outcomes: declined or cancelled invitation, failed negotiation, proof review with resubmission or
buyer override, and suggested refund with seller approval or rejection.

PayPal returns to `/deals/{id}?paypal=return&kind=deposit` or `kind=balance`.
The frontend asks the backend to capture the payment. Failed or pending capture
can be retried without starting another checkout. Cancellation returns with
`?paypal=cancel`. A refund is shown as complete only when `refund_status` is
`COMPLETED`. Use Refresh status for updates from another participant or webhooks.

## API contract

All paths below are relative to `/api` on the frontend's own address. Every
route except the auth ones needs the sign-in cookie.

| Method | Path | Who | Request |
| --- | --- | --- | --- |
| POST | `/auth/signup` | Anyone | JSON `email`, `password` (8+), `name`, optional `business_name`, `country` |
| POST | `/auth/login` | Anyone | JSON `email`, `password`. 429 after 5 wrong tries in 15 minutes |
| POST | `/auth/logout` | Signed in | None |
| GET | `/auth/me` | Signed in | None; 401 when signed out |
| GET | `/partners` | Signed in | None; people you've traded with |
| GET | `/deals` | Signed in | None; your deals and invitations to your email |
| POST | `/deals` | Signed in | JSON `role`, `product`, `quantity`, `counterparty_email`, `limit_cents`, `days` |
| GET | `/deals/{id}` | Either side | None |
| DELETE | `/deals/{id}` | Creator, while invited | None |
| POST | `/deals/{id}/accept` | Invitee | JSON `limit_cents`, `days`; runs the negotiation |
| POST | `/deals/{id}/decline` | Invitee | None |
| POST | `/deals/{id}/approve` | Either side, for themselves | None |
| POST | `/deals/{id}/payments/{kind}` | Buyer | None; returns `approval_url` |
| POST | `/deals/{id}/payments/{kind}/capture` | Buyer | None |
| POST | `/deals/{id}/shipment` | Seller | Multipart `carrier`, `tracking_number`, `shipped_quantity`, repeated `files` |
| POST | `/deals/{id}/shipment/accept` | Buyer | None |
| POST | `/deals/{id}/tracking/updates` | Seller | JSON `kind` (`milestone` or `delay`), `delay_days` (1-14 for delays), optional `note` |
| POST | `/deals/{id}/inspection` | Buyer | Multipart `received_quantity`, `damaged_quantity`, `notes`, optional repeated `files` |
| POST | `/deals/{id}/claim/approve` | Seller | None |
| POST | `/deals/{id}/claim/reject` | Seller | None |
| GET | `/deals/{id}/evidence/{evidence_id}` | Either side | None; returns the stored file |
| GET | `/deals/{id}/documents/{kind}.pdf` | Either side | None; `kind` is `agreement`, `deposit`, `balance`, `refund` or `statement` |

Each deal includes `viewer_role` (`buyer`, `seller` or `invitee`) and
`next_actor` (`buyer`, `seller`, `both` or null). The other side's price limit
is always null.

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
reach the API. Check API availability, `API_URL`, and HTTPS
compatibility before changing the frontend workflow.

Each person signs in separately. To try both sides on one computer, use a
normal window and a private window with two different email addresses.

## Transferring the work

The reviewed frontend changes are local and uncommitted at the time of handoff.
A branch name alone does not transfer them. Include all modified and new
frontend files when committing/pushing or sharing the folder. Do not include
`.env.local`, `node_modules`, `.next`, or test results; dependency installation
and builds recreate generated files.
