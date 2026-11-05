# TrustCargo

An AI trade agent that helps small sellers and overseas buyers complete cross-border deals, with PayPal handling staged payments and refunds.

> Status: starter project. The app structure runs, but the AI and PayPal features are not implemented yet.

## Planned flow

1. Two AI agents negotiate within limits set by the buyer and seller.
2. Both people approve the deal.
3. **PayPal:** The buyer pays a 30% deposit.
4. The seller uploads shipping proof, and AI checks it against the order.
5. **PayPal:** Tracking is added, and the buyer pays the balance.
6. The buyer inspects the goods and reports any problem.
7. AI suggests a refund, and the seller approves or rejects it.
8. **PayPal:** The approved refund is sent.

## Tech stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, Lucide React, Framer Motion, tsParticles
- **Backend:** Python, FastAPI, SQLite
- **AI:** Claude API
- **Payments:** PayPal Orders API v2, Payments API v2, Webhooks, JavaScript SDK v6, sandbox

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

## Project structure

- `frontend/`: Next.js web app
- `backend/`: FastAPI API, AI agents and PayPal services
- `docs/`: Architecture notes

## License

MIT
