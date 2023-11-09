require("dotenv").config();
const mongoose = require("mongoose");
mongoose.set("strictQuery", true);

function connectToDB() {
  try {
    mongoose.connect(process.env.MONGODB_URI);
    console.log("Database connection successful.");
  } catch (error) {
    console.log("Database connection failed");
    process.exit(1);
  }
}

module.exports = connectToDB;
