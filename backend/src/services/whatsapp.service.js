const GRAPH_URL = 'https://graph.facebook.com/v19.0';

/**
 * Send a plain-text WhatsApp message.
 * Errors are logged but not thrown — a failed send should not crash the webhook.
 */
const send = async (to, body) => {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
    console.warn('[WhatsApp] WHATSAPP_TOKEN or WHATSAPP_PHONE_ID not set — skipping send');
    return;
  }

  try {
    const res = await fetch(`${GRAPH_URL}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body, preview_url: false },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[WhatsApp] Send to ${to} failed (${res.status}):`, err);
    }
  } catch (err) {
    console.error(`[WhatsApp] Network error sending to ${to}:`, err.message);
  }
};

module.exports = { send };
