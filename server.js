import express from "express";
import fetch from "node-fetch"; // make sure this is installed
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// --- API ROUTES ---

// Oracle Cards – fetch from GitHub
app.get("/api/oracle-cards", async (req, res) => {
  try {
    const response = await fetch("https://tkyano.github.io/csce242/projects/part7/json/oracle-cards.json");
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching oracle cards:", error);
    res.status(500).json({ error: "Failed to fetch oracle cards" });
  }
});

// Featured Decks – fetch from GitHub
app.get("/api/featured-decks", async (req, res) => {
  try {
    const response = await fetch("https://tkyano.github.io/csce242/projects/part7/json/featured-decks.json");
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching featured decks:", error);
    res.status(500).json({ error: "Failed to fetch featured decks" });
  }
});

// Default route for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => console.log(`✅ Server running on port ${port}`));
