import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import Joi from "joi";
import mongoose from "mongoose";

const app = express();
const port = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// mongodb connection
mongoose
  .connect("mongodb+srv://tkyano05:YDWRI4Nu4jG3mMds@cluster0.omtjkvp.mongodb.net/")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

// deck schema
const cardSchema = new mongoose.Schema({
  name: String,
  type: String,
  count: Number,
  image_uris: Object
});

const deckSchema = new mongoose.Schema({
  deckId: { type: String, required: true, unique: true },
  cards: [cardSchema]
});

const Deck = mongoose.model("Deck", deckSchema);

// helper: get deck or create if not exists
async function loadDeck(deckId) {
  let deck = await Deck.findOne({ deckId });
  if (!deck) {
    deck = new Deck({ deckId, cards: [] });
    await deck.save();
  }
  return deck;
}

// save deck (just calls save on Mongoose document)
async function saveDeck(deckId, deckDoc) {
  await deckDoc.save();
}

// get deck
app.get("/api/decks/:deckId", async (req, res) => {
  try {
    const deckDoc = await loadDeck(req.params.deckId);
    res.json(deckDoc.cards);
  } catch {
    res.status(500).json({ error: "Failed to load deck" });
  }
});

// add card
app.post("/api/decks/:deckId/add-card", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null),
    image_uris: Joi.object()
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const deckDoc = await loadDeck(req.params.deckId);
    const index = deckDoc.cards.findIndex(c => c.name === req.body.name);
    if (index === -1) {
      deckDoc.cards.push({ ...req.body, count: 1 });
    } else {
      deckDoc.cards[index].count += 1;
    }
    await saveDeck(req.params.deckId, deckDoc);
    res.json({ success: true, deck: deckDoc.cards });
  } catch {
    res.status(500).json({ error: "Failed to add card" });
  }
});

// remove card
app.post("/api/decks/:deckId/remove-card", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null)
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const deckDoc = await loadDeck(req.params.deckId);
    const index = deckDoc.cards.findIndex(c => c.name === req.body.name);
    if (index === -1) return res.status(404).json({ message: "Card not found" });

    deckDoc.cards.splice(index, 1);
    await saveDeck(req.params.deckId, deckDoc);
    res.json({ success: true, deck: deckDoc.cards });
  } catch {
    res.status(500).json({ error: "Failed to remove card" });
  }
});

// update card
app.put("/api/decks/:deckId/update-card", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null),
    count: Joi.number().integer().min(1).required(),
    image_uris: Joi.object()
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const deckDoc = await loadDeck(req.params.deckId);
    const index = deckDoc.cards.findIndex(c => c.name === req.body.name);
    if (index === -1) return res.status(404).json({ message: "Card not found" });

    deckDoc.cards[index] = { ...deckDoc.cards[index].toObject(), ...req.body };
    await saveDeck(req.params.deckId, deckDoc);
    res.json({ success: true, deck: deckDoc.cards });
  } catch {
    res.status(500).json({ error: "Failed to update card" });
  }
});

// delete card
app.delete("/api/decks/:deckId/delete-card", async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().allow("", null)
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const deckDoc = await loadDeck(req.params.deckId);
    const index = deckDoc.cards.findIndex(c => c.name === req.body.name);
    if (index === -1) return res.status(404).json({ message: "Card not found" });

    deckDoc.cards.splice(index, 1);
    await saveDeck(req.params.deckId, deckDoc);
    res.json({ success: true, deck: deckDoc.cards });
  } catch {
    res.status(500).json({ error: "Failed to delete card" });
  }
});

// serve react app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => console.log(`Server running on ${port}`));
