const axios = require("axios");

const jpmcConfig = require("../../configs/JpmcConfig.json");
const jpmcModel = require("../models/JpmcModel.js");
const utilityService = require("./UtilityService.js");
const lunarService = require("./LunarService.js");

const MODULE_NAME = utilityService.getModuleName(__filename);

const databaseJpmcConfig = {
  id: jpmcModel.id,
};

const config = {
  baseURL: jpmcConfig.baseUrl,
};

async function fetchJobCountAndLimit() {
  let jobCount = 0;
  let jobFetchLimit = 0;

  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  logger.info(
    "Making call to JPMC to fetch job count corresponding to required filters"
  );

  const response = await axios.get(jpmcConfig.fetchJobCount.path, config);

  if (response.status === 200) {
    jobCount = response.data.items[0].TotalJobsCount;
    jobFetchLimit = response.data.items[0].Limit;
  }

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return { jobCount, jobFetchLimit };
}

async function downloadJobs() {
  let jobs = [];

  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  const { jobCount, jobFetchLimit } = await fetchJobCountAndLimit();

  logger.info("Making call to JPMC to fetch jobs");

  if (jobCount > 0 && jobFetchLimit > 0) {
    let promises = [];
    for (let i = 0; i <= jobCount; i += jobFetchLimit) {
      promises.push(axios.get(jpmcConfig.fetchJobs.path + i, config));
    }

    const responses = await Promise.allSettled(promises);

    responses.forEach((response) => {
      if (response.status === "fulfilled" && response.value.status === 200) {
        jobs.push.apply(jobs, response.value.data.items[0].requisitionList);
      }
    });
  }

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return jpmcModel.createJobsArray(jobs);
}

async function fetchJobs() {
  let jobs = [];
  const jobsArray = [];
  let oldJobs = [];

  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  if (utilityService.server.locals.jobs.jpmc.length == 0) {
    oldJobs = await getAllJobs(false);
  } else {
    oldJobs = utilityService.server.locals.jobs.jpmc;
  }

  if (areExistingJobsTooOld(oldJobs)) {
    const expiredJobHashes = [];
    const newJobs = await downloadJobs();
  
    if (newJobs.length > 0) {
      const newJobArray = [];
      const oldJobMap = new Map();
      const newJobMap = new Map();
      
      jobs = newJobs;
  
      newJobs.forEach((job) => {
        newJobMap.set(job.jobHash, job);
      });

      oldJobs.forEach((job) => {
        oldJobMap.set(job.jobHash, job);
        
        if (!newJobMap.has(job.jobHash)) {
          expiredJobHashes.push(job.jobHash);
        }
      });
  
      newJobs.forEach((job) => {
        if (!oldJobMap.has(job.jobHash)) {
          newJobArray.push(job);
        }
      });

      if (newJobArray.length > 0) {
        saveJobs(newJobArray)
      }
    }
  
    if (expiredJobHashes.length > 0) {
      expireJobs(expiredJobHashes);
    }
  } else {
    jobs = oldJobs;
  }

  utilityService.server.locals.jobs.jpmc = jobs;
    
  logger.info(utilityService.commonLoggerStatements.SERVICE_END);
}

async function getAllJobs(expiredFlag) {
  let jobs = [];
  const options = {};

  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  if (expiredFlag) {
    options.filter = { "expiredFlag": true };
  } else if (expiredFlag === false) {
    options.filter = { "expiredFlag": false };
  }

  const response = await lunarService.getByCompany(
    jpmcModel.jobs,
    databaseJpmcConfig,
    options
  );

  if (response) {
    response.forEach((job) => {
      delete job._id;

      if (job.secondaryLocations.length > 0) {
        job.secondaryLocations.forEach((location) => {
          delete location._id;
        });
      }
    });

    jobs = response;
  }

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return jobs;
}

async function saveJobs(jobs) {
  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  await lunarService.insertManyJobs(jpmcModel.jobs, jobs, databaseJpmcConfig);

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);
}

async function expireJobs(jobHashes) {
  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  const jobs = jobHashes.map((jobHash) => {
    return {
      filter: jobHash,
      update: { expiredFlag: true }
    };
  });

  const response = await lunarService.updateManyWithSeparateFilters(jpmcModel.jobs, jobs, databaseJpmcConfig);

  if (response.modifiedCount !== jobHashes.length) {
    throw new Error("The expired status for jobs couldn't be updated to true.")
  }

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);
}

function areExistingJobsTooOld(jobs) {
  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  if ((jobs === undefined) || (jobs === null)) {
    jobs = utilityService.server.locals.jobs.jpmc;
  }

  let areExistingJobsTooOldFlag = true;

  if (jobs.length > 0) {
    // console.log("Current Date:", new Date(Date.now()));
    // console.log("Old job date:", new Date(jobs[0].fetchDate));
    // console.log("Difference between dates:", utilityService.findDifferenceBetweenDates(new Date(Date.now()), new Date(jobs[0].fetchDate), "HOURS"));
    areExistingJobsTooOldFlag = utilityService.findDifferenceBetweenDates(new Date(Date.now()), jobs[0].fetchDate, "HOURS") > 23.5
  }

  logger.info(`Are existing jobs too old: ${areExistingJobsTooOldFlag}`);

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return areExistingJobsTooOldFlag;
}

module.exports = {
  fetchJobs,
  areExistingJobsTooOld
};
