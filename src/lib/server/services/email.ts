/* eslint-disable @typescript-eslint/no-explicit-any */
// import fs from 'fs/promises';
// import path from 'path';
import { createHash, createHmac, randomBytes } from 'crypto'
import nodemailer from 'nodemailer';
import { downloadQRCode } from "#@/lib/server/services/qr-code.ts"
import prisma from '#@/lib/server/prisma.ts';
import type { CaraBayar } from '@prisma/client';



// Interface untuk verification email options
interface VerificationEmailOptions {
  email: string;
  token: string;
  userName?: string;
  expirationHours?: number;
  language?: 'id' | 'en';
  resendCount?: number;
  customMessage?: string;
}

// Interface untuk email configuration
interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
  baseUrl: string;
}

// Interface untuk response
interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  verificationLink?: string;
}

// Interface untuk order details
interface OrderDetails {
  orderId: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  qrcode_url?: string;
  paymentInstructions?: string;
  createdAt: Date;
}

// Interface untuk email configuration
interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

// Konfigurasi email (gunakan environment variables)
const emailConfig: EmailConfig = {
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  from: {
    name: process.env.FROM_NAME || 'Your Company',
    email: process.env.FROM_EMAIL || 'noreply@yourcompany.com'
  },
  baseUrl: process.env.NEXTAUTH_URL || process.env.BASE_URL || 'http://localhost:3000/'
};


// Enhanced email function with QR code attachment
export async function sendOrderConfirmationEmail(email: string, orderDetails: any, isNewUser: boolean, isGoogleAuth: boolean) {
  console.log(`Mengirim email konfirmasi pesanan ke: ${email}`);
  console.log(`Detail Pesanan: ${JSON.stringify(orderDetails)}`);
 
  try {
    // Validasi konfigurasi email
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      throw new Error('Email configuration is incomplete. Please check SMTP_USER and SMTP_PASS environment variables.');
    }

    // Buat transporter
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      tls: {
        rejectUnauthorized: false // Untuk development, hapus di production
      }
    });

    // Verify transporter
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    // Siapkan attachments
    const attachments: any[] = [];

    // Download dan attach QR code jika ada
    if (orderDetails.qrcode_url) {
      console.log('Downloading QR code...');
      const qrCodeBuffer = await downloadQRCode(orderDetails.qrcode_url);
      
      if (qrCodeBuffer) {
        attachments.push({
          filename: `qr-code-${orderDetails.orderId}.png`,
          content: qrCodeBuffer,
          contentType: 'image/png',
          cid: 'qrcode' // Content ID untuk embed di HTML
        });
        console.log('QR code downloaded and attached successfully');
      } else {
        console.warn('Failed to download QR code, continuing without attachment');
      }
    }

    // Generate HTML content
    const htmlContent = generateEmailTemplate(orderDetails, isNewUser, isGoogleAuth);

    // Siapkan mail options
    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to: email,
      subject: `Konfirmasi Pesanan #${orderDetails.orderId} - ${emailConfig.from.name}`,
      html: htmlContent,
      attachments: attachments,
      // Text fallback
      text: `
        Konfirmasi Pesanan #${orderDetails.orderId}
        
        Halo ${orderDetails.customerName},
        
        Terima kasih atas pesanan Anda. Berikut detail pesanan:
        
        ID Pesanan: ${orderDetails.orderId}
        Total: ${orderDetails.currency} ${orderDetails.totalAmount.toLocaleString()}
        Metode Pembayaran: ${orderDetails.paymentMethod}
        
        ${isNewUser ? (isGoogleAuth ? 'Akun baru telah dibuat menggunakan Google Auth.' : 'Akun baru telah dibuat untuk Anda.') : ''}
        
        ${orderDetails.paymentInstructions || ''}
        
        Terima kasih,
        ${emailConfig.from.name}
      `
    };

    // Kirim email
    console.log('Sending email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('Error sending email:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Multilingual content
const emailContent = {
  id: {
    subject: 'Verifikasi Akun Anda',
    title: 'Verifikasi Email Anda',
    greeting: (name?: string) => name ? `Halo ${name}!` : 'Halo!',
    mainMessage: 'Terima kasih telah mendaftar! Untuk melengkapi proses pendaftaran, silakan verifikasi alamat email Anda dengan mengklik tombol di bawah ini.',
    buttonText: 'Verifikasi Email',
    alternativeText: 'Jika tombol di atas tidak berfungsi, salin dan tempel link berikut ke browser Anda:',
    expirationNotice: (hours: number) => `Link verifikasi ini akan kedaluwarsa dalam ${hours} jam.`,
    securityNotice: 'Jika Anda tidak mendaftar untuk akun ini, abaikan email ini.',
    troubleText: 'Mengalami masalah dengan verifikasi?',
    contactText: 'Hubungi support kami',
    resendNotice: (count: number) => `Ini adalah pengiriman ke-${count} email verifikasi.`,
    customMessagePrefix: 'Catatan khusus:',
    footerText: 'Email ini dikirim secara otomatis, mohon tidak membalas email ini.'
  },
  en: {
    subject: 'Verify Your Account',
    title: 'Verify Your Email',
    greeting: (name?: string) => name ? `Hello ${name}!` : 'Hello!',
    mainMessage: 'Thank you for signing up! To complete your registration, please verify your email address by clicking the button below.',
    buttonText: 'Verify Email',
    alternativeText: 'If the button above does not work, copy and paste the following link into your browser:',
    expirationNotice: (hours: number) => `This verification link will expire in ${hours} hours.`,
    securityNotice: 'If you did not sign up for this account, please ignore this email.',
    troubleText: 'Having trouble with verification?',
    contactText: 'Contact our support',
    resendNotice: (count: number) => `This is the ${count}${count === 1 ? 'st' : count === 2 ? 'nd' : count === 3 ? 'rd' : 'th'} verification email sent.`,
    customMessagePrefix: 'Special note:',
    footerText: 'This email was sent automatically, please do not reply to this email.'
  }
};

/**
 * Purpose: Creates a secure verification URL with anti-tampering protection
 * Security Features:
 *  - Timestamp to prevent replay attacks
 *  - HMAC-SHA256 signature using secret key
 *  - URL encoding for special characters
 *  - Multiple verification parameters (token+email+timestamp)
 * @param token Unique verification token
 * @param email User's email address
 * @returns https://yourdomain.com/verify?token=...&email=...&t=1719072000000&sig=af3c...
 */
// Fungsi untuk generate secure verification link
function generateVerificationLink(token: string, email: string): string {
  // Add additional security parameter
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', process.env.EMAIL_SECRET || 'default-secret')
    .update(`${token}:${email}:${timestamp}`)
    .digest('hex');

  return `${emailConfig.baseUrl}/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&t=${timestamp}&sig=${signature}`;
}

// Template HTML untuk email
function generateEmailTemplate(
  orderDetails: OrderDetails, 
  isNewUser: boolean, 
  isGoogleAuth: boolean
): string {
  const itemsHtml = orderDetails.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
        ${orderDetails.currency} ${item.price.toLocaleString()}
      </td>
    </tr>
  `).join('');

  const newUserNotice = isNewUser ? `
    <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50;">
      <h3 style="color: #2e7d2e; margin: 0 0 10px 0;">🎉 Akun Berhasil Dibuat!</h3>
      <p style="margin: 0; color: #2e7d2e;">
        ${isGoogleAuth 
          ? 'Akun Anda telah dibuat menggunakan Google Auth. Anda dapat login menggunakan akun Google Anda.'
          : 'Akun baru telah dibuat untuk Anda. Silakan cek email untuk instruksi aktivasi akun.'
        }
      </p>
    </div>
  ` : '';

  const paymentInstructions = orderDetails.paymentInstructions ? `
    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <h3 style="color: #856404; margin: 0 0 10px 0;">💳 Instruksi Pembayaran</h3>
      <p style="margin: 0; color: #856404;">${orderDetails.paymentInstructions}</p>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Konfirmasi Pesanan</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Konfirmasi Pesanan</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Terima kasih atas pesanan Anda!</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
        ${newUserNotice}
        
        <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">
          Halo ${orderDetails.customerName}!
        </h2>
        
        <p>Pesanan Anda telah berhasil diterima dan sedang diproses. Berikut detail pesanan Anda:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #495057;">📋 Detail Pesanan</h3>
          <p><strong>ID Pesanan:</strong> ${orderDetails.orderId}</p>
          <p><strong>Tanggal:</strong> ${orderDetails.createdAt.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
          <p><strong>Metode Pembayaran:</strong> ${orderDetails.paymentMethod}</p>
        </div>
        
        <div style="margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 15px;">🛍️ Item Pesanan</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">Harga</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f8f9fa; font-weight: bold;">
                <td colspan="2" style="padding: 12px; text-align: right; border-top: 2px solid #333;">TOTAL:</td>
                <td style="padding: 12px; text-align: right; border-top: 2px solid #333;">
                  ${orderDetails.currency} ${orderDetails.totalAmount.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        ${paymentInstructions}
        
        ${orderDetails.qrcode_url ? `
          <div style="text-align: center; margin: 30px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">📱 QR Code Pembayaran</h3>
            <p>Scan QR code di bawah ini untuk melakukan pembayaran:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; display: inline-block;">
              <p style="margin: 0; font-size: 14px; color: #666;">QR Code terlampir dalam email ini</p>
            </div>
          </div>
        ` : ''}
        
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin: 30px 0; border-left: 4px solid #2196F3;">
          <h3 style="color: #1565c0; margin: 0 0 10px 0;">ℹ️ Informasi Penting</h3>
          <ul style="margin: 0; padding-left: 20px; color: #1565c0;">
            <li>Simpan email ini sebagai bukti pesanan</li>
            <li>Pesanan akan diproses dalam 1-2 hari kerja</li>
            <li>Anda akan menerima notifikasi saat pesanan dikirim</li>
            <li>Hubungi customer service jika ada pertanyaan</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; margin: 0;">
            Terima kasih telah berbelanja dengan kami!<br>
            <strong>${emailConfig.from.name}</strong>
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Purpose: Generates responsive HTML email template with localization support
 * @param options {  
 *    userName: string; 
 *    expirationHours?: number; 
 *    language?: string; 
 *    resendCount?: number; 
 *    customMessage?: string; }  
 * @param verificationLink 
 * @returns 
 */
// Template HTML untuk email verifikasi
function generateVerificationEmailTemplate(options: VerificationEmailOptions, verificationLink: string): string {
  const {
    userName,
    expirationHours = 24,
    language = 'id',
    resendCount = 1,
    customMessage
  } = options;

  const content = emailContent[language];
  
  return `
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${content.subject}</title>
      <style>
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; padding: 10px !important; }
          .content { padding: 20px !important; }
          .button { width: 100% !important; padding: 15px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                    ✉️ ${content.title}
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td class="content" style="padding: 40px 30px;">
                  
                  <!-- Greeting -->
                  <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px; font-weight: 500;">
                    ${content.greeting(userName)}
                  </h2>
                  
                  <!-- Resend Notice -->
                  ${resendCount > 1 ? `
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
                      <p style="margin: 0; color: #856404; font-size: 14px;">
                        ⚠️ ${content.resendNotice(resendCount)}
                      </p>
                    </div>
                  ` : ''}
                  
                  <!-- Custom Message -->
                  ${customMessage ? `
                    <div style="background-color: #e8f4fd; border: 1px solid #bee5eb; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
                      <p style="margin: 0; color: #0c5460;">
                        <strong>${content.customMessagePrefix}</strong><br>
                        ${customMessage}
                      </p>
                    </div>
                  ` : ''}
                  
                  <!-- Main Message -->
                  <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    ${content.mainMessage}
                  </p>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${verificationLink}" 
                       class="button"
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                      🔐 ${content.buttonText}
                    </a>
                  </div>
                  
                  <!-- Alternative Link -->
                  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0;">
                    <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
                      ${content.alternativeText}
                    </p>
                    <p style="word-break: break-all; color: #007bff; font-size: 14px; margin: 0; font-family: monospace;">
                      ${verificationLink}
                    </p>
                  </div>
                  
                  <!-- Expiration Notice -->
                  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                      ⏰ ${content.expirationNotice(expirationHours)}
                    </p>
                  </div>
                  
                  <!-- Security Notice -->
                  <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 25px 0;">
                    <p style="margin: 0; color: #721c24; font-size: 14px;">
                      🔒 ${content.securityNotice}
                    </p>
                  </div>
                  
                  <!-- Support Section -->
                  <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 14px; margin: 0 0 15px 0;">
                      ${content.troubleText}
                    </p>
                    <a href="mailto:${emailConfig.from.email}" 
                       style="color: #667eea; text-decoration: none; font-weight: 500; font-size: 14px;">
                      ${content.contactText}
                    </a>
                  </div>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #eee;">
                  <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                    <strong>${emailConfig.from.name}</strong>
                  </p>
                  <p style="margin: 0; color: #999; font-size: 12px;">
                    ${content.footerText}
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Analytics Pixel (Optional) -->
      <img src="${emailConfig.baseUrl}/api/email-open?token=${encodeURIComponent(options.token)}&type=verification" 
           width="1" height="1" style="display: none;" />
           
    </body>
    </html>
  `;
}

//  Fungsi untuk validasi email
//  Purpose: Basic email format validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

//  Fungsi untuk validasi token
//  Purpose: Ensures tokens are secure (min 32 alphanumeric chars)
function isValidToken(token: string): boolean {
  // Token harus minimal 32 karakter dan hanya berisi alphanumeric
  const tokenRegex = /^[a-zA-Z0-9]{32,}$/;
  return tokenRegex.test(token);
}

// Rate limiting store (dalam production, gunakan Redis)
const rateLimitStore = new Map<string, { count: number; lastSent: number }>();

/**
 * Purpose: Prevents email bombing attacks
 * Mechanism:
 * - Stores attempts in memory (Map)
 * - Default: Max 5 emails/hour per address
 * - Auto-resets counter after 1 hour
 * - Production recommendation: Use Redis instead
 * @param email 
 * @param maxAttempts 
 * @param windowMs 
 * @returns 
 */
// Fungsi untuk check rate limiting
function checkRateLimit(email: string, maxAttempts: number = 5, windowMs: number = 3600000): boolean {
  const now = Date.now();
  const userAttempts = rateLimitStore.get(email);

  if (!userAttempts) {
    rateLimitStore.set(email, { count: 1, lastSent: now });
    return true;
  }

  // Reset counter jika sudah lewat window time
  if (now - userAttempts.lastSent > windowMs) {
    rateLimitStore.set(email, { count: 1, lastSent: now });
    return true;
  }

  // Check jika masih dalam limit
  if (userAttempts.count < maxAttempts) {
    userAttempts.count++;
    userAttempts.lastSent = now;
    return true;
  }

  return false;
}

// Fungsi utama untuk mengirim email verifikasi
export async function sendVerificationEmail(
  email: string, 
  token: string, 
  options: Partial<VerificationEmailOptions> = {}
): Promise<EmailResponse> {
  
  console.log(`Sending verification email to: ${email}`);
  
  try {
    // Validate inputs (email + token format)
    if (!email || !token) {
      throw new Error('Email and token are required');
    }

    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!isValidToken(token)) {
      throw new Error('Invalid token format');
    }

    // Check rate limiting
    if (!checkRateLimit(email)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Verify SMTP configuration
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      throw new Error('Email configuration is incomplete. Please check SMTP credentials.');
    }

    // Merge options dengan default values
    const emailOptions: VerificationEmailOptions = {
      email,
      token,
      expirationHours: 24,
      language: 'id',
      resendCount: 1,
      ...options
    };

    // Generate secure verification link
    const verificationLink = generateVerificationLink(token, email);
    console.log('Generated verification link');

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    // Generate HTML + text email content
    const htmlContent = generateVerificationEmailTemplate(emailOptions, verificationLink);
    const content = emailContent[emailOptions.language!];

    // Prepare mail options
    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to: email,
      subject: content.subject,
      html: htmlContent,
      // Text fallback
      text: `
        ${content.greeting(emailOptions.userName)}
        
        ${content.mainMessage}
        
        ${content.alternativeText}
        ${verificationLink}
        
        ${content.expirationNotice(emailOptions.expirationHours!)}
        
        ${content.securityNotice}
        
        ${emailConfig.from.name}
      `,
      // Email headers untuk tracking
      headers: {
        'X-Email-Type': 'verification',
        'X-User-Email': email,
        'X-Token-Hash': createHash('sha256').update(token).digest('hex').substring(0, 16)
      }
    };

    // Send email
    console.log('Sending verification email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Verification email sent successfully:', info.messageId);
    // Return success/failure response
    return {
      success: true,
      messageId: info.messageId,
      verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined
    };

  } catch (error) {
    console.error('Error sending verification email:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fungsi helper untuk resend verification email with proper counter increment
 * Special Behavior:
 * - Increments resendCount in email template
 * - Shows "Resend Notice" in email UI
 * - Maintains same security as initial send
 * @param email 
 * @param token 
 * @param resendCount 
 * @param options 
 * @returns sendVerificationEmail(email, token, { ...options, resendCount: resendCount + 1);
 */
export async function resendVerificationEmail(
  email: string, 
  token: string, 
  resendCount: number,
  options: Partial<VerificationEmailOptions> = {}
): Promise<EmailResponse> {
  
  return sendVerificationEmail(email, token, {
    ...options,
    resendCount: resendCount + 1
  });
}

// Fungsi untuk testing
/**
 * Purpose: Sends sample email for development/testing
 * Features:
 * - Generates valid 32-byte token
 * - Uses test recipient address
 * - Includes sample custom message
 * @returns  full send result for inspection
 */
export async function testVerificationEmail() {
  const testToken = randomBytes(32).toString('hex');
  
  const result = await sendVerificationEmail(
    'test@example.com',
    testToken,
    {
      userName: 'Test User',
      language: 'id',
      customMessage: 'This is a test verification email.'
    }
  );

  console.log('Test result:', result);
  return result;
}

export async function verifyToken(token: string) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!verificationToken) throw new Error('Token tidak valid')
  if (verificationToken.expires < new Date()) throw new Error('Token kadaluarsa')

  // Verifikasi email user
  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() }
  })

  // Hapus token yang sudah digunakan
  await prisma.verificationToken.delete({
    where: { token }
  })

  return true
}

export async function createVerificationToken(email: string) {
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 jam

  return await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    }
  })
}

// Helper function for payment instructions
export function getPaymentInstructions(caraBayar: CaraBayar): string {
  switch(caraBayar) {
    case 'TRANSFER':
      return 'Transfer ke rekening BNI 123-456-789 a.n. Panitia Qurban';
    // case 'EWALLET':
    //   return 'Gunakan QRIS code yang tersedia di dashboard pembayaran';
    case 'TUNAI':
      return 'Pembayaran langsung ke sekretariat panitia';
    default:
      return 'Silakan hubungi panitia untuk instruksi pembayaran';
  }
}