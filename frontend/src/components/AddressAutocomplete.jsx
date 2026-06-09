import { useState, useEffect, useRef } from "react";

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    onChange(val);

    // Debounce the API call
    clearTimeout(debounceRef.current);
    if (val.length < 4) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5&countrycodes=us`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en-US", "User-Agent": "FabTrack/1.0" }
        });
        const data = await res.json();
        // Only show results with actual street info
        const filtered = data.filter(r => r.address?.road);
        setSuggestions(filtered);
        setShowDropdown(filtered.length > 0);
      } catch {
        setSuggestions([]);
      }
      setLoading(false);
    }, 400);
  }

  function handleSelect(r) {
    const a = r.address || {};
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const city = a.city || a.town || a.village || a.suburb || "";
    const state = a.state || "";
    const zip = a.postcode || "";
    onChange(street);
    onSelect({ address: street, city, state, zip });
    setSuggestions([]);
    setShowDropdown(false);
  }

  function formatSuggestion(r) {
    const a = r.address || {};
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const city = a.city || a.town || a.village || "";
    const state = a.state || "";
    const zip = a.postcode || "";
    return { street, detail: [city, state, zip].filter(Boolean).join(", ") };
  }

  return (
    <div className="autocomplete-wrap" ref={wrapperRef}>
      <div className="autocomplete-input-wrap">
        <input
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder || "Start typing an address…"}
        />
        {loading && <span className="autocomplete-spinner">⟳</span>}
      </div>
      {showDropdown && suggestions.length > 0 && (
        <ul className="autocomplete-dropdown">
          {suggestions.map((r, i) => {
            const { street, detail } = formatSuggestion(r);
            return (
              <li key={i} className="autocomplete-item" onMouseDown={() => handleSelect(r)}>
                <span className="autocomplete-street">{street}</span>
                <span className="autocomplete-detail">{detail}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
