# Architecture

The Next.js frontend forwards same-origin `/api` requests to FastAPI through `next.config.ts` rewrites. FastAPI owns authentication, deal permissions, model calls and PayPal requests. SQLAlchemy stores application records in SQLite locally or PostgreSQL in the prepared Supabase deployment.

```text
Browser -> Next.js /api proxy -> FastAPI -> Groq Chat Completions API
                                        -> PayPal REST APIs
                                        -> SQLite (local) / Supabase PostgreSQL
                                        -> Local files / private Supabase Storage
Browser <-> PayPal-hosted checkout
PayPal webhooks -> FastAPI /api/webhooks/paypal
```

## Payment design

- `PayPalClient` (`backend/app/services/paypal.py`) uses HTTPX, not a PayPal SDK. OAuth 2.0 client credentials obtain access tokens through `/v1/oauth2/token`. The default API host and Render configuration use `https://api-m.sandbox.paypal.com`.
- Orders API v2 creates separate deposit and balance orders, retrieves existing order status, captures approved orders, and submits shipment tracking. The default deposit is 30%; proof verification or buyer acceptance enables the balance payment. Tracking submission is attempted and can fail without undoing proof verification.
- `DealRoom` in the frontend obtains a backend-generated approval URL and redirects the buyer to hosted PayPal checkout. Returning from checkout invokes the backend capture route. The backend stores order/capture IDs and payment states, including pending captures.
- Payments API v2 requests a partial refund using the balance capture ID. The Judge recommends an amount; only seller approval calls PayPal. A request or stored `refunded` deal state is not proof of completed refund settlement: `refund_status` must be `COMPLETED`.
- `paypal_webhook()` receives `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, and `PAYMENT.CAPTURE.REFUNDED`. It calls `/v1/notifications/verify-webhook-signature` before processing. A missing `PAYPAL_WEBHOOK_ID` prevents verification. Event handling can initiate capture on order approval and update stored payment/refund state.
- These are staged Sandbox payments, not true escrow, marketplace seller onboarding or split payouts. ReportLab generates the application's PDF invoices; no PayPal Invoicing API is used.

## Secrets

Local secrets belong in ignored `backend/.env`; hosted secrets belong in backend environment settings. `PAYPAL_CLIENT_SECRET`, `GROQ_API_KEY`, the credentialed `DATABASE_URL` and `SUPABASE_SECRET_KEY` must never be committed or exposed to the browser. `NEXT_PUBLIC_` variables are public and must not contain secrets. Frontend `API_URL` configures the backend rewrite at build time; the example public PayPal client ID is unused by the current redirect checkout.

## Deal states

`invited` -> `negotiated` -> `approved` -> `deposit_paid` -> `shipment_verified` -> `balance_paid` -> `closed`

- Accepting an invitation triggers negotiation. Incompatible initial price limits or delivery timing produce `no_deal`; declining an invitation produces `declined`.
- Proof that doesn't match moves to `proof_review`. The buyer can accept it, or the seller can resubmit.
- After `shipment_verified`, the seller can record shipment updates through the Watcher. The buyer can inspect only after the balance is paid and delivery is recorded.
- An inspection problem moves to `refund_suggested`, then `refunded` or `claim_rejected`.

## AI provider, models and coordination

`backend/app/services/llm.py::ask_json()` sends HTTPX requests to Groq's OpenAI-compatible `/openai/v1/chat/completions` endpoint, with a server-side key, JSON-object response mode, temperature 0.2 and a 1,024-token completion limit. It checks required keys and basic value types, not the full semantic validity or accuracy of responses. No LangChain, CrewAI or AutoGen agent framework is used.

Text-only requests use `GROQ_MODEL`, default `openai/gpt-oss-120b`. Any request containing images uses `GROQ_VISION_MODEL`, default `qwen/qwen3.8-27b`. Images are encoded as data URLs. `file_bytes_block()` extracts at most 6,000 characters from PDFs using pypdf; there is no scanned-PDF OCR. An unreadable PDF becomes a note rather than visual document inspection.

The four agent workflows are ordinary Python functions invoked by user actions:

| Workflow | Backend entry point | Model inputs and output |
|---|---|---|
| Negotiation: buyer and seller roles | `api/deals.py::accept_invite()` -> `agents/negotiator.py::negotiate()` | Alternates prompted roles with their own private limit and a shared transcript; returns proposed price, transcript and mode |
| Shipping-proof checker | `api/shipments.py::submit_proof()` -> `agents/verifier.py::verify()` | Order/shipment details and newly uploaded proof; returns match decision, issues, summary and mode |
| Shipment Watcher | `api/shipments.py::mark_verified()` and `api/tracking.py::add_update()` -> `agents/watcher.py` | Recorded milestones/delays and code-calculated facts; returns risk facts plus generated explanations/actions |
| Refund Judge | `api/claims.py::submit_inspection()` -> `agents/judge.py::review()` | Buyer quantities, notes and current claim evidence; returns capped refund suggestion, reasoning and mode |

The frontend's `AcceptPanel`, `ShipmentForm`, `TrackingCard` and `InspectionForm` trigger these backend routes through `DealRoom` and the stage scenes. Only the negotiation roles exchange a transcript. The other workflows coordinate through stored deal state; there is no autonomous agent-to-agent messaging, scheduler, or background monitoring loop.

Missing keys, failed model requests or rejected output shapes trigger rule-based fallbacks. Negotiation, Watcher and Judge screens display AI/fallback badges. Proof-review screens display the explanation without an equivalent explicit mode badge. Uploaded evidence is marked untrusted in model prompts, but prompt instructions do not guarantee model correctness or confidentiality.

## Agent rules

- **Negotiators:** `offer_range()` normally starts offers 20-30% away from each role's limit and calculates later concessions of 4-10%, adjusted for limits and the other offer. The engine runs at most ten turns (five rounds). Explicit acceptance is enabled from the fourth turn, but equal offers can settle through a separate branch, so a minimum of four messages is not guaranteed. At the turn limit, code returns a clamped middle-price suggestion as an agreed outcome. On model failure, the arithmetic fallback supplies canned messages.
- **Known negotiation safety gap:** the explicit acceptance branch in `_ai_negotiation()` accepts the other offer without rechecking the accepting role's price limit. Review reproduced a seller accepting below its minimum and a buyer above its maximum. Initial feasibility and counteroffer checks do not guarantee every agreement stays within both limits. API responses hide private price-limit fields, but transcript messages are not mechanically redacted. Both parties must review and approve terms.
- **Proof checker:** an entered quantity mismatch always blocks a model pass. Without usable model output, only quantity equality determines the match decision; the fallback does not authenticate uploaded evidence. Carrier number-format validation is a separate regex check, not a carrier API lookup.
- **Watcher:** only the seller can record milestones and delays (1-14 days per delay, 60 days total). Code generates event days from a fixed seven-stage route and calculates risk levels (`on_track`, `at_risk`, `late`, `delivered`). AI writes explanations/actions but cannot alter stored dates or risk. Generated prose can still be inaccurate. There is no live carrier feed, location sensing or learned ETA prediction.
- **Judge:** code caps refund suggestions at missing-plus-damaged units times agreed unit price and the balance-payment amount. The fallback uses that formula. The prompt includes current claim evidence and selected order facts, not a complete independent investigation. Seller approval is required before a PayPal refund request.

## Database, evidence and hosting

Local defaults are SQLite (`sqlite:///./trustcargo.db`) and `STORAGE_BACKEND=local` under `UPLOAD_DIR=uploads`. `lifespan()` creates the seven tables, adds missing columns through the existing limited helper and backfills references. This is not a full migration system; preserve existing data and review older schemas explicitly. Switching to PostgreSQL does not migrate records or files.

The prepared `render.yaml` defines two Render Free services in Singapore on `deploy/trustcargo-demo`: Python/FastAPI and Node/Next.js. Production requires a PostgreSQL URL with TLS, HTTPS origins and Supabase Storage. PostgreSQL URLs are normalized to the psycopg driver; pooled connections use a health check. `/api/health` executes `SELECT 1`.

`storage.py::save_upload()` validates type/size and writes new production evidence to private Supabase Storage, recording a `supabase:` object-name marker and SHA-256 metadata. `read_upload()` retrieves cloud objects or existing local files. Both the download endpoint and AI evidence preparation use this adapter. Downloads remain behind FastAPI's deal authorization; no public bucket or signed bearer URL is sent to the frontend. Startup rejects a bucket that cannot be verified as private. Cloud failures return sanitized errors instead of silently falling back to ephemeral disk.

There is no paid disk requirement. Render Free cold starts and quotas can affect the demo; standard SMTP ports are blocked, so hosted invitations use the existing copy-link flow. Supabase project/bucket setup and live persistence still require verification. See [the deployment guide](render-supabase.md) for complete setup, environment variables and read-only checks.

## Accounts and access

- Each person signs up with an email and password. The password is hashed with scrypt. Sign-in sets an HttpOnly, SameSite=Lax cookie holding a random token; only its SHA-256 hash is stored.
- A deal has a `buyer_id` and a `seller_id`. Whoever starts it picks a side and enters only their own limit. The other side is invited by email and joins with their limit, which starts the negotiation.
- Deal-specific routes load the deal through a shared access check. People who aren't on the deal get 404, and actions by the wrong side get 403 (only the buyer pays and inspects, only the seller ships, updates tracking and decides refunds).
- Each response is shaped for the viewer: it includes `viewer_role` and `next_actor`, and hides the other side's private limit.
- State-changing requests with an `Origin` header are checked against `FRONTEND_URL`. PayPal webhook routes are exempt from that origin check and use signature verification instead.
- Invitation emails go out over SMTP after the response is sent. The result is saved as `invite_email_status`.

## Records

| Table | Holds |
|---|---|
| `deals` | Terms, status, reference ID, AI results |
| `payments` | PayPal order and capture IDs for the deposit and balance |
| `evidence` | Metadata and local/cloud object names; file bytes live in local files or Supabase Storage |
| `shipment_events` | Milestones and delays with optional notes |
| `deal_activity` | Who did what and when |
| `users` | Email, name, business, country and scrypt password hash |
| `sessions` | Hashed sign-in tokens with an expiry date |

## Verification boundaries

The submission review confirmed an existing Sandbox order and matching completed capture through a read-only PayPal lookup. A stored negotiation marked `ai` is supporting application state, not independent evidence of successful live inference. Live refunds, tracking submission, webhook delivery, model inference and hosted cloud workflows remain unverified by that review.

Automated workflow tests use fake PayPal responses and disable live Groq requests; adapter tests mock HTTP responses, and Playwright tests intercept backend APIs. These verify controlled behavior, not external-service availability or model accuracy. The interactive Sandbox payment/refund script makes actual Sandbox requests and must be run separately; its existence does not prove successful execution. See the [README](../README.md#tests) and [deployment verification checklist](render-supabase.md#4-validation-and-eventual-launch).
