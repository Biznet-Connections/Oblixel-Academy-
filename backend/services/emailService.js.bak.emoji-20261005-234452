const { sendEmail } = require('../utils/resendClient');

/**
 * Send a 6-digit password reset code.
 */
async function sendPasswordResetCode({ to, name, code, expiresMinutes = 15 }) {
  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; background: #0a0a1a; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: linear-gradient(160deg, #1a1035, #0f0f23); border: 1px solid rgba(168,85,247,0.25); border-radius: 24px; padding: 40px 32px; color: #fff;">
        <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 900; background: linear-gradient(90deg,#a855f7,#06b6d4); -webkit-background-clip: text; background-clip: text; color: transparent;">obliXel Academy</h1>
        <p style="color: #9ca3af; font-size: 13px; margin: 0 0 24px;">Password Reset Code</p>

        <p style="font-size: 15px; margin: 0 0 16px;">Hi ${name || 'there'},</p>
        <p style="font-size: 14px; color: #d1d5db; margin: 0 0 24px;">
          You requested a password reset. Use the code below to set a new password.
        </p>

        <div style="background: rgba(168,85,247,0.12); border: 1px solid rgba(168,85,247,0.4); border-radius: 16px; padding: 24px; text-align: center; margin: 0 0 24px;">
          <p style="margin: 0 0 8px; font-size: 11px; color: #9ca3af; letter-spacing: 2px; text-transform: uppercase;">Your Code</p>
          <p style="margin: 0; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #06b6d4; font-family: monospace;">${code}</p>
        </div>

        <p style="font-size: 13px; color: #9ca3af; margin: 0 0 24px;">
          ⏱ This code expires in <strong style="color: #fff;">${expiresMinutes} minutes</strong>.
        </p>

        <p style="font-size: 12px; color: #6b7280; margin: 24px 0 0; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">
          If you didn't request this, ignore this email. Your password won't change.
        </p>
      </div>
    </div>
  `;

  const text = `obliXel Academy — Password Reset\n\nHi ${name || 'there'},\n\nYour reset code is: ${code}\n\nExpires in ${expiresMinutes} minutes.\n\nIf you didn't request this, ignore this email.`;

  return sendEmail({
    to,
    subject: `${code} is your obliXel password reset code`,
    html,
    text
  });
}

module.exports = { sendPasswordResetCode };
