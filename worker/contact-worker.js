/**
 * Lumshot — Contact form Worker (Cloudflare Workers)
 * -------------------------------------------------------------
 * Receives a JSON POST from contact.html and forwards it as an
 * email via the Resend API (https://resend.com). The Resend API
 * key lives ONLY here as a Worker secret — it is never exposed to
 * the browser.
 *
 * The email is delivered to CONTACT_TO with Reply-To set to the
 * visitor's address, so replying from your inbox goes straight
 * back to them.
 *
 * ---- Deploy (see worker/README.md for the full walkthrough) ----
 *   wrangler deploy
 *   wrangler secret put RESEND_API_KEY      # paste your re_... key
 *
 * ---- Config: set these as vars in wrangler.toml (or edit the
 *      fallbacks below). ----
 *   CONTACT_TO      inbox that receives messages (e.g. contact@lumshot.app)
 *   CONTACT_FROM    verified sender. "onboarding@resend.dev" works with no
 *                   DNS setup; switch to "Lumshot <contact@lumshot.app>"
 *                   after verifying lumshot.app in Resend.
 *   ALLOWED_ORIGIN  your site origin for CORS (e.g. https://lumshot.app).
 *                   Use "*" while testing locally.
 */

const DEFAULTS = {
  CONTACT_TO: 'contact@lumshot.app',
  CONTACT_FROM: 'Lumshot Contact <onboarding@resend.dev>',
  ALLOWED_ORIGIN: '*',
};

export default {
  async fetch(request, env) {
    const cfg = {
      CONTACT_TO: env.CONTACT_TO || DEFAULTS.CONTACT_TO,
      CONTACT_FROM: env.CONTACT_FROM || DEFAULTS.CONTACT_FROM,
      ALLOWED_ORIGIN: env.ALLOWED_ORIGIN || DEFAULTS.ALLOWED_ORIGIN,
    };

    const cors = {
      'Access-Control-Allow-Origin': cfg.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }

    if (!env.RESEND_API_KEY) {
      return json({ error: 'Server not configured' }, 500, cors);
    }

    // Parse + validate input
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid request' }, 400, cors);
    }

    const name = clean(body.name, 100);
    const email = clean(body.email, 200);
    const subject = clean(body.subject, 150);
    const message = clean(body.message, 5000);

    // Honeypot: bots fill hidden fields; humans leave them empty.
    if (typeof body.company === 'string' && body.company.trim() !== '') {
      // Pretend success so bots get no signal.
      return json({ ok: true }, 200, cors);
    }

    if (!name || !email || !message) {
      return json({ error: 'Please fill in your name, email, and message.' }, 400, cors);
    }
    if (!isEmail(email)) {
      return json({ error: 'Please enter a valid email address.' }, 400, cors);
    }

    const finalSubject = subject
      ? `[Lumshot] ${subject}`
      : `[Lumshot] New message from ${name}`;

    // Send via Resend
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: cfg.CONTACT_FROM,
          to: [cfg.CONTACT_TO],
          reply_to: email,
          subject: finalSubject,
          text: buildText({ name, email, subject, message }),
          html: buildHtml({ name, email, subject, message }),
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        console.error('Resend error', res.status, detail);
        return json({ error: 'Could not send your message. Please try again.' }, 502, cors);
      }

      return json({ ok: true }, 200, cors);
    } catch (err) {
      console.error('Send failed', err);
      return json({ error: 'Could not send your message. Please try again.' }, 502, cors);
    }
  },
};

/* ---------- helpers ---------- */

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildText({ name, email, subject, message }) {
  return [
    `New message from the Lumshot contact form`,
    ``,
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Subject: ${subject || '(none)'}`,
    ``,
    `Message:`,
    message,
    ``,
    `Reply to this email to respond directly to ${name}.`,
  ].join('\n');
}

function buildHtml({ name, email, subject, message }) {
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  return `<!doctype html><html><body style="margin:0;background:#0A0B0D;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#14161B;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.08);">
        <span style="color:#5EE0CB;font-weight:700;font-size:14px;letter-spacing:.02em;">LUMSHOT · Contact form</span>
      </div>
      <div style="padding:24px;color:#EDEDF2;font-size:15px;line-height:1.6;">
        <p style="margin:0 0 4px;color:rgba(237,237,242,.55);font-size:12px;">FROM</p>
        <p style="margin:0 0 16px;"><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p>
        <p style="margin:0 0 4px;color:rgba(237,237,242,.55);font-size:12px;">SUBJECT</p>
        <p style="margin:0 0 16px;">${escapeHtml(subject) || '<em style="color:rgba(237,237,242,.5)">(none)</em>'}</p>
        <p style="margin:0 0 4px;color:rgba(237,237,242,.55);font-size:12px;">MESSAGE</p>
        <div style="margin:0;padding:16px;background:rgba(255,255,255,.03);border-radius:10px;border:1px solid rgba(255,255,255,.06);">${safeMessage}</div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,.08);color:rgba(237,237,242,.45);font-size:13px;">
        Reply to this email to respond directly to ${escapeHtml(name)}.
      </div>
    </div>
  </body></html>`;
}
