# TrustCargo

An AI trade agent that helps small sellers and overseas buyers complete cross-border deals, with PayPal handling staged payments and refunds.

> Status: working sandbox demo. Payments use the PayPal sandbox, so no real money moves.

## Flow

1. Two AI agents bargain over several rounds within limits set by the buyer and seller.
2. Both people approve the deal.
3. **PayPal:** The buyer pays a 30% deposit.
4. The seller uploads shipping proof, and AI checks it against the order.
5. **PayPal:** Tracking is added, and the buyer pays the balance.
6. The Watcher agent tracks the shipment, flags delays and explains the risk.
7. After delivery, the buyer inspects the goods and reports any problem.
8. AI suggests a refund, and the seller approves or rejects it.
9. **PayPal:** The approved refund is sent.

## Tech stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, Lucide React, Framer Motion, tsParticles
- **Backend:** Python, FastAPI, SQLite
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

Open http://localhost:3000.

## PayPal usage

| PayPal tool | Used for |
|---|---|
| Orders API v2 | Creates and captures separate deposit and balance payments, and adds shipment tracking |
| Hosted PayPal checkout | Lets the buyer log in and approve each payment on PayPal |
| Payments API v2 | Sends the approved partial refund from the balance payment |
| Webhooks | Confirms payment and refund updates |
| Sandbox | Runs the full flow with test accounts |

## Environment settings

Add these to `backend/.env`:

- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`: from your PayPal sandbox app
- `GROQ_API_KEY`: from the Groq Console
- `PAYPAL_WEBHOOK_ID`: from the webhook you create in the PayPal dashboard, for hosted deployments

Add `NEXT_PUBLIC_API_URL` to `frontend/.env.local`.

Without `GROQ_API_KEY`, the app still runs in a clearly labeled rule-based demo mode. PayPal can't reach `localhost`, so webhooks need a hosted backend. The local flow captures payments when the buyer returns from PayPal.

## Tests

From `backend`, with the virtual environment active:

```bash
python -m pytest
python -m scripts.sandbox_payment_test
```

The first command runs automated tests with a mocked PayPal. The second runs a real sandbox payment and partial refund.

## Demo limits

- Buyer and seller use the same screen, and there is no login.
- Supplier data is sample data.
- Shipment updates are simulated with demo buttons, not live carrier data.
- Staged payments are not true escrow.
- AI recommends refunds, but a person must approve them.

## Project structure

- `frontend/`: Next.js web app
- `backend/`: FastAPI API, AI agents, PayPal services and tests
- `docs/`: Architecture notes

## License

MIT
