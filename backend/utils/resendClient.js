const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'obliXel Academy';

async function sendEmail({ to, subject, html, text }) {
  try {
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM}>`,
      to,
      subject,
      html: html || undefined,
      text: text || undefined
    });

    // New Resend SDK returns errors inside result.error instead of throwing
    if (result && result.error) {
      console.error('[Resend] API error:', result.error);
      return { success: false, message: result.error.message || 'Resend rejected the email', raw: result };
    }

    const id = result?.data?.id || result?.id || 'ok';
    console.log('[Resend] Sent to', to, 'id:', id);
    return { success: true, id, raw: result };
  } catch (err) {
    console.error('[Resend] Exception:', err.message, err?.response?.data || '');
    return { success: false, message: err.message };
  }
}

module.exports = { sendEmail };
