# Architecture

The browser talks to the FastAPI backend. The backend owns all private keys and calls the Groq API and PayPal REST APIs.

```text
Next.js frontend -> FastAPI backend -> Groq API
                                    -> PayPal REST APIs
PayPal webhooks  -> FastAPI b ackend -> SQLite
```

## Payment design

- The deposit and balance are separate PayPal orders.
- The backend stores each `capture_id`.
- A partial refund uses the capture ID of the balance payment.
- AI only recommends a refund. A person must appro ve it.

## Secrets

Private keys stay in `backend/.env`. Only values prefixed with `NEXT_PUBLIC_` reach the browser.

## Deal states

`negotiated` -> `approved` -> `deposit_paid` -> `shipment_verified` -> `balance_paid` -> `closed`

- Failed negotiations end at `no_deal`.
- Proof that doesn't match moves to `proof_review`. The buyer can accept it, or the seller can resubmit.
- After `shipment_verified`, the Watcher records shipment updates. The buyer can inspect only after delivery.
- An inspection problem moves to `refund_suggested`, then `refunded` or `claim_rejected`.

## AI limits

Code enforces each negotiation limit and caps each refund at the affected goods and the balance payment. Uploaded files are treated as untrusted evidence. If Groq is unavailable or returns an invalid result, the app uses rule-based logic and labels it in the UI.

Text requests use `GROQ_MODEL`. Requests with images use `GROQ_VISION_MODEL`. PDF proof is converted to text before it is sent.

## Agent rules

- **Negotiators:** Openings start 20% away from each private limit. Each later offer moves by at most 8% of the limit, never moves backwards, and never passes the other side's offer. Neither agent can accept before the fourth message.
- **Watcher:** The seller or carrier records each milestone or delay (1-14 days, 60 days in total). Code sets the timeline and risk level (`on_track`, `at_risk`, `late`, `delivered`). The AI only writes the explanation and the suggested action.
- **Database:** On startup the app adds any new columns to an existing SQLite database, so older demo data keeps working.

## Accounts and access

- Each person signs up with an email and password. The password is hashed with scrypt. Sign-in sets an HttpOnly, SameSite=Lax cookie holding a random token; only its SHA-256 hash is stored.
- A deal has a `buyer_id` and a `seller_id`. Whoever starts it picks a side and enters only their own limit. The other side is invited by email and joins with their limit, which starts the negotiation.
- Every route loads the deal through one access check. People who aren't on the deal get 404, and actions by the wrong side get 403 (only the buyer pays and inspects, only the seller ships, updates tracking and decides refunds).
- Each response is shaped for the viewer: it includes `viewer_role` and `next_actor`, and hides the other side's private limit.
- Changing requests must come from `FRONTEND_URL`, which blocks cross-site form posts. PayPal webhooks are exempt and are checked by signature instead.
- Invitation emails go out over SMTP after the response is sent. The result is saved as `invite_email_status`.

## Records

| Table | Holds |
|---|---|
| `deals` | Terms, status, reference ID, AI results |
| `payments` | PayPal order and capture IDs for the deposit and balance |
| `evidence` | Uploaded files with type, size and SHA-256 hash |
| `shipment_events` | Milestones and delays with optional notes |
| `deal_activity` | Who did what and when |
| `users` | Email, name, business, country and scrypt password hash |
| `sessions` | Hashed sign-in tokens with an expiry date |
