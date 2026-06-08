import { useState } from "react";

export default function MoreMenu({ items, currentPage, onNavigate }) {
  const [open, setOpen] = useState(false);
  const isActive = items.some(i => i.id === currentPage);

  return (
    <>
      {open && (
        <div className="more-overlay" onClick={() => setOpen(false)} />
      )}
      <div className="more-container">
        {open && (
          <div className="more-popup">
            {items.map(n => (
              <button
                key={n.id}
                className={`more-item ${currentPage === n.id ? "active" : ""}`}
                onClick={() => { onNavigate(n.id); setOpen(false); }}
              >
                <span className="more-icon">{n.icon}</span>
                <span className="more-label">{n.label}</span>
              </button>
            ))}
          </div>
        )}
        <button
          className={`nav-item ${isActive ? "active" : ""}`}
          onClick={() => setOpen(!open)}
        >
          <span className="nav-icon">⋯</span>
          <span className="nav-label">More</span>
        </button>
      </div>
    </>
  );
}
