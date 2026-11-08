# TrustCargo

An AI trade agent that helps small sellers and overseas buyers complete cross-border deals, with PayPal handling staged payments and refunds.

> Status: working prototype. Payments use the PayPal sandbox, so no real money moves.

## Flow

1. A seller or a buyer signs in, starts a deal with their own private limit, and invites the other side by email.
2. The other person signs in with that email and adds their own private limit. Neither side ever sees the other's limit.
3. Two AI agents bargain over several rounds inside both limits.
4. Both people approve the deal, each from their own account.
5. **PayPal:** The buyer pays a 30% deposit.
6. The seller uploads shipping proof, and AI checks it against the order.
7. **PayPal:** Tracking is added, and the buyer pays the balance.
8. The seller records shipment updates and delays from the carrier. The Watcher agent explains the delivery risk.
9. After delivery, the buyer inspects the goods and reports any problem.
10. AI suggests a refund, and the seller approves or rejects it.
11. **PayPal:** The approved refund is sent.

Each action is checked on the server: only the buyer can pay or inspect, and only the seller can ship, update tracking or decide a refund. People who aren't on a deal get a not-found page, including for its files and bills.

## Tech stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, Lucide React, Framer Motion, tsParticles
- **Backend:** Python, FastAPI, SQLite or Postgres, email over SMTP
- **AI:** Groq API
- **Payments:** PayPal Orders API v2, Payments API v2, Webhooks, hosted PayPal checkout, sandbox

## Run locally

Requirements: Node.js 20+ and Python 3.11+.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000. Check http://localhost:8000/api/health.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env.local  # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:3000 and create an account. To try both sides on one computer, use a normal window for the seller and a private window for the buyer, each with its own email address.

If you're upgrading from an earlier version, delete `backend/trustcargo.db` once before starting, because older deals have no owners.

## PayPal usage

| PayPal tool | Used for |
|---|---|
| Orders API v2 | Creates and captures separate deposit and balance payments, and adds shipment tracking |
| Hosted PayPal checkout | Lets the buyer log in and approve each payment on PayPal |
| Payments API v2 | Sends the approved partial refund from the balance payment |
| Webhooks | Confirms payment and refund updates |
| Sandbox | Runs the full flow with test accounts |

## Data the backend keeps

- **Deal reference:** Each deal gets an ID such as `TC-7K2M9QXA`. PayPal orders carry it as `custom_id` and in a unique `invoice_id`.
- **Payments:** Order ID, capture ID and status for the deposit and the balance. Expired PayPal orders are replaced automatically.
- **Evidence:** Each file's type is checked from its contents, then stored with its size and SHA-256 hash. Files open from the deal page.
- **Tracking numbers:** DHL (10 digits), FedEx (12, 15, 20 or 22 digits) and UPS (`1Z` + 16 characters) are checked. Other carriers need 6-30 letters or digits.
- **Shipment events and activity log:** Every step records who did it and when.
- **Accounts:** Each person has an email and a password hashed with scrypt. Sign-in uses an HttpOnly session cookie, and repeated wrong passwords are slowed down.
- **Trade partners:** People you've traded with before appear in a dropdown when you start a new deal.
- **Bills:** PDF documents download from the deal page as each step is reached: trade agreement, deposit and balance invoices or receipts, refund note and closing statement.

## Environment settings

Add these to `backend/.env`:

- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`: from your PayPal sandbox app
- `GROQ_API_KEY`: from the Groq Console
- `PAYPAL_WEBHOOK_ID`: from the webhook you create in the PayPal dashboard, for hosted deployments
- `DATABASE_URL`: optional. SQLite is the default. A `postgres://` URL from a host such as Render also works
- `FRONTEND_URL`: the address people open the site at, for example `http://localhost:3000`. Invitation links use it, and only requests from this site are accepted
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `EMAIL_FROM`: to send invitation emails. For Gmail, use `smtp.gmail.com`, port `587` and an app password. Without these, the deal page shows a link to copy and send yourself

In `frontend/.env.local`, `API_URL` is the backend address (default `http://localhost:8000`). The site forwards `/api` requests there, so the sign-in cookie works without cross-site settings. Set it before `npm run build` when hosting.

Without `GROQ_API_KEY`, the app still runs in a clearly labeled rule-based demo mode. PayPal can't reach `localhost`, so webhooks need a hosted backend. The local flow captures payments when the buyer returns from PayPal.

## Tests

From `backend`, with the virtual environment active:

```bash
python -m pytest
python -m scripts.sandbox_payment_test
```

From `frontend`, the browser tests are described in `frontend/TESTING.md`:

```bash
npm run typecheck
npm run build
npm run test:e2e
```

The first backend command runs automated tests with a mocked PayPal. The second runs a real sandbox payment and partial refund.

## Demo limits

- There is no password reset or email verification yet.
- Shipment updates are entered by the seller or carrier, not pulled from a carrier API.
- Uploaded files are stored on the server disk. Use persistent storage when hosting.
- Staged payments are not true escrow.
- AI recommends refunds, but a person must approve them.

## Project structure

- `frontend/`: Next.js web app
- `backend/`: FastAPI API, AI agents, PayPal services and tests
- `docs/`: Architecture notes

## License

MIT
