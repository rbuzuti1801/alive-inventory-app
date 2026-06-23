"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Renderiza um QR Code em alta definição a partir de um texto/JSON.
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { errorCorrectionLevel: "M", margin: 0, width: 1024 })
      .then((dataUrl) => {
        if (active) setUrl(dataUrl);
      })
      .catch(() => {
        if (active) setUrl("");
      });
    return () => {
      active = false;
    };
  }, [value]);

  if (!url) {
    return <div style={{ width: size, height: size, background: "#f3f3f3", borderRadius: 4 }} aria-hidden />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} width={size} height={size} alt="QR Code" style={{ display: "block", imageRendering: "pixelated" }} />;
}
