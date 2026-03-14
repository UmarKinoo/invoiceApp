import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

// Email configuration
const emailFrom = process.env.EMAIL_FROM || 'noreply@example.com'
const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'

export interface EmailAttachment {
  filename: string
  /** Buffer for binary content (PDF, etc.); use path for remote URL (e.g. inline logo). */
  content?: Buffer
  /** Remote URL; Resend fetches and embeds. Use with contentId for inline images. */
  path?: string
  /** For inline images in HTML use src="cid:contentId" */
  contentId?: string
}

export interface EmailOptions {
  to: string
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

export async function sendEmail({ to, subject, html, attachments }: EmailOptions) {
  if (!resend) {
    console.warn('Resend API key not configured, skipping email send')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const data = await resend.emails.send({
      from: emailFrom,
      to,
      subject,
      html,
      attachments: attachments?.map((a) => {
        if (a.path && a.contentId) {
          return {
            filename: a.filename,
            path: a.path,
            inlineContentId: a.contentId,
          }
        }
        if (a.contentId && a.content) {
          const content =
            typeof a.content === 'string'
              ? a.content
              : (a.content as Buffer).toString('base64')
          return {
            filename: a.filename,
            content,
            inlineContentId: a.contentId,
          }
        }
        return {
          filename: a.filename,
          content: a.content as Buffer,
        }
      }),
    })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error }
  }
}

// Email Templates

/**
 * Invoice email: dark theme. Header = business logo (dark bg); footer = Powered by [Swiftbook icon] Swiftbook.
 */
export function invoiceEmailTemplate({
  invoiceNumber,
  downloadUrl,
  messageBody = '',
  businessLogoUrl,
  swiftbookLogoUrl,
  swiftbookLogoCid,
}: {
  invoiceNumber: string
  downloadUrl: string
  messageBody?: string
  /** Business logo for dark background (header). */
  businessLogoUrl?: string | null
  /** Swiftbook icon URL fallback when not embedded. */
  swiftbookLogoUrl?: string
  /** When set, use cid: for Swiftbook icon in footer (no stretch). */
  swiftbookLogoCid?: string
}): string {
  const swiftbookLogoSrc = swiftbookLogoCid
    ? `cid:${swiftbookLogoCid}`
    : (swiftbookLogoUrl || `${appUrl}/swiftbook-icon.png`)
  const bodyHtml = messageBody
    ? `<p style="margin: 0 0 20px; color: #e2e8f0; line-height: 1.6;">${messageBody.replace(/\n/g, '<br>')}</p>`
    : ''

  const headerContent = businessLogoUrl
    ? `<img src="${businessLogoUrl}" alt="Company" width="120" height="40" style="display: block; max-width: 120px; max-height: 40px; width: auto; height: auto; object-fit: contain; border: 0; outline: none;" />`
    : ''

  return `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #0a0a0a; min-height: 100vh;">
      <tr><td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 520px; background-color: #171717; border-radius: 12px; overflow: hidden; border: 1px solid #262626;">
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #262626;">
              ${headerContent}
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <h1 style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #fafafa;">Invoice ${invoiceNumber}</h1>
              <p style="margin: 0 0 24px; font-size: 14px; color: #a3a3a3;">Your invoice is attached to this email.</p>
              ${bodyHtml}
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-top: 28px;"><tr><td>
                <a href="${downloadUrl}" style="display: inline-block; padding: 12px 24px; background-color: #fafafa; color: #0a0a0a !important; font-size: 14px; font-weight: 500; text-decoration: none; border-radius: 8px;">Download PDF</a>
              </td></tr></table>
              <p style="margin: 24px 0 0; font-size: 12px; color: #737373;">You can also download the invoice using the button above. Thank you for your business.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #262626;">
              <p style="margin: 0; font-size: 11px; color: #737373;">Powered by <img src="${swiftbookLogoSrc}" alt="" width="20" height="20" style="display: inline-block; vertical-align: middle; width: 20px; height: 20px; object-fit: contain; border: 0; outline: none;" /> Swiftbook</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
  `.trim()
}

export function verificationEmailTemplate(email: string, token: string): string {
  const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #000;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            font-size: 14px;
            color: #666;
          }
          .link {
            color: #0066cc;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verify your email address</h1>
          <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
          <p>Or copy and paste this link into your browser:</p>
          <p class="link">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function passwordResetEmailTemplate(email: string, token: string): string {
  const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #000;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            font-size: 14px;
            color: #666;
          }
          .link {
            color: #0066cc;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reset your password</h1>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p class="link">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>Your password won't be changed until you create a new password.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function passwordChangedEmailTemplate(): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password changed</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
          }
          .alert {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 12px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Your password was changed</h1>
          <p>This is a confirmation that your password was successfully changed.</p>
          <div class="alert">
            <strong>Didn't make this change?</strong>
            <p>If you didn't change your password, please contact support immediately as your account may be compromised.</p>
          </div>
          <p>For security reasons, you may need to sign in again on your devices.</p>
          <div class="footer">
            <p>This is an automated security notification.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function welcomeEmailTemplate(email: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome!</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #000;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to our platform!</h1>
          <p>Hi ${email},</p>
          <p>Thanks for verifying your email address. Your account is now fully activated and you can access all features.</p>
          <a href="${appUrl}/dashboard" class="button">Go to Dashboard</a>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <div class="footer">
            <p>Happy to have you on board!</p>
          </div>
        </div>
      </body>
    </html>
  `
}