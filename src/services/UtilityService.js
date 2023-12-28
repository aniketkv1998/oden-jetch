const path = require("path");
const pino = require("pino");

const commonLoggerStatements = {
  SERVICE_START: "SERVICE::START",
  SERVICE_END: "SERVICE::END",
};

async function sleep(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function getTimestamp(date) {
  const dateVal = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();

  return `${year}-${month}-${dateVal}T${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function getLogger(moduleName) {
  return pino({
    level: "debug",
    formatters: {
      level(label, number) {
        return { level: label };
      },
      bindings(bindings) {
        return { name: moduleName + "::" + getLogger.caller.name };
      },
    },
    timestamp: () => `, "time":"${getTimestamp(new Date(Date.now()))}"`,
  });
}

function getModuleName(fileName) {
  return path.parse(fileName).name;
}

function findIntersection(set1, set2) {
  const map = new Map();
  const intersection = [];

  set1.forEach((data) => map.set(data, false));
  set2.forEach((data) => {
    const temp = map.has(data);
    if (map.has(data)) {
      map.set(data, true);
    } else {
      map.set(data, false);
    }
  });

  map.forEach((value, key, map) => {
    if (value) {
      intersection.push(key);
    }
  });

  return intersection;
}

function findDifference(set1, set2) {
  const difference = [];
  let intersectionPossible = true;
  const map = new Map();

  set1.forEach((data) => map.set(data, false));
  set2.forEach((data) => {
    if (map.has(data)) {
      map.set(data, true);
    } else {
      intersectionPossible = false;
    }
  });

  if (intersectionPossible) {
    map.forEach((value, key, map) => {
      if (!value) {
        difference.push(key);
      }
    });
  } else {
    return null;
  }

  return difference;
}

function findDifferenceBetweenDates(date1, date2, differenceType) {
  let difference;
  if (date1 > date2) {
    difference = date1 - date2;
  } else {
    difference = date2 - date1;
  }

  switch (differenceType) {
    case "DAYS": {
      return difference / (1000 * 60 * 60 * 24);
    }
    case "MINUTES": {
      return difference / (1000 * 60 * 60);
    }
    case "SECONDS": {
      return difference / (1000 * 60);
    }
    case "MILLISECONDS": {
      return difference / 1000;
    }
    default: {
      return difference / 1000;
    }
  }
}

module.exports = {
  commonLoggerStatements,
  sleep,
  getModuleName,
  getLogger,
  getTimestamp,
  findIntersection,
  findDifference,
  findDifferenceBetweenDates,
};
