const nodemailer = require('nodemailer');

// Setup Transporter
function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null; // SMTP not configured yet
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Send Welcome Email to newly registered user
 * @param {string} toEmail - User's email
 * @param {string} displayName - User's name
 */
async function sendWelcomeEmail(toEmail, displayName = 'Developer') {
  try {
    const transporter = getTransporter();
    const name = displayName || 'Developer';
    const fromAddress = process.env.SMTP_FROM || `"Crack It" <${process.env.SMTP_USER || 'no-reply@crackit.app'}>`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Crack It</title>
      <style>
        body { margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; }
        .container { max-width: 600px; margin: 30px auto; background-color: #13111c; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%); padding: 36px 24px; text-align: center; }
        .logo { font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin: 0; }
        .tagline { color: #e9d5ff; font-size: 14px; margin-top: 6px; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 16px; }
        .text { font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px; }
        .credit-box { background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .credit-title { font-size: 14px; color: #a78bfa; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .credit-amount { font-size: 32px; font-weight: 800; color: #ffffff; margin: 6px 0; }
        .credit-sub { font-size: 13px; color: #94a3b8; }
        .step-list { margin: 24px 0; padding: 0; list-style: none; }
        .step-item { display: flex; align-items: flex-start; margin-bottom: 16px; }
        .step-num { background: #7c3aed; color: white; width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0; }
        .step-text { font-size: 14px; color: #e2e8f0; line-height: 1.5; }
        .btn-wrapper { text-align: center; margin: 32px 0 16px 0; }
        .btn { display: inline-block; background: #7c3aed; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(124,58,237,0.4); }
        .footer { padding: 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #64748b; }
        .footer a { color: #7c3aed; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">⚡ Crack It</div>
          <div class="tagline">AI Technical Interview Copilot</div>
        </div>
        <div class="content">
          <div class="greeting">Welcome aboard, ${name}! 🎉</div>
          <p class="text">
            Thank you for creating an account with <strong>Crack It</strong>. You are now equipped with the stealthiest, ultra-fast AI interview assistant designed to help you ace your senior developer interviews.
          </p>

          <div class="credit-box">
            <div class="credit-title">💎 Your Starter Balance</div>
            <div class="credit-amount">15 Free Credits</div>
            <div class="credit-sub">Ready to use right away for Voice, Text & Screenshot OCR!</div>
          </div>

          <div style="font-weight: 700; color: #ffffff; font-size: 16px; margin-top: 24px;">🚀 How to get started in 3 steps:</div>
          <ul class="step-list">
            <li class="step-item">
              <span class="step-num">1</span>
              <div class="step-text"><strong>Download the App:</strong> Install Crack It for Windows and log in with your email.</div>
            </li>
            <li class="step-item">
              <span class="step-num">2</span>
              <div class="step-text"><strong>Stealth Safe:</strong> The overlay is 100% invisible to screen shares (Zoom, MS Teams, Google Meet).</div>
            </li>
            <li class="step-item">
              <span class="step-num">3</span>
              <div class="step-text"><strong>Press Spacebar:</strong> Speak the question and get answers in 300ms powered by Groq & Gemini.</div>
            </li>
          </ul>

          <div class="btn-wrapper">
            <a href="http://localhost:3000/dashboard" class="btn">Launch Dashboard →</a>
          </div>
        </div>
        <div class="footer">
          © 2026 Crack It AI. All rights reserved.<br>
          Need help? Reply directly to this email or visit <a href="http://localhost:3000">crackit.app</a>.
        </div>
      </div>
    </body>
    </html>
    `;

    if (!transporter) {
      console.log(`[EMAIL INFO] SMTP not configured. Welcome email simulated for ${toEmail}`);
      return { success: true, simulated: true };
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `🎉 Welcome to Crack It — 15 Free Credits Added!`,
      html: htmlContent,
    });

    console.log(`[EMAIL SUCCESS] Welcome email sent to ${toEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send welcome email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendWelcomeEmail,
};
