# OctoSupply API (TypeScript)

Express + TypeScript reference implementation of the OctoSupply API. The C#, Python, and Java variants are ports of this service.

## Run

```bash
npm install
npm run dev
```

Default API URL: `http://localhost:3000`

## Environment

- `PORT` (default: `3000`)
- `DB_FILE` (default: `./data/app.db`)
- `API_CORS_ORIGINS` (comma-separated override; optional)
- `DB_ENABLE_WAL` (enable WAL mode; default: `true`)
- `DB_FOREIGN_KEYS` (enforce foreign keys; default: `true`)
- `DB_TIMEOUT` (busy timeout in ms; default: `30000`)
- `PAYMENT_SIMULATION_ENABLED` (set to `true` to enable simulated checkout)
- `PAYMENT_TOTP_SECRET` (Base32 secret with at least 128 bits; required when payment simulation is enabled)
- `PAYMENT_TOTP_ISSUER` (Google Authenticator issuer; default: `OctoCAT Supply Demo`)
- `OPENAI_API_KEY` (required for `POST /api/chat`; server-side only)
- `OPENAI_API_BASE` (default: `https://api.openai.com/v1`)
- `OPENAI_CHAT_MODEL` (default: `gpt-4.1-mini`)
- `OPENAI_EMBEDDING_MODEL` (default: `text-embedding-3-small`)
- `CHAT_TOP_K` (retrieved catalog sources; default: `5`, maximum: `8`)
- `CHAT_MIN_SCORE` (minimum cosine-similarity score; default: `0.25`)

For local development, the API loads `.env` from the current directory, `src/`,
or the repository root without overriding variables already supplied by the
shell. Keep `.env` out of source control and rotate any credential that has
been pasted into logs, issues, or chat messages.

## Catalog assistant

`POST /api/chat` accepts `multipart/form-data` with a text `message`, one
optional `image`, and optional JSON-encoded `history`. The image must be JPEG,
PNG, or WebP and no larger than 5 MB. History is limited to six messages.

The assistant builds product and supplier knowledge from SQLite, caches catalog
embeddings in the API process, and asks OpenAI to answer only from the retrieved
sources. Uploaded images are sent directly to the vision-capable chat model,
converted to search intent, and discarded after the request. Images and chat
history are not persisted.

The POC covers product discovery, pricing, discounts, recommendations, and
supplier status. Order and delivery questions are not included yet.

Generate a development-only TOTP secret without adding it to source control:

```bash
node -e "import('otplib').then(({ generateSecret }) => console.log(generateSecret()))"
```

Start the API with the simulator enabled:

```bash
PAYMENT_SIMULATION_ENABLED=true \
PAYMENT_TOTP_SECRET='<generated-base32-secret>' \
npm run dev
```

The checkout UI exposes a QR code and manual key for Google Authenticator. This provider is a demo:
it does not process money or accept real card numbers.

## Database

On startup, the API applies SQL migrations from:

- `../database/migrations/*.sql`

and seeds from:

- `../database/seed/*.sql`

## OpenAPI

- OpenAPI JSON: `http://localhost:3000/api-docs.json`
- Swagger UI: `http://localhost:3000/api-docs`

## Tests

Run TypeScript tests from the `src/` directory:

```bash
make test-ts
```
