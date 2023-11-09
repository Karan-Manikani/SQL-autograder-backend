const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  rollNumber: { type: String, required: true, trim: true },
  marks: { type: Number, default: 0 },
  quizID: { type: mongoose.Schema.Types.ObjectId, ref: "quiz" },
  answers: [
    {
      answer: { type: String, trim: true },
      maxMarks: { type: Number },
      marksAwarded: { type: Number },
    },
  ],
});

const studentModel = mongoose.model("student", studentSchema);

module.exports = studentModel;
