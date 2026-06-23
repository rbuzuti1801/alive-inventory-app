"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ScanLine } from "lucide-react";

// Entrada de leitura: aceita scanner USB / digitação manual (texto + Enter)
// e, opcionalmente, leitura por câmera (celular / tablet).
export function ScannerInput({
  onScan,
  busy = false,
  placeholder = "Escaneie o QR Code ou digite o SKU…",
}: {
  onScan: (raw: string) => void | Promise<void>;
  busy?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastDecode = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const containerId = "qr-camera-region";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!camOn) return;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(containerId, { verbose: false });
        scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void };
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            const now = Date.now();
            // Evita disparos repetidos da mesma leitura.
            if (decodedText === lastDecode.current.text && now - lastDecode.current.at < 2500) return;
            lastDecode.current = { text: decodedText, at: now };
            onScan(decodedText);
          },
          () => {},
        );
      } catch (err) {
        setCamError(err instanceof Error ? err.message : "Não foi possível acessar a câmera.");
        setCamOn(false);
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {});
      }
    };
  }, [camOn, onScan]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) return;
    onScan(raw);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <div className="scanner-input">
      <form onSubmit={submit} className="scanner-row">
        <div className="scanner-field">
          <ScanLine size={18} className="scanner-field-icon" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button className="button" type="submit" disabled={busy}>
          {busy ? "…" : "Buscar"}
        </button>
        <button
          className={`button ${camOn ? "danger" : "secondary"}`}
          type="button"
          onClick={() => {
            setCamError("");
            setCamOn((v) => !v);
          }}
        >
          {camOn ? <CameraOff size={16} /> : <Camera size={16} />}
          {camOn ? "Parar câmera" : "Usar câmera"}
        </button>
      </form>

      {camError && <div className="alert error" style={{ marginTop: 10 }}>{camError}</div>}
      {camOn && <div id={containerId} className="scanner-camera" />}
    </div>
  );
}
