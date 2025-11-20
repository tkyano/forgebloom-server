import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import fs from "fs";
import Joi from "joi";

const app = express();
const port = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- Oracle cards (read-only)
const getStaticCards = () => {
  const filePath = path.join(__dirname, "public", "json", "oracle-cards.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

app.get("/api/oracle-cards", (req, res) => {
  res.json(getStaticCards());
});

// --- Deck storage ---
const DECKS_DIR = path.join(__dirname, "public", "json", "decks");
if (!fs.existsSync(DECKS_DIR)) fs.mkdirSync(DECKS_DIR, { recursive: true });

const deckFiles = ["new-deck","starter","aggro","control","midrange","mono-base","chaos"];
deckFiles.forEach(deckId => {
  const filePath = path.join(DECKS_DIR, `${deckId}.json`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([], null, 2));
});

// Load deck
const loadDeck = (deckId) => {
  const filePath = path.join(DECKS_DIR, `${deckId}.json`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

// Save deck
const saveDeck = (deckId, deck) => {
  const filePath = path.join(DECKS_DIR, `${deckId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deck, null, 2));
};

// GET deck
app.get("/api/decks/:deckId", (req, res) => {
  const { deckId } = req.params;
  const deck = loadDeck(deckId);
  res.json(deck);
});

// POST add card (updates count if exists)
app.post("/api/decks/:deckId/add-card", (req, res) => {
  const { deckId } = req.params;

  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null),
    image_uris: Joi.object().optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const deck = loadDeck(deckId);

  const index = deck.findIndex(c => c.name === req.body.name && c.type === req.body.type);

  if (index === -1) {
    deck.push({ ...req.body, count: 1 });
  } else {
    deck[index].count = (deck[index].count || 1) + 1;
  }

  saveDeck(deckId, deck);
  res.json({ success: true, deck });
});

// POST remove card
app.post("/api/decks/:deckId/remove-card", (req, res) => {
  const { deckId } = req.params;
  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null)
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const deck = loadDeck(deckId);

  const index = deck.findIndex(c => c.name === req.body.name && c.type === req.body.type);

  if (index !== -1) {
    deck.splice(index, 1); // remove the card entirely
    saveDeck(deckId, deck);
    res.json({ success: true, deck });
  } else {
    res.status(404).json({ success: false, message: "Card not found" });
  }
});

// --- Featured decks
app.get("/api/featured-decks", (req, res) => {
  const filePath = path.join(__dirname, "public", "json", "featured-decks.json");
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Featured decks file not found" });
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  res.json(data);
});

// SPA fallback
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => console.log(`Server running on port ${port}`));
