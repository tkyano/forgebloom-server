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

// --- Paths for JSON data ---
const DATA_DIR = path.join(__dirname, "data", "json");
const DECKS_DIR = path.join(DATA_DIR, "decks");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DECKS_DIR)) fs.mkdirSync(DECKS_DIR, { recursive: true });

// --- Oracle Cards ---
const getStaticCards = () => {
  const filePath = path.join(DATA_DIR, "oracle-cards.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

app.get("/api/oracle-cards", (req, res) => {
  res.json(getStaticCards());
});

// --- Ensure deck files exist ---
const deckFiles = ["new-deck","starter","aggro","control","midrange","mono-base","chaos"];
deckFiles.forEach(deckId => {
  const filePath = path.join(DECKS_DIR, `${deckId}.json`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([], null, 2));
});

// --- Load / Save Deck ---
const loadDeck = (deckId) => {
  const filePath = path.join(DECKS_DIR, `${deckId}.json`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

const saveDeck = (deckId, deck) => {
  const filePath = path.join(DECKS_DIR, `${deckId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deck, null, 2));
};

// --- Deck APIs ---
app.get("/api/decks/:deckId", (req, res) => {
  const { deckId } = req.params;
  const deck = loadDeck(deckId);
  res.json(deck);
});

app.post("/api/decks/:deckId/add-card", (req, res) => {
  const { deckId } = req.params;

  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null),
    image_uris: Joi.object().optional()
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
    deck.splice(index, 1);
    saveDeck(deckId, deck);
    res.json({ success: true, deck });
  } else {
    res.status(404).json({ success: false, message: "Card not found" });
  }
});

// --- Featured Decks ---
app.get("/api/featured-decks", (req, res) => {
  const filePath = path.join(DATA_DIR, "featured-decks.json");
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Featured decks file not found" });

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  res.json(data);
});

// --- Serve SPA ---
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => console.log(`Server running on port ${port}`));
