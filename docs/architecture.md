# Architecture

The browser talks to the FastAPI backend. The backend owns all private keys and calls the Claude API and PayPal REST APIs.

```text
Next.js frontend -> FastAPI backend -> Claude API
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
- An inspection problem moves to `refund_suggested`, then `refunded` or `claim_rejected`.

## AI limits

Code enforces each negotiation limit and caps each refund at the affected goods and the balance payment. Uploaded files are treated as untrusted evidence. If Claude is unavailable, the app uses rule-based logic and labels it in the UI.
