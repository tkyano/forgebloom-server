import mongoose from "mongoose";

// testdb is name of database, it will automatically make it
mongoose
  .connect("mongodb+srv://tkyano05:YDWRI4Nu4jG3mMds@cluster0.omtjkvp.mongodb.net/")
  .then(() => console.log("Connected to mongodb..."))
  .catch((err) => console.error("Could not connect to MongoDB...", err));

const schema = new mongoose.Schema({
  name: String,
});

const Message = mongoose.model("Message", schema);

async function createMessage() {
  const message = new Message({ name: "Hello World" });
  const result = await message.save();
  console.log(result);
}

createMessage();
