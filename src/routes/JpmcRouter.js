const express = require("express");
const utilityService = require("../services/UtilityService");

const jpmcService = require("../services/JpmcService");

const router = express();

router.get("/jobs", async (req, res, next) => {
  try {
    if (utilityService.server.locals.jobFetchLock.jpmc == 0) {
      utilityService.server.locals.jobFetchLock.jpmc = 1;

      if (jpmcService.areExistingJobsTooOld()) {
        await jpmcService.fetchJobs();  
      }

      utilityService.server.locals.jobFetchLock.jpmc = 0;        
    }

    const intervalId = setInterval(() => {
      if (utilityService.server.locals.jobFetchLock.jpmc == 0) {
        clearInterval(intervalId);

        res.status(200).json(utilityService.server.locals.jobs.jpmc);
      }
    }, 0);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
