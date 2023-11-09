function convertExcelDateToFormat(excelDate) {
  // Convert Excel serial date to JavaScript Date object
  const jsDate = new Date((excelDate - 1) * 24 * 60 * 60 * 1000 + Date.UTC(1899, 11, 30));

  // Format the date as DD-MM-YYYY
  const day = jsDate.getDate().toString().padStart(2, "0");
  const month = (jsDate.getMonth() + 1).toString().padStart(2, "0"); // Months are zero-based
  const year = jsDate.getFullYear();

  return `${day}-${month}-${year}`;
}

function getDtype(value) {
  if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
    return "BOOLEAN";
  }

  // Check for DATE
  if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value)) {
    return "DATE";
  }

  // Try parsing as INTEGER
  const integerValue = parseInt(value, 10);
  if (!isNaN(integerValue)) {
    return "INTEGER";
  }

  // Try parsing as FLOAT
  const floatValue = parseFloat(value);
  if (!isNaN(floatValue) && floatValue.toString() === value) {
    return "FLOAT";
  }

  // If none of the above, treat as VARCHAR
  return "VARCHAR";
}

module.exports = { convertExcelDateToFormat, getDtype };
