import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import fs from "fs";
import Joi from "joi";
import mongoose from "mongoose";

const app = express();
const port = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// --------------------- CONNECT TO MONGODB ---------------------
mongoose
  .connect("mongodb+srv://tkyano05:YDWRI4Nu4jG3mMds@cluster0.omtjkvp.mongodb.net/forgebloom")
  .then(() => console.log("Connected to MongoDB..."))
  .catch((err) => console.error("Could not connect to MongoDB...", err));

// --------------------- SCHEMAS ---------------------
const cardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: String,
  count: { type: Number, default: 1 },
  image_uris: Object,
});

const deckSchema = new mongoose.Schema({
  deckId: { type: String, required: true, unique: true },
  cards: [cardSchema],
});

const Deck = mongoose.model("Deck", deckSchema);

// --------------------- ORACLE CARDS ---------------------
const DATA_DIR = path.join(__dirname, "data");
const ORACLE_FILE = path.join(DATA_DIR, "oracle-cards.json");

const getStaticCards = () => {
  if (!fs.existsSync(ORACLE_FILE)) throw new Error("Oracle cards not found");
  return JSON.parse(fs.readFileSync(ORACLE_FILE, "utf-8"));
};

app.get("/api/oracle-cards", (req, res) => {
  try {
    res.json(getStaticCards());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load oracle cards" });
  }
});

// --------------------- DECK HELPERS ---------------------
const loadDeck = async (deckId) => {
  let deck = await Deck.findOne({ deckId });
  if (!deck) {
    deck = new Deck({ deckId, cards: [] });
    await deck.save();
  }
  return deck;
};

const saveDeck = async (deck) => {
  await deck.save();
};

// --------------------- DECK ROUTES ---------------------
app.get("/api/decks/:deckId", async (req, res) => {
  try {
    const deck = await loadDeck(req.params.deckId);
    res.json(deck); // send deck object
  } catch (err) {
    res.status(500).json({ error: "Failed to load deck" });
  }
});

app.post("/api/decks/:deckId/add-card", async (req, res) => {
  const { deckId } = req.params;

  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null),
    image_uris: Joi.object(),
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const deck = await loadDeck(deckId);
    const index = deck.cards.findIndex((c) => c.name === req.body.name);

    if (index === -1) deck.cards.push({ ...req.body, count: 1 });
    else deck.cards[index].count += 1;

    await saveDeck(deck);
    res.json({ success: true, deck: deck.cards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add card" });
  }
});

// --------------------- STATIC FILES ---------------------
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------- START SERVER ---------------------
app.listen(port, () => console.log(`Server running on ${port}`));
