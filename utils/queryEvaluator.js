function sortObjectKeys(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((sortedObj, key) => {
      sortedObj[key] = obj[key];
      return sortedObj;
    }, {});
}

const extractObjectValues = (jsonStrings) => {
  const objectsArray = jsonStrings.map((jsonString) => Object.values(JSON.parse(jsonString)));
  return objectsArray;
};

function evaluateQuery(studentQueryResult, modelQueryResult) {
  const sortedA = studentQueryResult.map((obj) => JSON.stringify(sortObjectKeys(obj))).sort();
  const sortedB = modelQueryResult.map((obj) => JSON.stringify(sortObjectKeys(obj))).sort();

  let isSame = JSON.stringify(sortedA) === JSON.stringify(sortedB);

  if (!isSame) {
    isSame =
      JSON.stringify(extractObjectValues(sortedA)) == JSON.stringify(extractObjectValues(sortedB));
  }

  return isSame;
}

module.exports = { evaluateQuery };
