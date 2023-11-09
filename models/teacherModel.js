const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, unique: true },
  password: { type: String, required: true },
  quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "quiz" }],
});

// Hash plain text password before saving
teacherSchema.pre("save", async function (next) {
  const teacher = this;
  if (teacher.isModified("password")) {
    teacher.password = await bcrypt.hash(teacher.password, 8);
  }
  next();
});

// Verify password
teacherSchema.methods.isMatch = async function (password) {
  const teacher = this;
  return await bcrypt.compare(password, teacher.password);
};

// Generate authentication token
teacherSchema.methods.generateAuthToken = function () {
  const teacher = this;
  const token = jwt.sign({ id: teacher._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return token;
};

teacherSchema.methods.toJSON = function () {
  const teacher = this;
  const teacherObject = teacher.toObject();
  delete teacherObject.password;
  return teacherObject;
};

const teacherModel = mongoose.model("teacher", teacherSchema);

module.exports = teacherModel;
