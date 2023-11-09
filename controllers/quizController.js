require("dotenv").config();
const xlsx = require("xlsx");
const util = require("util");
const sqlite3 = require("sqlite3");
const Quiz = require("../models/quizModel");
const ErrorResponse = require("../utils/errorResponse");
const { getDtype } = require("../utils/excelFunctions");
const Student = require("../models/studentModel");
const { evaluateQuery } = require("../utils/queryEvaluator");
const axios = require("axios");

async function createQuiz(req, res, next) {
  try {
    // Create new quiz document and save it to the database
    const newQuiz = new Quiz(req.body);
    newQuiz.teacher = req.teacher._id;
    await newQuiz.save();

    res.json({
      success: true,
      statusCode: 201,
      response: newQuiz,
      roomID: newQuiz.roomID,
      message: "Quiz has been created successfully.",
    });
  } catch (error) {
    next(error);
  }
}

async function uploadExcelFile(req, res, next) {
  try {
    const { _id, fileName } = req.body;

    // Attempt to find quiz that matches the id provided in req.body
    const quiz = await Quiz.findById(_id);
    if (!quiz) return next(new ErrorResponse(`Quiz with id ${_id} was not found.`, 404));

    // Update the quiz's database field with the new Excel file buffer
    const excelFileBuffer = req.file.buffer;
    quiz.database = excelFileBuffer;
    quiz.databaseFileName = fileName;

    // Object to store sheet information
    const sheetInfo = [];

    // Parse the excel file
    const workbook = xlsx.read(excelFileBuffer, { type: "buffer" });

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const range = xlsx.utils.decode_range(sheet["!ref"]);

      // Extract column names and datatypes
      const columns = [];
      const dtypes = [];

      for (let row = range.s.r; row < 2; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cell = xlsx.utils.encode_cell({ r: row, c: col });
          const formattedValue = xlsx.utils.format_cell(sheet[cell]);
          if (row === 0) columns.push(formattedValue);
          else dtypes.push(getDtype(formattedValue));
        }
      }

      // Store information in the object
      const sheetData = { tableName: sheetName, columns, dtypes };
      sheetInfo.push(sheetData);
    });

    quiz.databaseSchema = sheetInfo;

    // Save the updated quiz document
    await quiz.save();

    res.json({
      success: true,
      statusCode: 200,
      response: quiz,
      message: "Excel file uploaded successfully.",
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
}

async function fetchExcelFile(req, res, next) {
  try {
    const quizID = req.params.id;

    // Attempt to find quiz that matches the id provided
    const quiz = await Quiz.findById(quizID);
    if (!quiz) return next(new ErrorResponse(`Quiz with id ${quizID} was not found.`, 404));

    // // Extract data from each sheet in the excel file
    const excelJSON = {};
    const excelData = xlsx.read(quiz.database, { type: "buffer" });
    excelData.SheetNames.forEach((sheet) => {
      const sheetJSON = xlsx.utils.sheet_to_json(excelData.Sheets[sheet]);
      excelJSON[sheet] = sheetJSON;
    });

    res.json({
      success: true,
      statusCode: 200,
      response: excelJSON,
    });
  } catch (error) {
    next(error);
  }
}

async function fetchQuizzesWithoutDatabase(req, res, next) {
  try {
    // Retrieve quizzes from the database for a specific teacher
    const quizzes = await Quiz.find({ teacher: req.teacher._id });

    res.json({
      success: true,
      statusCode: 200,
      response: quizzes,
    });
  } catch (error) {
    next(error);
  }
}

async function fetchStudentEnrolled(req, res, next) {
  try {
    const quizID = req.params.id;
    const students = await Student.find({ quizID });

    res.json({
      success: true,
      statusCode: 200,
      response: students,
    });
  } catch (error) {
    next(error);
  }
}

async function gradeQueries(req, res, next) {
  try {
    const quizID = req.params.id;
    // const { studentQuery, modelQuery } = req.body;

    // Attempt to find quiz that matches the id provided
    const quiz = await Quiz.findById(quizID);
    if (!quiz) return next(new ErrorResponse(`Quiz with id ${quizID} was not found.`, 404));

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

    const dbAll = util.promisify(db.all).bind(db);

    let studentQueryResult;
    let modelQueryResult;
    const studentQuery =
      "SELECT Books.book_id FROM Books INNER JOIN BorrowedBooks ON Books.book_id = BorrowedBooks.book_id GROUP BY Books.title ORDER BY COUNT(*) DESC LIMIT 1;";
    const modelQuery =
      'SELECT member_name FROM members WHERE join_date  <  "2022-01-01" INTERSECT SELECT author_name FROM books WHERE book_id IN ( SELECT book_id FROM borrowedbooks WHERE member_id IN ( SELECT member_id FROM members WHERE join_date  <  "2022-01-01" ) )';

    try {
      studentQueryResult = await dbAll(studentQuery);
      modelQueryResult = await dbAll(modelQuery);
    } catch (err) {
      console.error(err.message);
    } finally {
      db.close();
    }

    const isSame = evaluateQuery(studentQueryResult, modelQueryResult);

    res.json({
      success: true,
      statusCode: 200,
      response: isSame,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
}

async function deleteQuiz(req, res, next) {
  try {
    const quizID = req.params.id;

    // Attempt to find quiz that matches the id provided
    const quiz = await Quiz.findById(quizID);
    if (!quiz) return next(new ErrorResponse(`Quiz with id ${quizID} was not found.`, 404));

    await quiz.remove();

    res.json({
      success: true,
      statusCode: 200,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

async function openQuiz(req, res, next) {
  try {
    const quizID = req.params.id;

    // Attempt to find quiz that matches the id provided
    const quiz = await Quiz.findById(quizID);
    if (!quiz) return next(new ErrorResponse(`Quiz with id ${quizID} was not found.`, 404));

    quiz.open = true;
    await quiz.save();

    res.json({
      success: true,
      statusCode: 200,
      response: quiz,
      message: "Quiz accepting responses",
    });
  } catch (error) {
    next(error);
  }
}

async function closeQuiz(req, res, next) {
  try {
    const quizID = req.params.id;

    // Attempt to find quiz that matches the id provided
    const quiz = await Quiz.findById(quizID);
    if (!quiz) return next(new ErrorResponse(`Quiz with id ${quizID} was not found.`, 404));

    quiz.open = false;
    await quiz.save();

    res.json({
      success: true,
      statusCode: 200,
      response: quiz,
      message: "Quiz no longer accepting responses",
    });
  } catch (error) {
    next(error);
  }
}

async function getAnswersFromModel(req, res, next) {
  try {
    const quizID = req.params.id;
    // const answers = req.body;

    // Attempt to find quiz that matches the id provided
    const quiz = await Quiz.findById(quizID);
    if (!quiz) return next(new ErrorResponse(`Quiz with id ${quizID} was not found.`, 404));

    // const ques1 = quiz.questions[0]["question"];
    // const ques = `### Complete SQL query only and with no explanation\n### SQL tables followed by foreign key information:\n#\n# Books ( book_id, title, author_id, genre, publication_year )\n# Authors ( author_id, author_name, birth_year )\n# Members ( member_id, member_name, join_date )\n# BorrowedBooks ( borrow_id, book_id, member_id, borrow_date, return_date )\n#\n# BorrowedBooks.book_id can be joined with Books.book_id\n# BorrowedBooks.member_id can be joined with Members.member_id\n# Authors.author_id can be joined with Books.author_id\n#\n### Question:\n#\n# ${ques1}\n#\n### SQL:\n`;

    // console.log(ques);
    // const resp = await axios.post("http://34.69.187.219:8081/predict", { text: ques });

    // await quiz.save();
    // console.log(resp);
    // resp.data.result will give you the entire result

    const results = [];

    const questions = quiz.questions;
    for (const question of questions) {
      let prompt =
        "### Complete SQL query only and with no explanation\n### SQL tables followed by foreign key information:\n#\n# ";
      for (const schema of quiz.databaseSchema) {
        const tableName = schema.tableName;
        const columns = schema.columns.join(", ");
        prompt += tableName + "( " + columns + " )" + "\n# ";
      }

      prompt += "\n# ";

      for (const relation of quiz.keyRelationships) {
        const column1 = relation.column1;
        const column2 = relation.column2;
        prompt += column1 + " can be joined with " + column2 + "\n# ";
      }

      prompt += "\n### Question:\n#\n# ";
      prompt += question.question + "\n#\n### SQL:\n";

      const { data } = await axios.post(process.env.LLM_ENDPOINT, { text: prompt });
      const pattern = /### SQL:(.*?)### End\./s;
      const match = data.result.match(pattern);
      const sqlQuery = match ? match[1].trim() : null;

      const modelQuery = sqlQuery.split("#")[2].trim();

      const newQuestion = question.question;
      const newMarks = question.marks;
      const newObj = { question: newQuestion, answer: modelQuery, marks: newMarks };

      results.push(newObj);
    }

    quiz.questions = results;

    await quiz.save();

    res.json({
      success: true,
      statusCode: 200,
      response: quiz,
      message: "Answers fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}

async function getQuizByID(req, res, next) {
  try {
    const quizID = req.params.id;
    const quiz = await Quiz.findById(quizID);
    if (!quiz) return next(new ErrorResponse(`Student with id ${quizID} was not found.`, 404));

    res.json({
      success: true,
      statusCode: 200,
      response: quiz,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createQuiz,
  uploadExcelFile,
  fetchExcelFile,
  fetchQuizzesWithoutDatabase,
  fetchStudentEnrolled,
  gradeQueries,
  deleteQuiz,
  openQuiz,
  closeQuiz,
  getAnswersFromModel,
  getQuizByID,
};
