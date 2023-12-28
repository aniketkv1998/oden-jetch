const utilityService = require("./UtilityService.js");

const MODULE_NAME = utilityService.getModuleName(__filename);

async function get(model, database, projection) {
  let databaseResponse;

  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  await database.connect();

  logger.info(`Finding id - ${database.id} :: projection - ${projection}`);
  if (projection) {
    databaseResponse = await model
      .findById(database.id)
      .select(projection)
      .lean();
  } else {
    databaseResponse = await model.findById(database.id).lean();
  }

  await database.closeConnection();

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return databaseResponse;
}

async function save(document, database) {
  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  await database.connect();

  logger.info(`Saving data - ${database.id}.`);
  await document.save();

  await database.closeConnection();

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);
}

async function replace(model, database, newObject) {
  const logger = utilityService.getLogger(MODULE_NAME);

  logger.info(utilityService.commonLoggerStatements.SERVICE_START);

  await database.connect();

  logger.info(`Replacing data - ${database.id}.`);
  const response = await model.replaceOne({ _id: database.id }, newObject);

  await database.closeConnection();

  logger.info(utilityService.commonLoggerStatements.SERVICE_END);

  return response;
}

module.exports = {
  get,
  save,
  replace,
};
