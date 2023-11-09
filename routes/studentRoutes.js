const express = require("express");
const passport = require("passport");
const studentController = require("../controllers/studentController");

const router = express.Router();

router.get("/:id", studentController.getStudentByID);
router.post("/register", studentController.registerForQuiz);
router.post("/submit-quiz", studentController.submitQuiz);
router.post("/grade-queries", studentController.gradeQueries);

module.exports = router;
