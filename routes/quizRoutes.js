const multer = require("multer");
const express = require("express");
const passport = require("passport");
const quizController = require("../controllers/quizController");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get(
  "/fetch-one/:id",
  // passport.authenticate("jwt", { session: false }),
  quizController.getQuizByID
);

router.post(
  "/create-quiz",
  passport.authenticate("jwt", { session: false }),
  quizController.createQuiz
);

router.post(
  "/upload-excel",
  upload.single("excelFile"),
  passport.authenticate("jwt", { session: false }),
  quizController.uploadExcelFile
);

router.get(
  "/fetch-excel/:id",
  passport.authenticate("jwt", { session: false }),
  quizController.fetchExcelFile
);

router.get(
  "/fetch-quizzes",
  passport.authenticate("jwt", { session: false }),
  quizController.fetchQuizzesWithoutDatabase
);

router.get(
  "/fetch-students/:id",
  passport.authenticate("jwt", { session: false }),
  quizController.fetchStudentEnrolled
);

router.get(
  "/grade-queries/:id",
  passport.authenticate("jwt", { session: false }),
  quizController.gradeQueries
);

router.patch(
  "/open/:id",
  passport.authenticate("jwt", { session: false }),
  quizController.openQuiz
);

router.patch(
  "/close/:id",
  passport.authenticate("jwt", { session: false }),
  quizController.closeQuiz
);

router.delete(
  "/delete/:id",
  passport.authenticate("jwt", { session: false }),
  quizController.deleteQuiz
);

router.post(
  "/answers/:id",
  passport.authenticate("jwt", { session: false }),
  quizController.getAnswersFromModel
);

module.exports = router;
