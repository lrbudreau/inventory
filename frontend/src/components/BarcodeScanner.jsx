import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let controls = null;

    async function startScanner() {
      try {
        readerRef.current = new BrowserMultiFormatReader();
        setScanning(true);
        controls = await readerRef.current.decodeFromVideoDevice(
          undefined, // use default camera
          videoRef.current,
          (result, err) => {
            if (result) {
              onScan(result.getText());
            }
          }
        );
      } catch (e) {
        setError("Could not access camera. Please allow camera permissions and try again.");
        setScanning(false);
      }
    }

    startScanner();

    return () => {
      if (controls) controls.stop();
    };
  }, [onScan]);

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
