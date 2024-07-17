const jpmcService = require("./JpmcService.js");
const utilityService = require("./UtilityService.js");
const mongoConfig = require("../../configs/MongoConfig.json");

const { default: mongoose } = require("mongoose");

const MODULE_NAME = utilityService.getModuleName(__filename);

async function bootStart() {
    const logger = utilityService.getLogger(MODULE_NAME);

    logger.info(utilityService.commonLoggerStatements.SERVICE_START);

    await connect();
    
    if (utilityService.server.locals.jobFetchLock.jpmc == 0) {
        utilityService.server.locals.jobFetchLock.jpmc = 1;
        
        await jpmcService.fetchJobs();

        utilityService.server.locals.jobFetchLock.jpmc = 0;
    }

    logger.info(utilityService.commonLoggerStatements.SERVICE_END);
};

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

module.exports = {
    bootStart,
    closeConnection
}