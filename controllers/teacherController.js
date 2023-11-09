const teacherModel = require("../models/teacherModel");
const ErrorResponse = require("../utils/errorResponse");

async function register(req, res, next) {
  const { email } = req.body;
  try {
    // The email address needs to be unique to each teacher, hence we throw an error if the teacher is trying to create an account with an email that already exists in the database.
    const teacher = await teacherModel.findOne({ email });
    if (teacher) next(new ErrorResponse("Email already exists", 409));

    // Create the new teacher and save it on the database.
    const newTeacher = await teacherModel.create(req.body);
    await newTeacher.save();

    // Once the teacher has been saved to the database, we generate a JWT auth token that is unique to the teacher send it back to the client.
    const token = newTeacher.generateAuthToken();
    res.json({
      success: true,
      statusCode: 201,
      response: newTeacher,
      token: "Bearer " + token,
      message: "Your account has been successfully created",
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  const { email, password } = req.body;
  try {
    // Try to find a teacher by their email.
    const teacher = await teacherModel.findOne({ email });
    if (!teacher) return next(new ErrorResponse("Invalid email or password", 401));

    // Compare the password entered to the hashed password in the database
    const passwordsMatch = await teacher.isMatch(password);
    if (!passwordsMatch) return next(new ErrorResponse("Invalid email or password", 401));

    // Generate the auth token and send it back to the client.
    const token = teacher.generateAuthToken();
    res.json({
      success: true,
      statusCode: 200,
      response: teacher,
      token: "Bearer " + token,
      message: "Logged in successfully",
    });
  } catch (error) {
    next(error);
  }
}

async function getTeacherProfile(req, res, next) {
  try {
    res.json({
      success: true,
      statusCode: 200,
      response: req.teacher,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getTeacherProfile,
};
