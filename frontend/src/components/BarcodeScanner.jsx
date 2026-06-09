import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const scannedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  // Keep onScan ref current so we never have stale closure
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      try {
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        setScanning(true);

        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, err) => {
            if (result && !scannedRef.current && !cancelled) {
              scannedRef.current = true;
              // Stop camera first
              try { controls.stop(); } catch(e) {}
              // Then fire callback
              onScanRef.current(result.getText());
            }
          }
        );
        controlsRef.current = controls;
      } catch (e) {
        if (!cancelled) {
          setError("Could not access camera. Please allow camera permissions and try again.");
          setScanning(false);
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      try { if (controlsRef.current) controlsRef.current.stop(); } catch(e) {}
    };
  }, []); // Empty deps — only run once

  const readerRef = useRef(null);

  return (
    <div className="scanner-overlay" onClick={onClose}>
      <div className="scanner-modal" onClick={e => e.stopPropagation()}>
        <div className="scanner-header">
          <span>Scan Barcode</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error ? (
          <div className="scanner-error">
            <p>{error}</p>
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <div className="scanner-view">
            <video ref={videoRef} className="scanner-video" />
            <div className="scanner-aim">
              <div className="scanner-line" />
            </div>
            {scanning && <p className="scanner-hint">Point camera at a barcode</p>}
          </div>
        )}
      </div>
    </div>
  );
}
