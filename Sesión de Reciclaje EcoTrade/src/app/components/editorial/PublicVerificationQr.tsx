import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface PublicVerificationQrProps {
  sessionId: string;
  label?: string;
  size?: number;
}

export const PublicVerificationQr: React.FC<PublicVerificationQrProps> = ({
  sessionId,
  label = 'Verificación Pública',
  size = 220,
}) => {
  const [qrSrc, setQrSrc] = useState<string>('');

  const publicUrl = `${window.location.origin}/verificar/${sessionId}`;

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(publicUrl, {
      width: size,
      margin: 1,
      color: {
        dark: '#1A1A1A',
        light: '#F5F3ED',
      },
    })
      .then((url) => {
        if (!cancelled) setQrSrc(url);
      })
      .catch((error) => {
        console.error('[QR] No se pudo generar el código QR:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [publicUrl, size]);

  return (
    <div className="text-center">
      <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-4">{label}</div>
      <div className="border-2 border-[#1A1A1A] p-4 mb-4 bg-white inline-block">
        <div
          className="bg-[#F5F3ED] flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          {qrSrc ? (
            <img
              src={qrSrc}
              alt={`QR de verificación pública para la sesión ${sessionId}`}
              width={size}
              height={size}
              className="block"
            />
          ) : (
            <div className="text-xs text-[#4A4A4A] font-mono break-all px-4">{publicUrl}</div>
          )}
        </div>
      </div>
      <div className="text-xs text-[#4A4A4A] font-mono break-all">{publicUrl}</div>
    </div>
  );
};