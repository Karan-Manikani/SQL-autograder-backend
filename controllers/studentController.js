const xlsx = require("xlsx");
const util = require("util");
const sqlite3 = require("sqlite3");
const Quiz = require("../models/quizModel");
const Student = require("../models/studentModel");
const ErrorResponse = require("../utils/errorResponse");
const { evaluateQuery } = require("../utils/queryEvaluator");

async function registerForQuiz(req, res, next) {
  try {
    const { roomID, rollNumber, name, studentID } = req.body;

    const quiz = await Quiz.findOne({ roomID });
    if (!quiz) return next(new ErrorResponse(`Quiz with roomID ${roomID} was not found.`, 404));

    if (studentID) {
      const student = await Student.findById(studentID);
      if (!student)
        return next(new ErrorResponse(`Student with id ${studentID} was not found.`, 404));

      return res.json({
        accessResults: true,
        statusCode: 400,
        student: student,
        quiz: quiz,
        message: "Accessing results",
      });
    }

    if (!quiz.open) {
      return res.json({
        success: false,
        statusCode: 400,
        quiz: quiz,
        message: "Quiz is not open",
      });
    }

    const studentQuizzes = await Student.find({ rollNumber });
    const alreadyRegistered = studentQuizzes.filter(
      (studentQuiz) => studentQuiz.quizID.toString() === quiz._id.toString()
    );
    if (alreadyRegistered.length > 0)
      return next(new ErrorResponse(`Student has already registered for the quiz.`, 401));

    const newRegistration = new Student({ name, rollNumber, quizID: quiz._id });
    await newRegistration.save();

    res.json({
      success: true,
      statusCode: 201,
      student: newRegistration,
      quiz: quiz,
      message: "Student has been registered successfully.",
    });
  } catch (error) {
    next(error);
  }
}

async function submitQuiz(req, res, next) {
  try {
    const { answers, rollNumber, quizID } = req.body;
    const student = await Student.findOne({ rollNumber, quizID });
    student.answers = answers;

    await student.save();
    res.json({
      success: true,
      statusCode: 200,
      message: "Answers saved successfully",
    });
  } catch (error) {
    next(error);
  }
}

async function gradeQueries(req, res, next) {
  try {
    // const quizID = req.params.id;
    const { studentID, quizID } = req.body;

    // Attempt to find quiz that matches the id provided
    const quiz = await Quiz.findById(quizID);
    if (!quiz) return next(new ErrorResponse(`Quiz with id ${quizID} was not found.`, 404));

    // Attempt to find student that matches the id provided
    const student = await Student.findById(studentID);
    if (!student)
      return next(new ErrorResponse(`Student with id ${studentID} was not found.`, 404));

    // Extract data from each sheet in the excel file
    const workbook = xlsx.read(quiz.database, { type: "buffer" });

    // Step 2: Convert Excel to JSON
    const jsonData = {};
    workbook.SheetNames.forEach((sheetName) => {
      jsonData[sheetName] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    });

    // Step 3: Convert JSON to SQLite format
    const db = new sqlite3.Database(":memory:"); // Use an in-memory database
    Object.entries(jsonData).forEach(([sheetName, data]) => {
      const columns = Object.keys(data[0]);
      const createTableQuery = `CREATE TABLE ${sheetName} (${columns.join(", ")});`;
      const insertDataQuery = `INSERT INTO ${sheetName} VALUES (${columns
        .map(() => "?")
        .join(", ")});`;

      db.serialize(() => {
        db.run(createTableQuery);

        const stmt = db.prepare(insertDataQuery);
        data.forEach((row) => stmt.run(Object.values(row)));
        stmt.finalize();
      });
    });

    // console.log(student.answers);
    // console.log(quiz.questions[0]["answer"]);

    const dbAll = util.promisify(db.all).bind(db);

    const results = [];

    for (let i = 0; i < student.answers.length; i++) {
      let studentQueryResult;
      let modelQueryResult;
      let isSame;
      const { answer: studentQuery } = student.answers[i];
      const { answer: modelQuery } = quiz.questions[i];

      try {
        studentQueryResult = await dbAll(studentQuery);
        modelQueryResult = await dbAll(modelQuery);
      } catch (err) {
        const answer = student.answers[i].answer;
        const maxMarks = student.answers[i].maxMarks;
        const marksAwarded = isSame ? maxMarks : 0;
        results.push({ answer, marksAwarded, maxMarks });
        // console.error(err.message);
        continue;
      }

      // console.log(studentQueryResult);
      // console.log(modelQueryResult);

      if (studentQueryResult && modelQueryResult) {
        isSame = evaluateQuery(studentQueryResult, modelQueryResult);
      } else {
        isSame = false;
      }
      // console.log(isSame);
      const answer = student.answers[i].answer;
      const maxMarks = student.answers[i].maxMarks;
      const marksAwarded = isSame ? maxMarks : 0;
      results.push({ answer, marksAwarded, maxMarks });
    }

    student.answers = results;
    console.log(results);

    await student.save();

    res.json({
      success: true,
      statusCode: 200,
      response: student,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
}

async function getStudentByID(req, res, next) {
  try {
    const studentID = req.params.id;
    const student = await Student.findById(studentID);
    if (!student)
      return next(new ErrorResponse(`Student with id ${studentID} was not found.`, 404));

    res.json({
      success: true,
      statusCode: 200,
      response: student,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { registerForQuiz, submitQuiz, gradeQueries, getStudentByID };
