import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import fs from "fs";
import Joi from "joi";

const app = express();
const port = process.env.PORT || 3001;

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// DATA directories
const DATA_DIR = path.join(__dirname, "data");
const DECKS_DIR = path.join(DATA_DIR, "decks");

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DECKS_DIR)) fs.mkdirSync(DECKS_DIR);

// --- Oracle Cards (read-only)
const getStaticCards = () => {
  const filePath = path.join(DATA_DIR, "oracle-cards.json");
  if (!fs.existsSync(filePath)) throw new Error("Oracle cards file not found");
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

app.get("/api/oracle-cards", (req, res) => {
  try {
    res.json(getStaticCards());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load oracle cards" });
  }
});

// --- Deck Storage ---
const deckFiles = ["new-deck","starter","aggro","control","midrange","mono-base","chaos"];
deckFiles.forEach(deckId => {
  const filePath = path.join(DECKS_DIR, `${deckId}.json`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([], null, 2));
});

// Load a deck
const loadDeck = (deckId) => {
  const filePath = path.join(DECKS_DIR, `${deckId}.json`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

// Save a deck
const saveDeck = (deckId, deck) => {
  const filePath = path.join(DECKS_DIR, `${deckId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deck, null, 2));
};

// GET a deck
app.get("/api/decks/:deckId", (req, res) => {
  try {
    const { deckId } = req.params;
    const deck = loadDeck(deckId);
    res.json(deck);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load deck" });
  }
});

// POST add a card (updates count if exists)
app.post("/api/decks/:deckId/add-card", (req, res) => {
  const { deckId } = req.params;

  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null),
    image_uris: Joi.object().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const deck = loadDeck(deckId);
    const index = deck.findIndex(c => c.name === req.body.name && c.type === req.body.type);

    if (index === -1) {
      deck.push({ ...req.body, count: 1 });
    } else {
      deck[index].count = (deck[index].count || 1) + 1;
    }

    saveDeck(deckId, deck);
    res.json({ success: true, deck });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add card to deck" });
  }
});

// POST remove a card
app.post("/api/decks/:deckId/remove-card", (req, res) => {
  const { deckId } = req.params;

  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null)
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const deck = loadDeck(deckId);
    const index = deck.findIndex(c => c.name === req.body.name && c.type === req.body.type);

    if (index === -1) return res.status(404).json({ success: false, message: "Card not found" });

    deck.splice(index, 1);
    saveDeck(deckId, deck);
    res.json({ success: true, deck });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove card from deck" });
  }
});

// Featured decks
app.get("/api/featured-decks", (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, "featured-decks.json");
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Featured decks file not found" });
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load featured decks" });
  }
});

// Serve static React app
app.use(express.static(path.join(__dirname, "public")));

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => console.log(`Server running on port ${port}`));
