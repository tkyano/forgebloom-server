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

// DATA directories
const DATA_DIR = path.join(__dirname, "data");
const DECKS_DIR = path.join(DATA_DIR, "decks");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DECKS_DIR)) fs.mkdirSync(DECKS_DIR);

// Oracle cards (read-only)
const getStaticCards = () => {
  const filePath = path.join(DATA_DIR, "oracle-cards.json");
  if (!fs.existsSync(filePath)) throw new Error("Oracle cards not found");
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

// Deck storage helpers
const deckFiles = ["new-deck","starter","aggro","control","midrange","mono-base","chaos"];
deckFiles.forEach(deckId => {
  const fp = path.join(DECKS_DIR, `${deckId}.json`);
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, JSON.stringify([], null, 2));
});

const loadDeck = (deckId) => {
  const filePath = path.join(DECKS_DIR, `${deckId}.json`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

const saveDeck = (deckId, deck) => {
  const filePath = path.join(DECKS_DIR, `${deckId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deck, null, 2));
};

// GET deck
app.get("/api/decks/:deckId", (req, res) => {
  try {
    const deck = loadDeck(req.params.deckId);
    res.json(deck);
  } catch (err) {
    res.status(500).json({ error: "Failed to load deck" });
  }
});

// POST add-card
app.post("/api/decks/:deckId/add-card", (req, res) => {
  const { deckId } = req.params;

  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null),
    image_uris: Joi.object()
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const deck = loadDeck(deckId);
    const index = deck.findIndex(c => c.name === req.body.name);

    if (index === -1) {
      deck.push({ ...req.body, count: 1 });
    } else {
      deck[index].count += 1;
    }

    saveDeck(deckId, deck);
    res.json({ success: true, deck });
  } catch (err) {
    res.status(500).json({ error: "Failed to add card" });
  }
});

// POST remove-card (remove 1 copy)
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
    const index = deck.findIndex(c => c.name === req.body.name);

    if (index === -1) return res.status(404).json({ message: "Card not found" });

    deck.splice(index, 1);
    saveDeck(deckId, deck);

    res.json({ success: true, deck });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove card" });
  }
});

// ✅ PUT update-card
app.put("/api/decks/:deckId/update-card", (req, res) => {
  const { deckId } = req.params;

  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null),
    count: Joi.number().integer().min(1).required(),
    image_uris: Joi.object()
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const deck = loadDeck(deckId);
    const index = deck.findIndex(c => c.name === req.body.name);

    if (index === -1) return res.status(404).json({ message: "Card not found" });

    deck[index] = { ...deck[index], ...req.body };
    saveDeck(deckId, deck);

    res.json({ success: true, deck });
  } catch (err) {
    res.status(500).json({ error: "Failed to update card" });
  }
});

// ✅ DELETE delete-card
app.delete("/api/decks/:deckId/delete-card", (req, res) => {
  const { deckId } = req.params;

  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null)
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const deck = loadDeck(deckId);
    const index = deck.findIndex(c => c.name === req.body.name);

    if (index === -1) return res.status(404).json({ message: "Card not found" });

    deck.splice(index, 1);
    saveDeck(deckId, deck);

    res.json({ success: true, deck });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete card" });
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => console.log(`Server running on ${port}`));
