import nodemailer from 'nodemailer';
import { formatDate } from './utils';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const password =
      process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

    if (!host) {
      throw new Error('SMTP_HOST is not configured');
    }

    if (!user) {
      throw new Error('SMTP_USER is not configured');
    }

    if (!password) {
      throw new Error('SMTP_PASSWORD or SMTP_PASS is not configured');
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass: password,
      },
    });
  }

  return transporter;
}

export async function sendEmail(
  options: EmailOptions
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const mailer = getTransporter();

    const from =
      process.env.EMAIL_FROM ||
      process.env.SMTP_USER ||
      'SafeLink';

    const result = await mailer.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text:
        options.text ||
        options.html.replace(/<[^>]*>/g, ''),
    });

    console.log('Email sent successfully:', result.messageId);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Email send error:', error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error',
    };
  }
}

interface AlertEmailData {
  userName: string;
  userEmail: string;
  alertTime: Date;
  alertToken: string;
  accessToken: string;
  contactName: string;
  contactEmail: string;
  isTest?: boolean;
  locationUrl?: string;
}

export function generateAlertEmail(
  data: AlertEmailData
): {
  subject: string;
  html: string;
  text: string;
} {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  const alertUrl =
    `${appUrl}/access/alert/${data.accessToken}`;

  const locationUrl =
    data.locationUrl ||
    `${appUrl}/alert/${data.alertToken}`;

  const alertTime = formatDate(data.alertTime);
  const testPrefix = data.isTest ? '[TEST] ' : '';

  const subject =
    `${testPrefix}Emergency Alert: ${data.userName} may need assistance`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: #1e1e2e; border-radius: 12px; padding: 32px; border: 2px solid #dc2626;">

    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-flex; align-items: center; gap: 8px; background: #dc2626; color: white; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px;">
        EMERGENCY ALERT
      </div>
    </div>

    <h1 style="color: #dc2626; font-size: 24px; font-weight: 700; margin: 0 0 16px; text-align: center;">
      ${data.userName} triggered an emergency alert
    </h1>

    <p style="font-size: 16px; margin: 0 0 24px; text-align: center;">
      Hi ${data.contactName}, this is an automated emergency notification from SafeLink.
    </p>

    <div style="background: #0f0f1a; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #dc2626;">
      <p style="margin: 0 0 12px; font-size: 14px; color: #9ca3af;">
        <strong>Alert Time:</strong> ${alertTime}
      </p>

      <p style="margin: 0 0 12px; font-size: 14px; color: #9ca3af;">
        <strong>Alert Owner:</strong> ${data.userName} (${data.userEmail})
      </p>

      <p style="margin: 0; font-size: 14px; color: #9ca3af;">
        <strong>Status:</strong>
        <span style="color: #dc2626; font-weight: 600;">
          ACTIVE - Awaiting Response
        </span>
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a
        href="${alertUrl}"
        style="display: inline-block; background: #dc2626; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;"
      >
        View Emergency Alert
      </a>
    </div>

    <div style="text-align: center; margin: 16px 0;">
      <a
        href="${locationUrl}"
        style="display: inline-block; background: #1e1e2e; color: #9ca3af; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px; border: 1px solid #374151;"
      >
        View Live Location
      </a>
    </div>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #374151;">
      <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px; text-align: center;">
        This message was sent to you because ${data.userName} added you as an emergency contact.
      </p>

      <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px; text-align: center;">
        This link expires in 24 hours and can only be accessed by you.
      </p>

      <p style="font-size: 12px; color: #6b7280; margin: 0; text-align: center;">
        If you believe this was sent in error, please contact SafeLink support.
      </p>

      ${
        data.isTest
          ? '<p style="font-size: 12px; color: #f59e0b; margin: 16px 0 0; text-align: center; font-weight: 600;">⚠ THIS IS A TEST ALERT - No emergency response needed</p>'
          : ''
      }
    </div>

  </div>

  <div style="text-align: center; margin-top: 24px; padding: 16px;">
    <p style="font-size: 11px; color: #9ca3af; margin: 0;">
      SafeLink - Human Safety Platform | This is an automated message, please do not reply.
    </p>
  </div>

</body>
</html>
  `.trim();

  const text = `
EMERGENCY ALERT: ${data.userName} may need assistance

Hi ${data.contactName},

This is an automated emergency notification from SafeLink.

${data.userName} (${data.userEmail}) triggered an emergency alert at ${alertTime}.

Status: ACTIVE - Awaiting Response

View Emergency Alert: ${alertUrl}
View Live Location: ${locationUrl}

This message was sent to you because ${data.userName} added you as an emergency contact.

This link expires in 24 hours and can only be accessed by you.

${data.isTest ? 'THIS IS A TEST ALERT - No emergency response needed' : ''}

---
SafeLink - Human Safety Platform
  `.trim();

  return { subject, html, text };
}

interface ResolutionEmailData {
  userName: string;
  alertTime: Date;
  resolvedAt: Date;
  contactName: string;
  contactEmail: string;
  resolvedBy: 'user' | 'contact';
  isTest?: boolean;
}

export function generateResolutionEmail(
  data: ResolutionEmailData
): {
  subject: string;
  html: string;
  text: string;
} {
  const alertTime = formatDate(data.alertTime);
  const resolvedTime = formatDate(data.resolvedAt);
  const testPrefix = data.isTest ? '[TEST] ' : '';

  const resolvedByText =
    data.resolvedBy === 'user'
      ? `${data.userName} marked themselves as safe`
      : 'An emergency contact acknowledged the alert';

  const subject =
    `${testPrefix}Emergency Resolved: ${data.userName} is safe`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: #1e1e2e; border-radius: 12px; padding: 32px; border: 2px solid #16a34a;">

    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-flex; align-items: center; gap: 8px; background: #16a34a; color: white; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px;">
        EMERGENCY RESOLVED
      </div>
    </div>

    <h1 style="color: #16a34a; font-size: 24px; font-weight: 700; margin: 0 0 16px; text-align: center;">
      ${data.userName} is safe
    </h1>

    <p style="font-size: 16px; margin: 0 0 24px; text-align: center;">
      Hi ${data.contactName}, the emergency alert has been resolved.
    </p>

    <div style="background: #0f0f1a; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #16a34a;">

      <p style="margin: 0 0 12px; font-size: 14px; color: #9ca3af;">
        <strong>Original Alert:</strong> ${alertTime}
      </p>

      <p style="margin: 0 0 12px; font-size: 14px; color: #9ca3af;">
        <strong>Resolved:</strong> ${resolvedTime}
      </p>

      <p style="margin: 0; font-size: 14px; color: #9ca3af;">
        <strong>Resolution:</strong> ${resolvedByText}
      </p>

    </div>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #374151;">
      <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px; text-align: center;">
        Location sharing has been stopped for this alert.
      </p>

      ${
        data.isTest
          ? '<p style="font-size: 12px; color: #f59e0b; margin: 16px 0 0; text-align: center; font-weight: 600;">⚠ THIS WAS A TEST ALERT</p>'
          : ''
      }
    </div>

  </div>

</body>
</html>
  `.trim();

  const text = `
EMERGENCY RESOLVED: ${data.userName} is safe

Hi ${data.contactName},

The emergency alert for ${data.userName} has been resolved.

Original Alert: ${alertTime}
Resolved: ${resolvedTime}
Resolution: ${resolvedByText}

Location sharing has been stopped for this alert.

${data.isTest ? 'THIS WAS A TEST ALERT' : ''}

---
SafeLink - Human Safety Platform
  `.trim();

  return { subject, html, text };
}

export async function sendAlertEmail(
  data: AlertEmailData
): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
}> {
  const email = generateAlertEmail(data);

  return sendEmail({
    to: data.contactEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

export async function sendResolutionEmail(
  data: ResolutionEmailData
): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
}> {
  const email = generateResolutionEmail(data);

  return sendEmail({
    to: data.contactEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}