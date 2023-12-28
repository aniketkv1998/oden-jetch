const { Schema, default: mongoose } = require("mongoose");

const utilityService = require("../services/UtilityService");
const mongoConfig = require("../../configs/MongoConfig.json");

const MODULE_NAME = utilityService.getModuleName(__filename);
const idValue = "oracle";
const appliedValues = {
  APPLIED: "applied",
  NOT_APPLIED: "not_applied",
  CANNOT_APPLY: "cannot_apply",
};

const OracleSchema = new Schema({
  _id: String,
  jobs: {
    fetchDate: String,
    items: [
      {
        jobId: String,
        applied: String,
        title: String,
        postedDate: String,
        shortDescription: String,
        primaryLocation: String,
        primaryLocationCountry: String,
        hotJobFlag: Boolean,
        trendingFlag: Boolean,
        beFirstToApplyFlag: Boolean,
        expiredFlag: Boolean,
        relevancy: Number,
        workplaceTypeCode: String,
        workplaceType: String,
        secondaryLocations: [
          {
            name: String,
            countryCode: String,
          },
        ],
      },
    ],
  },
});

const jobs = mongoose.model("OracleJobs", OracleSchema, "jobs");

async function connect() {
  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info("Connecting to mongoDB server for lunar database.");

  return await mongoose.connect(mongoConfig.mongooseUri);
}

async function closeConnection() {
  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info("Closing connection with mongoDB server for lunar database.");

  return await mongoose.disconnect();
}

function create(jobsArray) {
  const jobItems = createItemsArray(jobsArray);

  const jobModel = {
    _id: idValue,
    jobs: {
      fetchDate: utilityService.getTimestamp(new Date(Date.now())),
      items: jobItems,
    },
  };

  return { document: new jobs(jobModel), object: jobModel };
}

function createItemsArray(jobsArray) {
  const jobItems = jobsArray.map((item) => {
    const secondaryLocations =
      item.secondaryLocations.length > 0
        ? item.secondaryLocations.map((location) => {
            const modifiedLocation = {
              name: location.Name,
              countryCode: location.CountryCode,
            };

            return modifiedLocation;
          })
        : [];

    const modifiedItem = {
      jobId: item.Id,
      applied: appliedValues.NOT_APPLIED,
      title: item.Title,
      postedDate: item.PostedDate,
      shortDescription: item.ShortDescriptionStr,
      primaryLocation: item.PrimaryLocation,
      primaryLocationCountry: item.PrimaryLocationCountry,
      hotJobFlag: item.HotJobFlag,
      trendingFlag: item.TrendingFlag,
      beFirstToApplyFlag: item.BeFirstToApplyFlag,
      expiredFlag: false,
      relevancy: item.Relevancy,
      workplaceTypeCode: item.WorkplaceTypeCode,
      workplaceType: item.WorkplaceType,
      secondaryLocations: secondaryLocations,
    };

    return modifiedItem;
  });

  return jobItems;
}

module.exports = {
  jobs,
  id: idValue,
  applied: appliedValues,
  create,
  createItemsArray,
  connect,
  closeConnection,
};
