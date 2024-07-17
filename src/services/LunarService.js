const utilityService = require("./UtilityService.js");

const MODULE_NAME = utilityService.getModuleName(__filename);

async function insertManyJobs(model, documents, database) {
  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  logger.info(`Inserting data - ${database.id}`);

  await model.insertMany(documents);
  
  logger.info(utilityService.commonLoggerStatements.SERVICE_END);
}

async function getByCompany(model, database, options = {}) {
  let databaseResponse;
  const projection = options.projection;
  const filter = options.filter ? options.filter : {};
  
  filter.company = database.id

  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  logger.info(`Finding - ${database.id} :: filter - ${JSON.stringify(filter)} :: projection - ${JSON.stringify(projection)}`);
  if (projection) {
    databaseResponse = await model
      .find(filter)
      .select(projection)
      .lean();
  } else {
    databaseResponse = await model.find(filter).lean();
  }

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return databaseResponse;
}

async function updateManyWithSeparateFilters(model, updateArray, database) {
  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  updateArray = updateArray.map((object) => {
    return {
      updateOne: {
        filter: object.filter,
        update: object.update
      }
    };
  });

  logger.info(`Updating data - ${database.id}.`);

  const response = await model.bulkWrite(updateArray);

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return { modifiedCount: response.modifiedCount };
}

module.exports = {
  insertManyJobs,
  getByCompany,
  updateManyWithSeparateFilters
};
