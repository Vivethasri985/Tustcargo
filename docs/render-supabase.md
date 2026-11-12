# TrustCargo: Render Free and Supabase

## Prepared state

Work is limited to `deploy/trustcargo-demo`. No cloud project or bucket has been
created or verified by this code change. No deployment, purchase, commit, push,
database reset, or data migration is performed. The Supabase account connection
must be authorized separately. The local SQLite database, environment files and
uploads stay in place.

Use Supabase PostgreSQL and a **private** Supabase Storage bucket. Both Render
services use the Free plan in Singapore; no persistent disk is needed. Keep
PayPal in sandbox mode. The app retains its own authentication and authorization;
Supabase Auth and browser Supabase clients are unnecessary.

## 1. Supabase project and bucket (manual dashboard steps)

1. Sign in at https://supabase.com/dashboard and inspect **all relevant
   organizations** for an existing TrustCargo project. Reuse it only after
   checking its owner, region, tables and intended purpose. Do not create a
   duplicate or change an existing project's schema without approval.
2. If none exists, choose **New project**, select an organization on the **Free**
   plan, name it `trustcargo-demo`, and select **Southeast Asia (Singapore)**
   (`ap-southeast-1`) when available. Use Singapore for Render too. If that
   combination is unavailable, choose a nearby matching region before creation.
   Store the database password in a password manager; never send it in chat.
   Project creation is a manual action requiring the account owner's approval.
3. Open **Connect → Session pooler**. Copy the exact host and username supplied
   by the dashboard. Use database `postgres`, port **5432**, and TLS. The username
   is normally `postgres.<project-ref>`; do not guess the pooler hostname.
4. Store the connection URI only in the backend's private `DATABASE_URL`:

   ```text
   postgresql://postgres.<project-ref>:<percent-encoded-password>@<session-pooler-host>:5432/postgres?sslmode=require
   ```

   Encode special password characters. If the URI already has query parameters,
   append `&sslmode=require` instead. `verify-full` with a trusted Supabase CA
   certificate is stronger and also supported. Do not use port 6543 transaction
   pooling for this deployment; the adapter does not disable prepared statements.
   Enable database SSL enforcement in Supabase's database settings if available.
5. In **Data API integration overview**, turn **Enable Data API** off. These
   tables include password/session hashes and private deal limits; the browser
   must access them only through FastAPI. Disabling the PostgREST Data API does
   not require disabling Storage. Do not add public table or bucket policies.
6. Open **Storage → New bucket**, name/ID `trustcargo-evidence`, leave **Public
   bucket OFF**, and create it only after the account owner approves. Set the
   file limit to **5 MiB / 5,242,880 bytes** and allow `image/jpeg`, `image/png`,
   `image/webp`, `application/pdf`. Do not add anonymous or authenticated-user
   policies. Backend secret access bypasses Storage RLS, so FastAPI enforces
   deal authorization before reading files.
7. In **Project Settings → API Keys**, obtain a backend **secret key**
   (`sb_secret_...`), or use the legacy `service_role` key. Store it privately as
   `SUPABASE_SECRET_KEY`. Obtain the project HTTPS API URL for `SUPABASE_URL`.
   Never use a publishable/anon key for this adapter. No Supabase secrets go in
   frontend variables, Git, screenshots, command-line arguments, or chat.

## 2. Render environment

`render.yaml` specifies two Free web services on `deploy/trustcargo-demo`, with
automatic deployments off. Applying a Blueprint still creates services and
starts an initial deployment: **do not apply it until deployment is approved**.

| Service | Setting | Value |
| --- | --- | --- |
| Backend | Runtime / root | Python / `backend` |
| Backend | Build | `pip install -r requirements.txt` |
| Backend | Start | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Backend | Health | `/api/health` |
| Frontend | Runtime / root | Node / `frontend` |
| Frontend | Build | `npm ci && npm run build` |
| Frontend | Start | `npm start` |
| Both | Branch / region / plan | `deploy/trustcargo-demo` / Singapore / Free |

Set private values in the Render dashboard, never in tracked files:

| Backend variable | Value |
| --- | --- |
| `DATABASE_URL` | Session pooler URI with `sslmode=require` |
| `SUPABASE_URL` | Project API origin, `https://<project-ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Server secret or legacy service-role key |
| `SUPABASE_STORAGE_BUCKET` | `trustcargo-evidence` (provided) |
| `STORAGE_BACKEND` | `supabase` (provided) |
| `APP_ENV` | `production` (provided) |
| `FRONTEND_URL` | Actual frontend HTTPS origin, without a trailing slash |
| `PAYPAL_BASE_URL` | `https://api-m.sandbox.paypal.com` (provided) |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Same PayPal sandbox application |
| `PAYPAL_WEBHOOK_ID` | Sandbox webhook for this backend |
| `GROQ_API_KEY` | Optional; blank uses the existing labeled rule-based fallback |
| `PYTHON_VERSION` | `3.12.4` (provided, matching local validation) |

| Frontend variable | Value |
| --- | --- |
| `API_URL` | Actual backend HTTPS origin, **without `/api`**, available at build time |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Optional sandbox public client ID; current checkout uses backend redirect links |
| `NODE_VERSION` | `22` (provided) |

`PORT` is supplied by Render. Next.js uses it through `next start`. The frontend
already forwards `/api/*` to FastAPI and uses first-party HttpOnly session
cookies. No frontend source change is required. If `API_URL` changes, rebuild
the frontend. If `FRONTEND_URL` changes, restart/redeploy the backend so CORS,
origin checks, invitations and PayPal return links use the new origin.

SMTP is intentionally not declared for Render Free, which blocks outbound
ports 25, 465 and 587. Use the existing copy-invitation-link flow for the demo.
Email delivery would need a separately implemented HTTPS email provider or a
provider supporting a permitted port; it is not implemented by this change.

## 3. Database and storage behavior

- SQLAlchemy already normalizes `postgres://` and `postgresql://` to the psycopg
  driver. Connection health is checked when pooled connections are reused.
- Production startup requires PostgreSQL with TLS, HTTPS frontend/Supabase URLs,
  Supabase storage configuration, and a bucket that is verifiably private. It
  refuses SQLite/local storage in production rather than losing cloud data.
- Startup creates the seven application tables, adds missing columns with the
  existing limited helper, and backfills deal references. There is no Alembic
  history. This is suitable for a fresh demo database, not a general migration
  strategy for a populated production schema. Use one backend process for this
  demo; coordinate future schema updates explicitly.
- New cloud evidence stores a `supabase:` object-name marker in existing metadata.
  Upload validation, hashes and existing `/api/deals/{id}/evidence/{id}` URLs are
  retained. Downloads proxy bytes through FastAPI after authentication and deal
  access checks; they expose neither public URLs nor bearer signed URLs.
- Both shipping verification and claim review read the same storage adapter.
  Images and PDFs are processed from memory, with no persistent cloud disk/cache.
- Development defaults remain SQLite and local files. Existing local evidence
  names still read from `UPLOAD_DIR` even after switching new uploads to Supabase.
  Cloud outages return sanitized errors, never silently write evidence to an
  ephemeral local directory.
- Switching `DATABASE_URL` does **not** copy SQLite records. Starting with a new
  cloud database leaves local users, sessions, deals and uploads intact but does
  not make them visible in the cloud demo. If existing records must appear
  online, stop and plan a separately approved export/import preserving IDs,
  relationships, password/session hashes and evidence bytes. Uploaded local
  files must also be copied and their storage metadata mapped; do not reset or
  delete the SQLite database. No migration is performed here.
- Object storage and SQL transactions are not atomic. An upload followed by a
  failed database transaction can leave an unreferenced object. No automatic
  deletion/cleanup is performed; review such objects before any manual cleanup.

## 4. Validation and eventual launch

Run backend tests from `backend` with the existing virtual environment:

```text
python -m pytest tests -q
```

If the machine's default pytest temporary directory is inaccessible, use a new,
empty directory with `--basetemp`; never point it at existing uploads/data.
Unit tests isolate cloud storage and mock external PayPal/AI requests. They
include local and remote evidence, authorization, failure handling, PDF/image
inspection, configuration guards and PostgreSQL DDL compilation.

Live integration checks are opt-in and read-only. Set secrets privately in the
process environment (not in command arguments):

- `TRUSTCARGO_TEST_POSTGRES_URL`: a dedicated PostgreSQL test URI with TLS enables
  the connection/SSL integration test. It does not create or drop tables.
- `TRUSTCARGO_TEST_SUPABASE_READ_ONLY=1`, plus the three Supabase settings above,
  enables the private-bucket integration test. It does not upload/delete objects.

With the deployment settings present privately, run:

```text
python -m scripts.check_cloud
```

This command checks connectivity, TLS, table existence and bucket privacy
without initializing/migrating the database or changing storage. Before initial
deployment, missing application tables are reported as unverified. It never
prints credentials or raw upstream exceptions. A complete live upload/download
round trip is still required after deployment approval.

From `frontend`, run `npm run build`, then `npm run test:e2e`.

When separately authorized to publish and deploy:

1. Review the final diff, then commit/push **only the deployment branch**. Render
   cannot deploy local uncommitted changes. Keep main and V2 untouched.
2. Create the two Render services/Blueprint from that branch on Free. Check the
   actual assigned backend/frontend URLs and enter the environment values above.
   Do not assume the desired service names are available as exact hostnames.
3. Set frontend `API_URL` before its build. Set backend `FRONTEND_URL` to the final
   frontend URL, then deploy/redeploy as needed. The initial backend startup
   initializes the new schema only after bucket/config checks pass.
4. In PayPal's **sandbox** application, register
   `https://<actual-backend-host>/api/webhooks/paypal` for
   `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, and
   `PAYMENT.CAPTURE.REFUNDED`. Enter that webhook's ID in the backend.
5. Confirm `/api/health` on both backend and frontend origins returns success;
   it now queries the database. Run the read-only cloud check too.
6. With two demo accounts, verify login/reload, invitation, private limits,
   negotiation, approvals, deposit, shipment evidence, authorized download,
   balance, tracking/delivery, claim evidence and sandbox refund. Verify a third
   account cannot retrieve evidence. Restart the backend and recheck records and
   evidence to confirm persistence.

## Free-tier limits and outstanding verification

Render Free services sleep after inactivity, can have roughly minute-long cold
starts, share monthly free-instance hours, and have ephemeral filesystems. Both
services can be asleep before a demo. Open the backend health URL, then the
frontend before presenting. Supabase Free quotas and inactivity pauses can also
affect availability; check current dashboard usage. No paid resources are used
or provisioned by this repository change. Live credentials, region capacity,
cloud initialization, upload round trips and PayPal webhook delivery must be
verified in the eventual hosted environment.

References:
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/storage/quickstart
- https://supabase.com/docs/guides/storage/serving/downloads
- https://render.com/docs/blueprint-spec
- https://render.com/docs/free
