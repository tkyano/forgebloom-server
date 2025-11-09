import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS so your React frontend can fetch data
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.get("/api/oracle-cards", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "json", "oracle-cards.json"));
});

app.get("/api/featured-decks", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "json", "featured-decks.json"));
});

// Catch-all for SPA React app
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => console.log(`Server running on port ${port}`));
