const express = require("express");
const path = require("path");
const pino = require("pino");

const serverConfig = require("../../configs/ServerConfig.json");

server = express();

server.locals = {
  mode: {
    current: serverConfig.mode.current,
    available: {
      LOCAL: serverConfig.mode.available.LOCAL,
      PUBLIC: serverConfig.mode.available.PUBLIC
    }
  },
  jobs: {
    jpmc: [],
    oracle: []
  },
  jobFetchLock: {
    jpmc: 0,
    oracle: 0
  }
}

const commonLoggerStatements = {
  SERVICE_START: "SERVICE::START",
  SERVICE_END: "SERVICE::END",
};

async function sleep(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function getTimestamp(date) {
  return date.toISOString();
}

function getLogger(moduleName) {
  return pino(
    {
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
    }, 
    pino.destination({
      sync: true
    })
  );
}

function getModuleName(fileName) {
  return path.parse(fileName).name;
}

function findIntersection(set1, set2) {
  const map = new Map();
  const intersection = [];

  set1.forEach((data) => map.set(data, false));
  set2.forEach((data) => {
    if (map.has(data)) {
      map.set(data, true);
    } else {
      map.set(data, false);
    }
  });

  map.forEach((value, key) => {
    if (value) {
      intersection.push(key);
    }
  });

  return intersection;
}

function findDifference(set1, set2) {
  const difference = [];
  const map = new Map();

  const valuesInIntersection = findIntersection(set1, set2);

  set1.forEach((data) => map.set(data, true));
  if (valuesInIntersection.length > 0) {
    valuesInIntersection.forEach((data) => {
      if (map.has(data)) {
        map.set(data, false);
      }
    });
  }

  map.forEach((value, key, map) => {
    if (value) {
      difference.push(key);
    }
  });

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
    case "HOURS": {
      return difference / (1000 * 60 * 60);
    }
    case "MINUTES": {
      return difference / (1000 * 60);
    }
    case "SECONDS": {
      return difference / 1000;
    }
    default: {
      return difference;
    }
  }
}

module.exports = {
  server,
  commonLoggerStatements,
  sleep,
  getModuleName,
  getLogger,
  getTimestamp,
  findIntersection,
  findDifference,
  findDifferenceBetweenDates,
};
