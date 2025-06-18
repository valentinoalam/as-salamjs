import React from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';

interface MudhohiQRProps {
  mudhohi: {
    id: string;
    dash_code: string;
    nama_pengqurban: string;
    payment?: {
      id: string;
      totalAmount: number;
      quantity: number;
    };
    hewan?: Array<{
      tipe?: {
        nama: string;
      };
    }>;
    createdAt?: Date;
  };
  size?: number;
  format?: 'svg' | 'canvas';
  includeDownload?: boolean;
  className?: string;
}

export const MudhohiQRCode: React.FC<MudhohiQRProps> = ({
  mudhohi,
  size = 300,
  format = 'svg',
  includeDownload = true,
  className = ''
}) => {
  // Prepare QR code data (same structure as server-side)
  const qrData = {
    mudhohi_id: mudhohi.id,
    dash_code: mudhohi.dash_code,
    nama_pengqurban: mudhohi.nama_pengqurban,
    payment_id: mudhohi.payment?.id || '',
    total_amount: mudhohi.payment?.totalAmount || 0,
    quantity: mudhohi.payment?.quantity || 1,
    tipe_hewan: mudhohi.hewan?.[0]?.tipe?.nama || 'Unknown',
    created_at: mudhohi.createdAt?.toISOString() || new Date().toISOString()
  };

  // Create verification URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  const verificationUrl = `${baseUrl}/verify-mudhohi?code=${mudhohi.dash_code}`;

  const dataToEncode = JSON.stringify({
    url: verificationUrl,
    data: qrData
  });

  // Common QR code props
  const qrProps = {
    value: dataToEncode,
    size: size,
    level: 'M' as const, // Error correction level
    includeMargin: true,
    fgColor: '#2D5016', // Islamic green
    bgColor: '#FFFFFF'
  };

  const downloadQR = () => {
    if (format === 'canvas') {
      const canvas = document.querySelector(`#qr-canvas-${mudhohi.id}`) as HTMLCanvasElement;
      if (canvas) {
        const url = canvas.toDataURL();
        const link = document.createElement('a');
        link.download = `mudhohi-qr-${mudhohi.dash_code}.png`;
        link.href = url;
        link.click();
      }
    } else {
      // For SVG, we need to convert to image first
      const svg = document.querySelector(`#qr-svg-${mudhohi.id}`) as SVGElement;
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          const url = canvas.toDataURL();
          const link = document.createElement('a');
          link.download = `mudhohi-qr-${mudhohi.dash_code}.png`;
          link.href = url;
          link.click();
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      }
    }
  };

  return (
    <div className={`qr-code-container ${className}`}>
      <div className="qr-code-wrapper">
        {format === 'svg' ? (
          <QRCodeSVG
            {...qrProps}
            id={`qr-svg-${mudhohi.id}`}
          />
        ) : (
          <QRCodeCanvas
            {...qrProps}
            id={`qr-canvas-${mudhohi.id}`}
          />
        )}
      </div>
      
      {includeDownload && (
        <div className="mt-4 text-center">
          <button
            onClick={downloadQR}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Download QR Code
          </button>
        </div>
      )}
      
      <div className="mt-2 text-sm text-gray-600 text-center">
        <p>Scan untuk verifikasi mudhohi</p>
        <p className="font-mono text-xs">{mudhohi.dash_code}</p>
      </div>
    </div>
  );
};

// Hook for generating QR data URL on client-side
export const useQRCodeDataURL = (
  mudhohi: MudhohiQRProps['mudhohi'], 
  size: number = 300
) => {
  const [qrDataURL, setQrDataURL] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const generateDataURL = async () => {
      if (!mudhohi.id) {
        setError('Invalid mudhohi data');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Create QR data
        const qrData = JSON.stringify({
          url: `${window.location.origin}/verify-mudhohi?code=${mudhohi.dash_code}`,
          data: {
            mudhohi_id: mudhohi.id,
            dash_code: mudhohi.dash_code,
            nama_pengqurban: mudhohi.nama_pengqurban,
            payment_id: mudhohi.payment?.id || '',
            total_amount: mudhohi.payment?.totalAmount || 0,
            quantity: mudhohi.payment?.quantity || 1,
            tipe_hewan: mudhohi.hewan?.[0]?.tipe?.nama || 'Unknown',
            created_at: mudhohi.createdAt?.toISOString() || new Date().toISOString()
          }
        });

        // Create canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Set canvas size
        canvas.width = size;
        canvas.height = size;

        // Create a temporary container for the QR component
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        document.body.appendChild(container);

        // Create QR code using qrcode.js library instead of React component
        // This is a more reliable approach for generating data URLs
        const QRCode = await import('qrcode');
        
        const qrDataUrl = await QRCode.toDataURL(qrData, {
          width: size,
          margin: 2,
          color: {
            dark: '#2D5016',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });

        setQrDataURL(qrDataUrl);
        document.body.removeChild(container);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate QR code');
        console.error('QR generation error:', err);
      } finally {
        setLoading(false);
      }
    };

    generateDataURL();
  }, [mudhohi, size]);

  return { qrDataURL, loading, error };
};

export const useQRCodeDataURLWithCanvas = (
  mudhohi: MudhohiQRProps['mudhohi'], 
  size: number = 300
) => {
  const [qrDataURL, setQrDataURL] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const qrData = React.useMemo(() => {
    if (!mudhohi.id) return '';
    
    return JSON.stringify({
      url: `${window.location.origin}/verify-mudhohi?code=${mudhohi.dash_code}`,
      data: {
        mudhohi_id: mudhohi.id,
        dash_code: mudhohi.dash_code,
        nama_pengqurban: mudhohi.nama_pengqurban,
        payment_id: mudhohi.payment?.id || '',
        total_amount: mudhohi.payment?.totalAmount || 0,
        quantity: mudhohi.payment?.quantity || 1,
        tipe_hewan: mudhohi.hewan?.[0]?.tipe?.nama || 'Unknown',
        created_at: mudhohi.createdAt?.toISOString() || new Date().toISOString()
      }
    });
  }, [mudhohi]);

  React.useEffect(() => {
    const generateDataURL = () => {
      if (!canvasRef.current || !qrData) return;
      
      setLoading(true);
      // Small delay to ensure canvas is fully rendered
      setTimeout(() => {
        if (canvasRef.current) {
          const dataUrl = canvasRef.current.toDataURL();
          setQrDataURL(dataUrl);
        }
        setLoading(false);
      }, 100);
    };

    generateDataURL();
  }, [qrData, size]);

  // QR Component to be rendered in your React component
  const QRComponent = React.useMemo(() => {
    if (!qrData) return null;

    return (
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <QRCodeCanvas
          ref={canvasRef}
          value={qrData}
          size={size}
          level="M"
          includeMargin={true}
          fgColor="#2D5016"
          bgColor="#FFFFFF"
        />
      </div>
    );
  }, [qrData, size]);

  return { qrDataURL, loading, QRComponent };
};