require("dotenv").config();
const cors = require("cors");
const express = require("express");
const passport = require("passport");
const quizRouter = require("./routes/quizRoutes");
const connectToDB = require("./database/connectToDB");
const teacherRouter = require("./routes/teacherRoutes");
const studentRouter = require("./routes/studentRoutes");
const errorHandler = require("./middleware/errorHandler");

connectToDB();

const app = express();

app.use(express.json());
app.use(cors());

// Passport middleware
app.use(passport.initialize());
require("./config/passport")(passport);

// Routes
app.use("/api/quiz", quizRouter);
app.use("/api/teachers", teacherRouter);
app.use("/api/students", studentRouter);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`Server is up on port ${PORT}`));
