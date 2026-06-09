import { useEffect, useState } from "react";

let toastListeners = [];
let toastId = 0;

export function showToast(message, type = "ok") {
  const id = ++toastId;
  toastListeners.forEach(fn => fn({ id, message, type }));
  return id;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function handler(toast) {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 3000);
    }
    toastListeners.push(handler);
    return () => { toastListeners = toastListeners.filter(fn => fn !== handler); };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === "ok" && "✓ "}{t.type === "fail" && "✕ "}{t.message}
        </div>
      ))}
    </div>
  );
}
