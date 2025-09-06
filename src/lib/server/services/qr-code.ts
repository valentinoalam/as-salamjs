import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import type { QRCodeMudhohi, QRCodeOptions } from "@/types/qr";

import axios from 'axios';
import type { Mudhohi } from '#@/types/mudhohi.ts';
/**
 * Generates a QR code for Mudhohi order
 * @param mudhohi - The mudhohi object from database
 * @param options - QR code generation options
 * @returns Promise<string> - Base64 data URL or SVG string
 */
export async function generateQRCode(
  mudhohi: Mudhohi, // Replace with proper Mudhohi type
  options: QRCodeOptions = {}
): Promise<string> {
  try {
    // Default options
    const defaultOptions = {
      format: 'png' as const,
      size: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    const config = { ...defaultOptions, ...options };

    // Prepare QR code data
    const qrData: QRCodeMudhohi = {
      mudhohi_id: mudhohi.id,
      dash_code: mudhohi.dash_code,
      nama_pengqurban: mudhohi.nama_pengqurban,
      quantity: mudhohi.payment?.quantity || 1,
      tipe_hewan: mudhohi.hewan?.[0]?.tipe?.nama || 'Unknown',
      created_at: mudhohi.createdAt?.toISOString() || new Date().toISOString()
    };

    // Create verification URL - adjust this to your actual verification endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com';
    const verificationUrl = `${baseUrl}/verify-mudhohi?code=${mudhohi.dash_code}`;

    // You can choose to encode either the verification URL or the JSON data
    const dataToEncode = JSON.stringify({
      url: verificationUrl,
      data: qrData
    });

    // QR Code generation options
    const qrOptions = {
      width: config.size,
      margin: config.margin,
      color: {
        dark: config.color.dark,
        light: config.color.light,
      },
      errorCorrectionLevel: 'M' as const, // Medium error correction
    };

    if (config.format === 'svg') {
      // Generate SVG QR code
      const svgString = await QRCode.toString(dataToEncode, {
        ...qrOptions,
        type: 'svg'
      });
      return svgString;
    } else {
      // Generate PNG QR code as base64 data URL
      const dataUrl = await QRCode.toDataURL(dataToEncode, qrOptions);
      return dataUrl;
    }

  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Alternative function that saves QR code to file system
 * @param mudhohi - The mudhohi object from database
 * @param filePath - Path where to save the QR code image
 * @param options - QR code generation options
 * @returns Promise<string> - File path of the generated QR code
 */
export async function generateQRCodeToFile(
  mudhohi: Mudhohi,
  filePath: string,
  options: QRCodeOptions = {}
): Promise<string> {
  try {
    const config = {
      format: 'png' as const,
      size: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      ...options
    };

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
    const qrData: QRCodeMudhohi = {
      mudhohi_id: mudhohi.id,
      dash_code: mudhohi.dash_code,
      nama_pengqurban: mudhohi.nama_pengqurban,
      quantity: mudhohi.payment?.quantity || 1,
      tipe_hewan: mudhohi.hewan?.[0]?.tipe?.nama || 'Unknown',
      created_at: mudhohi.createdAt?.toISOString() || new Date().toISOString()
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com';
    const verificationUrl = `${baseUrl}/verify-mudhohi?code=${mudhohi.dash_code}`;

    const dataToEncode = JSON.stringify({
      url: verificationUrl,
      data: qrData
    });

    const qrOptions = {
      width: config.size,
      margin: config.margin,
      color: {
        dark: config.color.dark,
        light: config.color.light,
      },
      errorCorrectionLevel: 'M' as const,
    };

    // Save to file
    await QRCode.toFile(filePath, dataToEncode, qrOptions);
    
    return filePath;
  } catch (error) {
    console.error('Error generating QR code file:', error);
    throw new Error('Failed to generate QR code file');
  }
}

/**
 * Generate QR code and return as buffer (useful for API responses)
 * @param mudhohi - The mudhohi object from database
 * @param options - QR code generation options
 * @returns Promise<Buffer> - QR code image buffer
 */
export async function generateQRCodeBuffer(
  mudhohi: Mudhohi,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  try {
    const config = {
      size: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      ...options
    };

    const qrData: QRCodeMudhohi = {
      mudhohi_id: mudhohi.id,
      dash_code: mudhohi.dash_code,
      nama_pengqurban: mudhohi.nama_pengqurban,
      quantity: mudhohi.payment?.quantity || 1,
      tipe_hewan: mudhohi.hewan?.[0]?.tipe?.nama || 'Unknown',
      created_at: mudhohi.createdAt?.toISOString() || new Date().toISOString()
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com';
    const verificationUrl = `${baseUrl}/verify-mudhohi?code=${mudhohi.dash_code}`;

    const dataToEncode = JSON.stringify({
      url: verificationUrl,
      data: qrData
    });

    const qrOptions = {
      width: config.size,
      margin: config.margin,
      color: {
        dark: config.color.dark,
        light: config.color.light,
      },
      errorCorrectionLevel: 'M' as const,
    };

    const buffer = await QRCode.toBuffer(dataToEncode, qrOptions);
    return buffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code buffer');
  }
}

// Usage example in your createMudhohi function:
/*
// After creating mudhohi successfully, generate QR code
try {
  const qrCodeDataUrl = await generateQRCode(mudhohi, {
    format: 'png',
    size: 300,
    color: {
      dark: '#2D5016', // Dark green for Islamic theme
      light: '#FFFFFF'
    }
  });
  
  // You can store this data URL in database or return it in response
  // Or save as file for later use
  const qrFilePath = `./public/qr-codes/${mudhohi.dash_code}.png`;
  await generateQRCodeToFile(mudhohi, qrFilePath);
  
} catch (qrError) {
  console.error('Failed to generate QR code:', qrError);
  // Continue without QR code or handle as needed
}
*/


// Fungsi untuk download QR code dari URL
export async function downloadQRCode(url: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error downloading QR code:', error);
    return null;
  }
}