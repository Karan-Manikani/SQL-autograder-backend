const express = require("express");
const passport = require("passport");
const teacherControllers = require("../controllers/teacherController");

const router = express.Router();

router.post("/register", teacherControllers.register);
router.post("/login", teacherControllers.login);
router.get(
  "/me",
  passport.authenticate("jwt", { session: false }),
  teacherControllers.getTeacherProfile
);

module.exports = router;
