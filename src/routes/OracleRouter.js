const express = require("express");

const oracleService = require("../services/OracleService");

const router = express();

router.get("/jobs", async (req, res, next) => {
  try {
    const jobList = await oracleService.fetchJobs();
    res.status(200).json(jobList);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
