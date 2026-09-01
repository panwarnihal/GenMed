const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const FASTAPI_URL = process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8000";

// Configure middleware
app.use(cors());
app.use(express.json());

// Gateway health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ONLINE",
    service: "GenMed Node.js API Gateway",
    fastapi_target: FASTAPI_URL,
  });
});

// Proxy routes forwarding requests to the FastAPI microservice

/**
 * GET /api/v1/substitute
 * Forwards prescription substitution queries to the Python deterministic engine.
 */
app.get("/api/v1/substitute", async (req, res) => {
  try {
    const { brand } = req.query;
    if (!brand) {
      return res.status(400).json({
        status: "ERROR",
        message: "Query parameter 'brand' is required.",
      });
    }

    console.log(`[Gateway] Routing substitution request for: "${brand}" to FastAPI`);
    const response = await axios.get(`${FASTAPI_URL}/api/v1/substitute`, {
      params: { brand },
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { detail: "FastAPI microservice unreachable." };
    console.error(`[Gateway Error] ${statusCode} - ${JSON.stringify(errorData)}`);
    return res.status(statusCode).json(errorData);
  }
});

/**
 * GET /api/v1/verify-batch/:batchNumber
 * Forwards CDSCO OSINT recall and counterfeit checks to FastAPI.
 */
app.get("/api/v1/verify-batch/:batchNumber", async (req, res) => {
  try {
    const { batchNumber } = req.params;
    console.log(`[Gateway] Routing CDSCO batch check for: "${batchNumber}" to FastAPI`);
    
    const response = await axios.get(
      `${FASTAPI_URL}/api/v1/verify-batch/${encodeURIComponent(batchNumber)}`
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { detail: "FastAPI microservice unreachable." };
    return res.status(statusCode).json(errorData);
  }
});

/**
 * POST /api/v1/check-interactions
 * Forwards Drug-Drug Interaction (DDI) salt lists to FastAPI.
 */
app.post("/api/v1/check-interactions", async (req, res) => {
  try {
    console.log(`[Gateway] Routing DDI check for salts to FastAPI`);
    const response = await axios.post(
      `${FASTAPI_URL}/api/v1/check-interactions`,
      req.body
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { detail: "FastAPI microservice unreachable." };
    return res.status(statusCode).json(errorData);
  }
});

/**
 * POST /api/v1/mapping/match
 * Forwards extracted OCR/NER line item to FastAPI Atlas Search engine.
 */
app.post("/api/v1/mapping/match", async (req, res) => {
  try {
    console.log(`[Gateway] Routing mapping match for query: "${req.body.query}" to FastAPI`);
    const response = await axios.post(
      `${FASTAPI_URL}/api/v1/mapping/match`,
      req.body
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data || { detail: "FastAPI microservice unreachable." };
    return res.status(statusCode).json(errorData);
  }
});

// Serve frontend static files
const path = require("path");
app.use(express.static(path.join(__dirname, "dist")));

// Catch-all to route to React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start Gateway Server
app.listen(PORT, () => {
  console.log(`[Gateway] Express API Gateway running on http://localhost:${PORT}`);
  console.log(`[Gateway] Forwarding API requests to FastAPI at: ${FASTAPI_URL}`);
});