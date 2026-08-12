import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

// Helper to get transporter dynamically from DB or fallback to ENV
const getTransporter = async () => {
  try {
    const record = await prisma.systemSettings.findUnique({
      where: { key: 'smtp' },
    });

    if (record && record.value) {
      const smtp = record.value as any;
      if (smtp.enabled && smtp.host && smtp.user && smtp.password) {
        return nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port || 587,
          secure: smtp.port === 465,
          auth: {
            user: smtp.user,
            pass: smtp.password,
          },
        });
      }
    }
  } catch (error) {
    console.error('Failed to load SMTP settings from DB:', error);
  }

  // Fallback to ENV vars
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return null;
};

const getFromEmail = async () => {
  try {
    const record = await prisma.systemSettings.findUnique({
      where: { key: 'smtp' },
    });
    if (record && record.value) {
      const smtp = record.value as any;
      if (smtp.enabled && smtp.from_addr) return smtp.from_addr;
      if (smtp.enabled && smtp.user) return smtp.user;
    }
  } catch (e) {}
  
  return process.env.FROM_EMAIL || 'no-reply@smartattendance.com';
};

const getHtmlTemplate = async (content: string) => {
  try {
    const record = await prisma.systemSettings.findUnique({
      where: { key: 'smtp' },
    });
    if (record && record.value) {
      const smtp = record.value as any;
      if (smtp.html_template) {
        return smtp.html_template.replace('{{message}}', content);
      }
    }
  } catch (e) {}
  
  return getBaseLayout(content);
};

const sendMail = async (to: string, subject: string, htmlContent: string) => {
  const transporter = await getTransporter();
  const fromEmail = await getFromEmail();
  const html = await getHtmlTemplate(htmlContent);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromEmail,
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
    <p>We're thrilled to have you join CoderNest.</p>
    <p>Your account has been successfully created. You can now log in and explore all the features we have to offer.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vision.codernest.cloud'}/login" class="btn">Log In Now</a>
    <p>If you have any questions, feel free to reply to this email.</p>
  `;
  await sendMail(email, 'Welcome to CoderNest!', content);
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const verifyLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vision.codernest.cloud'}/verify?token=${token}`;
  const content = `
    <h2 style="color: #18181b; margin-top: 0;">Verify your email</h2>
    <p>Welcome to CoderNest! Please verify your email address to activate your account.</p>
    <p>Click the button below to verify. This link will expire in 24 hours.</p>
    <a href="${verifyLink}" class="btn">Verify My Email</a>
    <p>If you did not sign up for CoderNest, please ignore this email.</p>
  `;
  await sendMail(email, 'Verify your CoderNest account', content);
};

export const sendLoginAlertEmail = async (email: string) => {
  const content = `
    <h2 style="color: #18181b; margin-top: 0;">New Login Detected</h2>
    <p>We noticed a new login to your CoderNest account.</p>
    <p><strong>Time:</strong> ${new Date().toUTCString()}</p>
    <p>If this was you, you can safely ignore this email.</p>
    <p>If you do not recognize this activity, please secure your account immediately.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vision.codernest.cloud'}/forgot-password" class="btn">Reset Password</a>
  `;
  await sendMail(email, 'Security Alert: New Login Detected', content);
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
  await sendMail(email, 'Reset your Smart Attendance password', content);
};
