const ErrorResponse = require("../utils/errorResponse");

function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;

  // console.log(err);
  // console.log(err.code);
  // console.log(err.name);

  if (err.name === "CastError") {
    error = new ErrorResponse("Invalid ID. ID must be a string of 12 bytes.", 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    statusCode: error.statusCode || 500,
    response: error.message || "Server error.",
  });
}

module.exports = errorHandler;
