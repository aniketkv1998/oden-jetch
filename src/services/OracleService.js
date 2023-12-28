const axios = require("axios");

const oracleConfig = require("../../configs/OracleConfig.json");
const oracleModel = require("../models/OracleModel.js");
const utilityService = require("./UtilityService.js");
const lunarService = require("./LunarService.js");

const MODULE_NAME = utilityService.getModuleName(__filename);

const databaseOracleConfig = {
  id: oracleModel.id,
  connect: oracleModel.connect,
  closeConnection: oracleModel.closeConnection,
};

const config = {
  baseURL: oracleConfig.baseUrl,
};

async function fetchJobCountAndLimit() {
  let jobCount = 0;
  let jobFetchLimit = 0;

  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  logger.info(
    "Making call to Oracle to fetch job count corresponding to required filters"
  );

  const response = await axios.get(oracleConfig.fetchJobCount.path, config);

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

  logger.info("Making call to Oracle to fetch jobs");

  if (jobCount > 0 && jobFetchLimit > 0) {
    let promises = [];
    for (let i = 0; i <= jobCount; i += jobFetchLimit) {
      promises.push(axios.get(oracleConfig.fetchJobs.path + i, config));
    }

    const responses = await Promise.allSettled(promises);

    responses.forEach((response) => {
      if (response.status === "fulfilled" && response.value.status === 200) {
        jobs.push.apply(jobs, response.value.data.items[0].requisitionList);
      }
    });
  }

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return jobs;
}

async function fetchJobs() {
  let jobsFlag = false;
  let jobs = [];

  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  const oldFetchDate = await getFetchDate();

  if (!oldFetchDate) {
    jobs = await downloadJobs();

    if (jobs.length > 0) {
      jobs = await saveJobs(jobs);
      jobsFlag = true;
    }
  } else {
    const diffDays = Math.floor(
      utilityService.findDifferenceBetweenDates(
        new Date(Date.now()),
        new Date(oldFetchDate),
        "DAYS"
      )
    );

    if (diffDays >= 1) {
      let newJobsFlag = false;
      let expiredJobsFlag = false;

      const oldJobIds = await getJobIds();

      let newJobs = await downloadJobs();

      if (newJobs.length > 0) {
        let newJobIds = newJobs.map((job) => job.Id);

        const intersectionOfJobIds = utilityService.findIntersection(
          oldJobIds,
          newJobIds
        );

        newJobIds = utilityService.findDifference(
          newJobIds,
          intersectionOfJobIds
        );

        if (newJobIds && newJobIds.length > 0) {
          const newJobIdsMap = new Map();
          newJobIds.forEach((id) => newJobIdsMap.set(id, true));
          newJobs = newJobs.filter((job) => newJobIdsMap.has(job.Id));
          newJobs = oracleModel.createItemsArray(newJobs);
          newJobsFlag = true;
        }

        const expiredJobIds = utilityService.findDifference(
          oldJobIds,
          intersectionOfJobIds
        );

        const expiredJobIdsMap = new Map();
        if (expiredJobIds && expiredJobIds.length > 0) {
          expiredJobIds.forEach((id) => expiredJobIdsMap.set(id, true));
          expiredJobsFlag = true;
        }

        if (newJobsFlag || expiredJobsFlag) {
          jobs = await updateJobs({ expired: expiredJobIdsMap, new: newJobs });
          jobsFlag = true;
        }
      }
    }
  }

  if (!jobsFlag) {
    jobs = await getAllJobs();
  }

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return jobs;
}

async function getAllJobs() {
  let jobs = [];

  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  const response = await lunarService.get(
    oracleModel.jobs,
    databaseOracleConfig
  );

  if (response) {
    response.jobs.items.forEach((item) => {
      delete item._id;

      if (item.secondaryLocations.length > 0) {
        item.secondaryLocations.forEach((location) => {
          delete location._id;
        });
      }
    });

    jobs = response.jobs.items;
  }

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return jobs;
}

async function getJobIds() {
  let jobIds = null;

  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  const projection = { "jobs.items.jobId": 1 };

  const response = await lunarService.get(
    oracleModel.jobs,
    databaseOracleConfig,
    projection
  );

  if (response) {
    jobIds = response.jobs.items.map((item) => item.jobId);
  }

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return jobIds;
}

async function getFetchDate() {
  let fetchDate = null;

  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  const projection = { "jobs.fetchDate": 1 };

  const response = await lunarService.get(
    oracleModel.jobs,
    databaseOracleConfig,
    projection
  );

  if (response) {
    fetchDate = response.jobs.fetchDate;
  }

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return fetchDate;
}

async function saveJobs(jobs) {
  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  const oracleJobs = oracleModel.create(jobs);

  await lunarService.save(oracleJobs.document, databaseOracleConfig);

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return oracleJobs.object.jobs.items;
}

async function updateJobs(jobs) {
  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  const allJobs = await getAllJobs();

  if (allJobs.length > 0) {
    allJobs.push.apply(allJobs, jobs.new);
    allJobs.forEach((job) => {
      if (jobs.expired.has(job.jobId)) {
        job.expiredFlag = true;
        job.applied = oracleModel.applied.CANNOT_APPLY;
      }
    });

    const newObject = {
      _id: databaseOracleConfig.id,
      jobs: {
        fetchDate: utilityService.getTimestamp(new Date(Date.now())),
        items: allJobs,
      },
    };

    const response = await lunarService.replace(
      oracleModel.jobs,
      databaseOracleConfig,
      newObject
    );

    if (response.modifiedCount === 0) {
      throw new Error("Existing list of Oracle jobs couldn't be updated.");
    }
  } else {
    throw new Error(
      "Update was not possible because there is no existing document to update."
    );
  }

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return allJobs;
}

module.exports = {
  fetchJobs,
};
