# TrustCargo

An AI trade agent that helps small sellers and overseas buyers complete cross-border deals, with PayPal handling staged payments and refunds.

> Hackathon prototype using PayPal Sandbox and Groq AI. Sandbox payments use test funds. Submission branch: [`deploy/trustcargo-demo`](https://github.com/rkhm2004/Tustcargo/tree/deploy/trustcargo-demo).

## Flow

1. A seller or a buyer signs in, starts a deal with their own private limit, and invites the other side by email.
2. The other person signs in with that email and adds their own private limit. API responses hide the other party's price-limit field.
3. Buyer and seller AI roles suggest a price through alternating offers. Negotiation safeguards are incomplete; both people must review and approve the result.
4. Both people approve the deal, each from their own account.
5. **PayPal:** The buyer pays a 30% deposit.
6. The seller uploads shipping proof for model-assisted review, with a quantity-based fallback when AI is unavailable.
7. **PayPal:** The backend attempts to add tracking to the deposit order, and the buyer pays the balance after proof is verified or accepted by the buyer.
8. The seller manually records shipment milestones and delays. The Watcher explains the calculated delivery risk.
9. After delivery, the buyer inspects the goods and reports any problem.
10. AI suggests a refund, and the seller approves or rejects it.
11. **PayPal:** Seller approval requests the refund; the UI shows completion only after its status is confirmed.

Each action is checked on the server: only the buyer can pay or inspect, and only the seller can ship, update tracking or decide a refund. People who aren't on a deal get a not-found page, including for its files and bills.

## Tech stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, Lucide React, Framer Motion, tsParticles
- **Backend:** Python, FastAPI, Pydantic, SQLAlchemy, psycopg, HTTPX; optional SMTP invitations
- **Database and evidence:** SQLite and local files for development; Supabase PostgreSQL and private Supabase Storage for the prepared cloud configuration
- **AI:** Groq Chat Completions API, `openai/gpt-oss-120b` for text and `qwen/qwen3.8-27b` for image requests; pypdf for PDF text extraction
- **Payments:** PayPal Sandbox, OAuth 2.0, Orders API v2, Payments API v2, webhooks and hosted checkout
- **Hosting:** Render Free Python and Node web services, configured in [`render.yaml`](render.yaml)
- **Documents and testing:** ReportLab PDF generation, pytest and Playwright

## Run locally

Requirements: Git, Node.js 22 (the configured deployment version), npm, and Python 3.11+ (validated locally with 3.12.4). You also need PayPal Sandbox credentials to exercise payments; a Groq API key is optional for the rule-based demo but required for live AI inference.

### Clone the submission branch

```bash
git clone --branch deploy/trustcargo-demo https://github.com/rkhm2004/Tustcargo.git
cd Tustcargo
git branch --show-current
```

The last command should print `deploy/trustcargo-demo`. Run the following backend commands from this repository directory. Copy example environment files only on a fresh setup; preserve any existing `.env`, `.env.local`, database and uploads.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

In Windows PowerShell, use `.venv\Scripts\Activate.ps1` instead of `source`, and `Copy-Item .env.example .env` instead of `cp`. On systems where Python is named `python3`, use that command to create the environment.

Edit `backend/.env` privately using the environment table below. For local development keep `APP_ENV=development`, `DATABASE_URL=sqlite:///./trustcargo.db`, `STORAGE_BACKEND=local`, and `FRONTEND_URL=http://localhost:3000`. Then, from `backend` with the environment active:

```bash
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000. Check http://localhost:8000/api/health.

### Local database initialization

SQLite needs no separate database server or manual SQL setup. On the first backend startup, SQLAlchemy creates `backend/trustcargo.db` and the seven application tables automatically. Startup also runs the existing missing-column helper and reference backfill. This helper is not a complete versioned migration system: preserve existing records and uploads when upgrading. Changing `DATABASE_URL` to PostgreSQL does not transfer SQLite records or local evidence.

### Frontend

In a second terminal, start from the cloned repository root:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

In Windows PowerShell, the environment-file copy can also be written as `Copy-Item .env.example .env.local`. Its local `API_URL` should be `http://localhost:8000`.

Open http://localhost:3000 and create an account. To try both sides on one computer, use a normal window for the seller and a private window for the buyer, each with its own email address. These are TrustCargo accounts; PayPal checkout uses separate PayPal Sandbox buyer credentials. Without SMTP, use the copy-invitation-link option and sign in as the invited email address.

Preserve your existing `backend/trustcargo.db` and uploads when upgrading. Startup adds missing columns, but does not provide a full migration of older data. Review older ownerless deals before using an existing database in a hosted environment.

### Deploying to Render and Supabase

Follow [the deployment guide](docs/render-supabase.md) for the full dashboard steps, private environment settings, database Session Pooler TLS, private evidence bucket, webhook setup and verification checklist. The prepared configuration runs FastAPI and Next.js as two Render Free web services in Singapore, with Supabase PostgreSQL and private Supabase Storage. It requires no paid disk. Set backend `FRONTEND_URL` to the actual frontend HTTPS origin, and frontend `API_URL` to the backend origin before building. Render Free blocks common SMTP ports, so the demo uses copied invitation links.

## PayPal Sandbox integration

Create a Sandbox REST application in the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/), obtain its client ID and secret, and configure a Sandbox merchant and buyer account. Enter credentials only in `backend/.env` or the hosting provider's private environment settings. Keep `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`.

The backend uses direct HTTPX REST requests, not a PayPal Python or JavaScript SDK. The frontend requests an approval URL from FastAPI and redirects the buyer to PayPal-hosted checkout. It requests capture when the buyer returns; verified webhooks provide another payment-update path.

| PayPal tool | Used for |
|---|---|
| OAuth 2.0 | `POST /v1/oauth2/token` exchanges backend app credentials for an access token |
| Orders API v2 | `POST /v2/checkout/orders` creates an order; `GET /v2/checkout/orders/{id}` retrieves it; `POST /v2/checkout/orders/{id}/capture` captures it; `POST /v2/checkout/orders/{id}/track` submits tracking |
| Hosted PayPal checkout | Lets the buyer log in and approve each payment on PayPal |
| Payments API v2 | `POST /v2/payments/captures/{capture_id}/refund` requests the seller-approved partial refund from the balance capture |
| Webhooks | `/api/webhooks/paypal` receives order-approved, capture-completed and capture-refunded events; the backend verifies signatures using `POST /v1/notifications/verify-webhook-signature` |
| Sandbox | Uses test accounts and funds; the application default and Render configuration point to the Sandbox API |

After both people approve the deal, the buyer can pay a separate 30% deposit order. Verified or buyer-accepted shipping proof enables the balance order. If inspection reports missing or damaged goods, the Judge suggests a capped refund; only the seller's approval initiates the PayPal refund. Payment and refund statuses are stored, including pending states. This is staged payment, not escrow or a marketplace payout integration. Locally generated PDF invoices are not the PayPal Invoicing API.

For hosted webhooks, register `https://<your-backend-host>/api/webhooks/paypal` in the same Sandbox application for `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, and `PAYMENT.CAPTURE.REFUNDED`, and set `PAYPAL_WEBHOOK_ID`. Webhooks cannot reach localhost without a public forwarding URL; local checkout can still request capture on return.

Implementation: [`PayPalClient`](backend/app/services/paypal.py), [payment routes](backend/app/api/payments.py), [refund routes](backend/app/api/claims.py), and [webhook handler](backend/app/api/webhooks.py).

## Groq AI integration

All model calls go from FastAPI to `https://api.groq.com/openai/v1/chat/completions` using HTTPX and a server-side `GROQ_API_KEY`. The shared adapter requests JSON objects and checks required fields and basic types. Agent coordination is custom Python code; no LangChain, CrewAI or AutoGen framework is used.

| Model setting | Default model | Used for |
|---|---|---|
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Text negotiation, shipment-risk explanations, and reviews containing text or extracted PDF text |
| `GROQ_VISION_MODEL` | `qwen/qwen3.8-27b` | Shipping-proof and claim-review requests that contain images |

There are four implemented workflows, with two prompted roles in negotiation:

| Workflow | Trigger and behavior | Fallback or limitation |
|---|---|---|
| Buyer/seller negotiation | Invited partner joins; alternating buyer and seller roles exchange price offers through a shared transcript, for up to ten turns (five rounds) | Rejects incompatible initial price/timing limits. Missing model output uses arithmetic and canned messages; exhausting model turns produces a computed middle-price suggestion |
| Shipping-proof checker | Seller uploads proof after deposit; compares order/shipment details with image evidence or PDF text | Quantity mismatch cannot be overridden by the model. Fallback checks quantity equality, not the authenticity of evidence; tracking-format checks are separate regex validation |
| Shipment Watcher | Proof verification starts it; seller-entered milestones and delays update it | Code calculates dates and risk from a predefined seven-stage route. AI writes explanations and suggested actions; there is no live carrier feed or learned ETA prediction |
| Refund Judge | Buyer reports missing/damaged goods after recorded delivery; reviews quantities, notes and current claim evidence | Code caps the recommendation by affected-goods value and the balance amount. Fallback uses that formula; the seller must approve a refund |

**Known negotiation limitation:** counteroffers are constrained by calculated ranges, but the explicit acceptance branch does not recheck the accepting role's private price limit. A review reproduced acceptance outside that limit. Do not treat negotiation as guaranteed safe autonomous decision-making. The initial feasibility check and counteroffer restrictions do not eliminate this gap; people must review the suggested price before approval. Private limit fields are hidden from the other party's API response, but model messages are not mechanically redacted for accidental disclosure.

PDFs are converted to at most 6,000 characters of text with pypdf; scanned-PDF OCR is not implemented. Images are sent as base64 data URLs. Missing keys, failed requests, or rejected response shapes produce rule-based results. Negotiation, Watcher and Judge screens show AI/fallback badges; proof-review screens show the returned explanation without an equivalent explicit badge.

Implementation: [shared model adapter](backend/app/services/llm.py), [agent modules](backend/app/agents/), and [architecture notes](docs/architecture.md).

## Data the backend keeps

- **Deal reference:** Each deal gets an ID such as `TC-7K2M9QXA`. PayPal orders carry it as `custom_id` and in a unique `invoice_id`.
- **Payments:** Order ID, capture ID and status for the deposit and the balance. Expired PayPal orders are replaced automatically.
- **Evidence:** Each file's type is checked from its contents, then stored with its size and SHA-256 hash. Files open from the deal page.
- **Tracking numbers:** DHL (10 digits or `JD` + 18 digits), FedEx (12, 15, 20 or 22 digits) and UPS (`1Z` + 16 characters) are checked. Other carriers need 6-30 letters or digits. Format validation does not confirm that a carrier recognizes or has delivered a shipment.
- **Shipment events and activity log:** Every step records who did it and when.
- **Accounts:** Each person has an email and a password hashed with scrypt. Sign-in uses an HttpOnly session cookie, and repeated wrong passwords are slowed down.
- **Trade partners:** People you've traded with before appear in a dropdown when you start a new deal.
- **Bills:** PDF documents download from the deal page as each step is reached: trade agreement, deposit and balance invoices or receipts, refund note and closing statement.

## Environment settings

Use [`backend/.env.example`](backend/.env.example) as a template, then enter private values in `backend/.env`:

| Variable | Local/default setting or purpose |
|---|---|
| `APP_ENV` | `development` locally; `production` requires PostgreSQL TLS, HTTPS origins and Supabase Storage |
| `DATABASE_URL` | `sqlite:///./trustcargo.db` locally; cloud Session Pooler URI with `sslmode=require` (or stronger certificate verification) |
| `FRONTEND_URL` | `http://localhost:3000`; used by origin checks, invitation links and PayPal return URLs |
| `PAYPAL_BASE_URL` | `https://api-m.sandbox.paypal.com`; keep Sandbox for the hackathon |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Sandbox REST app credentials; required for payment requests |
| `PAYPAL_WEBHOOK_ID` | ID of the registered Sandbox webhook; required for webhook verification |
| `GROQ_API_KEY` | Required for live model requests; leave blank for rule-based behavior |
| `GROQ_MODEL`, `GROQ_VISION_MODEL` | Model IDs listed above; configurable through environment variables |
| `STORAGE_BACKEND`, `UPLOAD_DIR` | `local`, `uploads` for development |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET` | For `STORAGE_BACKEND=supabase`: project HTTPS URL, backend secret (or legacy service-role key), and private bucket `trustcargo-evidence` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `EMAIL_FROM` | Optional SMTP invitation delivery; default port 587 with STARTTLS. Without configuration, use the copy-link flow |

In `frontend/.env.local`, `API_URL` is the backend origin without `/api` (local default `http://localhost:8000`). The site forwards `/api` requests there, so the sign-in cookie stays first-party. Set it before `npm run build` when hosting. `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is present in the example but is not used by the current hosted-redirect checkout; no frontend PayPal secret is required.

Never commit private environment files or put backend credentials in `NEXT_PUBLIC_` variables, screenshots or submission text. The examples contain variable names and safe defaults, not real credentials.

## Tests

From `backend`, with the virtual environment active:

```bash
python -m pytest tests -q
```

From `frontend`, the browser tests are described in `frontend/TESTING.md`:

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Backend workflow tests mock PayPal and disable live Groq calls; model-adapter tests use mocked HTTP responses. Browser tests intercept API responses. These checks do not establish live integration success. See [frontend testing notes](frontend/TESTING.md) and the deployment guide for opt-in cloud checks.

Separately, `python -m scripts.sandbox_payment_test 10 2` from `backend` starts an interactive **real Sandbox API** exercise: create a test order, manually approve it with a Sandbox buyer, capture it, then request a partial refund. It is not an offline unit test. Do not run it with production credentials.

### Verification status

During the submission review, a read-only Sandbox order retrieval confirmed an existing completed order and a matching completed capture. That verifies one stored Sandbox payment, not every workflow. Local data also contains a negotiation marked `ai`, which alone does not independently prove a live Groq response. Live refunds, tracking submission, webhook delivery, model inference and hosted cloud workflows remain unverified by that review. The manual scripts and automated test results must not be presented as evidence that every external integration has succeeded.

## Demo limits

- There is no password reset or email verification yet.
- Only the seller records milestones/delays; no carrier account or live carrier API feed is implemented.
- Development evidence uses local files; production evidence uses a private Supabase Storage bucket through authorized FastAPI endpoints. SQLite data and local files are not automatically migrated to Supabase.
- Staged payments are not true escrow.
- AI recommends refunds, but a person must approve them.
- Negotiation acceptance safeguards have the known gap described above. Evidence review and generated explanations have not been accuracy-validated.

## Project structure

- `frontend/`: Next.js web app
- `backend/`: FastAPI API, AI agents, PayPal services and tests
- `docs/`: [Architecture](docs/architecture.md) and [Render/Supabase deployment](docs/render-supabase.md)

## License

Licensed under the MIT License. See [LICENSE](LICENSE).
