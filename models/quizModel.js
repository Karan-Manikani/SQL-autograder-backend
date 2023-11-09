const mongoose = require("mongoose");
const crypto = require("crypto");

const quizSchema = new mongoose.Schema({
  quizName: { type: String, required: true, trim: true },
  branch: { type: String, required: true, trim: true },
  year: { type: String, required: true },
  open: { type: Boolean, required: true, default: false },
  database: { type: Buffer },
  databaseFileName: { type: String, trim: true },
  roomID: { type: String, default: () => crypto.randomBytes(3).toString("hex") },
  teacher: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "teacher" },
  primaryKeys: { type: Object },
  duration: { type: Number, required: true },

  databaseSchema: [
    {
      tableName: { type: String, trim: true },
      columns: [{ type: String, trim: true }],
      dtypes: [{ type: String, trim: true }],
    },
  ],

  keyRelationships: [
    {
      column1: { type: String, required: true },
      column2: { type: String, required: true },
    },
  ],

  questions: [
    {
      question: { type: String, required: true },
      marks: { type: Number, required: true },
      answer: { type: String },
    },
  ],
});

quizSchema.methods.toJSON = function () {
  const quiz = this;
  const quizObject = quiz.toObject();
  delete quizObject.database;
  return quizObject;
};

const quizModel = mongoose.model("quiz", quizSchema);

module.exports = quizModel;
