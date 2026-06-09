import { useState } from "react";

export default function PlaceLookup({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResults([]);
    setSearched(false);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&countrycodes=us`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "en-US", "User-Agent": "FabTrack/1.0" }
      });
      const data = await res.json();
      setResults(data);
      setSearched(true);
    } catch (err) {
      setError("Search failed. Check your connection.");
    }
    setLoading(false);
  }

  function pickResult(r) {
    const a = r.address || {};

    // Build street address
    const street = [a.house_number, a.road].filter(Boolean).join(" ");

    // Build city/state/zip
    const city = a.city || a.town || a.village || a.county || "";
    const state = a.state || "";
    const zip = a.postcode || "";

    // Company name — use the display name's first part if it looks like a business
    const namePart = r.display_name.split(",")[0].trim();

    onSelect({
      name: namePart,
      address: street,
      city,
      state,
      zip,
    });
  }

  // Shorten display name for readability
  function shortName(displayName) {
    const parts = displayName.split(",");
    return parts.slice(0, 3).join(",").trim();
  }

  return (
    <div className="place-lookup">
      <form onSubmit={handleSearch} className="place-search-row">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search business name or address…"
          className="place-input"
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "…" : "Search"}
        </button>
      </form>

      {error && <p className="error-msg" style={{marginTop:8}}>{error}</p>}

      {results.length > 0 && (
        <ul className="place-results">
          {results.map((r, i) => (
            <li key={i} className="place-result" onClick={() => pickResult(r)}>
              <span className="place-result-name">{r.display_name.split(",")[0]}</span>
              <span className="place-result-addr">{shortName(r.display_name.split(",").slice(1).join(","))}</span>
            </li>
          ))}
        </ul>
      )}

      {searched && results.length === 0 && (
        <p className="empty" style={{padding:"10px 0"}}>No results found. Try a different search.</p>
      )}
    </div>
  );
}
