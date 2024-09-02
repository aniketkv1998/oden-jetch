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

        let jobs = utilityService.server.locals.jobs.jpmc;

        let responseJobs = null;

        if (null === req.query.locations || req.query.locations === undefined) {
          responseJobs = jobs;
        } else {
          let locations = req.query.locations.split(",");
          responseJobs = jobs.filter((job) => {
            let trueFlag = locations.some((location) => {
              let flag = job.primaryLocation
                .toLowerCase()
                .includes(location.toLowerCase());

              if (!flag) {
                flag = job.secondaryLocations.some((secondaryLocation) => {
                  secondaryLocation.name
                    .toLowerCase()
                    .includes(location.toLowerCase());
                });
              }

              return flag;
            });

            return trueFlag;
          });
        }

        res.status(200).json(responseJobs);
      }
    }, 0);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
