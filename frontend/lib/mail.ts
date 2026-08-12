import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@smartattendance.com';

let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
} else {
  console.warn('SMTP environment variables are missing. Emails will be logged to console instead of sent.');
}

const sendMail = async (to: string, subject: string, html: string) => {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      });
      console.log(`Email sent successfully to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  } else {
    // Development fallback
    console.log('\n--- EMAIL LOG ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('HTML content omitted for brevity...');
    console.log('-----------------\n');
  }
};

const getBaseLayout = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
    .header { background-color: #18181b; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
    .content { padding: 40px 32px; color: #3f3f46; font-size: 16px; line-height: 1.6; }
    .footer { background-color: #fafafa; padding: 24px; text-align: center; color: #a1a1aa; font-size: 14px; border-top: 1px solid #f4f4f5; }
    .btn { display: inline-block; background-color: #18181b; color: #ffffff !important; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Smart Attendance</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Smart Attendance Inc. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

export const sendWelcomeEmail = async (email: string) => {
  const content = `
    <h2 style="color: #18181b; margin-top: 0;">Welcome aboard!</h2>
    <p>We're thrilled to have you join Smart Attendance.</p>
    <p>Your account has been successfully created. You can now log in and explore all the features we have to offer.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" class="btn">Log In Now</a>
    <p>If you have any questions, feel free to reply to this email.</p>
  `;
  await sendMail(email, 'Welcome to Smart Attendance!', getBaseLayout(content));
};

export const sendLoginAlertEmail = async (email: string) => {
  const content = `
    <h2 style="color: #18181b; margin-top: 0;">New Login Detected</h2>
    <p>We noticed a new login to your Smart Attendance account.</p>
    <p><strong>Time:</strong> ${new Date().toUTCString()}</p>
    <p>If this was you, you can safely ignore this email.</p>
    <p>If you do not recognize this activity, please reset your password immediately and contact support.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/forgot-password" class="btn">Reset Password</a>
  `;
  await sendMail(email, 'Security Alert: New Login Detected', getBaseLayout(content));
};

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
  const content = `
    <h2 style="color: #18181b; margin-top: 0;">Password Reset Request</h2>
    <p>We received a request to reset the password for your Smart Attendance account associated with this email address.</p>
    <p>Click the button below to set a new password. This link will expire in 1 hour.</p>
    <a href="${resetLink}" class="btn">Reset My Password</a>
    <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
  `;
  await sendMail(email, 'Reset your Smart Attendance password', getBaseLayout(content));
};
