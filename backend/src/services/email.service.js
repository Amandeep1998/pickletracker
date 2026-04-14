const { Resend } = require('resend');

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'PickleTracker <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Reset your PickleTracker password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: bold; color: #91BE4D;">Pickle</span><span style="font-size: 24px; font-weight: bold; color: #ec9937;">Tracker</span>
        </div>
        <h2 style="font-size: 20px; color: #272702; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          We received a request to reset your password. Click the button below to create a new one. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #ec9937; color: #ffffff; font-weight: bold; font-size: 14px; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin-bottom: 24px;">
          Reset Password
        </a>
        <p style="color: #9ca3af; font-size: 12px; line-height: 1.6;">
          If you didn't request a password reset, you can safely ignore this email. Your password will not change.
        </p>
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
        <p style="color: #d1d5db; font-size: 11px; text-align: center;">
          &copy; ${new Date().getFullYear()} PickleTracker. Built for the community.
        </p>
      </div>
    `,
  });
}

async function sendNotificationEmail({ to, subject, html }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping notification send');
    return { ok: false, skipped: true };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'PickleTracker <notifications@pickletracker.in>',
      to,
      subject,
      html,
    });
    if (error) {
      console.error('[Email] Send failed:', error);
      return { ok: false, error };
    }
    console.log(`[Email] Sent "${subject}" to ${to}, id: ${data.id}`);
    return { ok: true, id: data.id };
  } catch (err) {
    console.error('[Email] Exception:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendPasswordResetEmail, sendNotificationEmail };
