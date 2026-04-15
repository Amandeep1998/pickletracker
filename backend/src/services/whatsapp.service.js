const twilio = require('twilio');

const getClient = () => {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
};

/**
 * Send a plain-text WhatsApp message via Twilio.
 * `to` is stored in our DB as "919XXXXXXXXX" (no + prefix).
 */
const send = async (to, body) => {
  const client = getClient();
  if (!client) {
    console.warn('[WhatsApp] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set — skipping send');
    return { ok: false, skipped: true, reason: 'missing_env' };
  }

  const from = process.env.TWILIO_WHATSAPP_FROM || '+14155238886';

  try {
    const message = await client.messages.create({
      from: `whatsapp:${from}`,
      to:   `whatsapp:+${to}`,
      body,
    });
    console.log(`[WhatsApp] Sent to ${to}, SID: ${message.sid}`);
    return { ok: true, sid: message.sid };
  } catch (err) {
    console.error(`[WhatsApp] Twilio send to ${to} failed:`, err.message);
    return { ok: false, error: err.message };
  }
};

module.exports = { send };
