import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const API_GATEWAY_URL = "http://localhost:5000/api/v1";

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.get(`${API_GATEWAY_URL}/substitute`, {
        params: { brand: searchTerm },
      });
      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Medicine not found or API Gateway is unreachable."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (drugName) => {
    setSearchTerm(drugName);
  };

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <h1>GenMed</h1>
        <p>
          Deterministic Exact-Match Pharmaceutical Substitution & Savings Engine
        </p>
      </header>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="search-box">
        <input
          type="text"
          className="search-input"
          placeholder="Enter branded medicine (e.g., Brilinta 90mg, Augmentin 625 Duo)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit" className="search-btn" disabled={loading}>
          {loading ? "Searching..." : "Compare"}
        </button>
      </form>

      {/* Quick Try Buttons for Demo */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <span style={{ color: "#94a3b8", marginRight: "10px" }}>
          Try demo cases:
        </span>
        {["Brilinta 90mg", "Augmentin 625 Duo", "Lipitor 10mg"].map((drug) => (
          <button
            key={drug}
            type="button"
            onClick={() => handleQuickSelect(drug)}
            style={{
              margin: "0 5px",
              padding: "5px 12px",
              borderRadius: "20px",
              background: "#334155",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            {drug}
          </button>
        ))}
      </div>

      {/* Error / Not Found Message */}
      {error && (
        <div className="failsafe-box">
          <h3>No Match Found</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Failsafe Triggered Message (When no exact SHA-256 match exists) */}
      {result && result.status === "FAILSAFE_TRIGGERED" && (
        <div className="failsafe-box">
          <h3>⚠️ Zero-Risk Failsafe Triggered</h3>
          <p>{result.message}</p>
        </div>
      )}

      {/* Successful Split-Screen Comparison */}
      {result && result.status === "SUCCESS" && (
        <>
          <div className="split-card">
            {/* Branded Medicine Side */}
            <div className="brand-side">
              <div className="side-title">Commercial Branded Drug</div>
              <h2 className="drug-name">{result.branded_drug.brand_name}</h2>
              <p style={{ color: "#94a3b8", margin: 0 }}>
                Manufacturer: {result.branded_drug.manufacturer}
              </p>
              <div className="price-tag brand-price">
                ₹{result.branded_drug.mrp_price}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                <strong>Active Salt Composition:</strong>
                <ul>
                  {result.branded_drug.active_ingredients.map((ing, idx) => (
                    <li key={idx}>
                      {ing.salt} ({ing.strength})
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* PMBJP Generic Equivalent Side */}
            <div className="generic-side">
              <div className="side-title">Jan Aushadhi Generic Match</div>
              <h2 className="drug-name">{result.generic_match.generic_name}</h2>
              <p style={{ color: "#10b981", margin: 0 }}>
                Official Drug Code: <strong>{result.generic_match.drug_code}</strong>
              </p>
              <div className="price-tag generic-price">
                ₹{result.generic_match.jan_aushadhi_price}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                <strong>Cryptographic Match Status:</strong>
                <p style={{ color: "#38bdf8", margin: "4px 0" }}>
                  ✔ 100% SHA-256 Exact Chemical Equivalency
                </p>
              </div>
            </div>
          </div>

          {/* Savings Gauge Banner */}
          <div className="savings-banner">
            <h3>
              You Save {result.savings.saved_percentage}% (₹
              {result.savings.saved_rupees} per strip)
            </h3>
            <p>
              Estimated Annual Savings for Chronic Patients:{" "}
              <strong>₹{result.savings.annual_savings_estimate} / year</strong>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default App;