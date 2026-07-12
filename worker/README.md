# Lumshot Contact Worker

A tiny Cloudflare Worker that receives the contact form submission from
`contact.html` and sends it to your inbox using [Resend](https://resend.com).

The Resend API key lives only in the Worker (as a secret). The browser never
sees it — that's the whole point of this extra piece.

## What you get

- Visitor submits **name / email / subject / message** on `contact.html`.
- Worker emails it to **contact@lumshot.app** with `Reply-To` set to the
  visitor, so hitting **Reply** in Gmail answers them directly.
- Spam honeypot + input validation + length caps built in.

## One-time setup

### 1. Get a Resend API key
- Sign up at https://resend.com → **API Keys** → create one (starts with `re_`).

### 2. Install Wrangler (Cloudflare's CLI)
```bash
npm install -g wrangler
wrangler login
```

### 3. Deploy the Worker
From this `worker/` folder:
```bash
wrangler deploy
```
Wrangler prints the Worker URL, e.g.
`https://lumshot-contact.<your-subdomain>.workers.dev`.

### 4. Add the Resend key as a secret
```bash
wrangler secret put RESEND_API_KEY
# paste your re_... key when prompted
```

### 5. Point the frontend at your Worker
In `../script.js`, set:
```js
const CONTACT_ENDPOINT = 'https://lumshot-contact.<your-subdomain>.workers.dev';
```
(There's a clearly-marked constant near the contact-form code.)

That's it — the form is live.

## Sending from your own domain (recommended, optional)

By default the email is sent from `onboarding@resend.dev`, which works
immediately with no DNS. To send from `contact@lumshot.app` instead:

1. In Resend → **Domains** → add `lumshot.app` and add the DNS records it
   shows (SPF/DKIM). Wait for verification.
2. In `wrangler.toml`, change:
   ```toml
   CONTACT_FROM = "Lumshot Contact <contact@lumshot.app>"
   ```
3. Redeploy: `wrangler deploy`.

> Note: You can't send **from** a Gmail address via Resend — Gmail is only the
> *destination* (`CONTACT_TO`). The `From` must be a Resend-verified sender.

## Tighten CORS for production

While testing, `ALLOWED_ORIGIN = "*"` is fine. Before launch, set it to your
real origin in `wrangler.toml` and redeploy:
```toml
ALLOWED_ORIGIN = "https://lumshot.app"
```

## Local test
```bash
wrangler dev
# then in script.js temporarily point CONTACT_ENDPOINT at the printed localhost URL
```
