import { useEffect, useState } from "react";

export default function OfflineBar() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    function goOffline() { setOffline(true); setWasOffline(true); setShowBack(false); }
    function goOnline() {
      setOffline(false);
      if (wasOffline) {
        setShowBack(true);
        setTimeout(() => setShowBack(false), 3000);
      }
    }
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [wasOffline]);

  if (offline) return (
    <div className="offline-bar offline">
      ⚡ No connection — changes won't save until you're back online
    </div>
  );

  if (showBack) return (
    <div className="offline-bar online">
      ✓ Back online!
    </div>
  );

  return null;
}
