# Architecture

The browser talks to the FastAPI backend. The backend owns all private keys and calls the Claude API and PayPal REST APIs.

```text
Next.js frontend -> FastAPI backend -> Claude API
                                    -> PayPal REST APIs
PayPal webhooks  -> FastAPI backend -> SQLite
```

## Payment design

- The deposit and balance are separate PayPal orders.
- The backend stores each `capture_id`.
- A partial refund uses the capture ID of the balance payment.
- AI only recommends a refund. A person must approve it.

## Secrets

Private keys stay in `backend/.env`. Only values prefixed with `NEXT_PUBLIC_` reach the browser.
