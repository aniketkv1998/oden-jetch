const jpmcService = require("./JpmcService.js");
const utilityService = require("./UtilityService.js");

const server = utilityService.server;

const MODULE_NAME = utilityService.getModuleName(__filename);

async function run() {
    const logger = utilityService.getLogger(MODULE_NAME);

    logger.info(utilityService.commonLoggerStatements.SERVICE_START);

    if (utilityService.server.locals.jobFetchLock.jpmc == 0) {
        utilityService.server.locals.jobFetchLock.jpmc = 1;
        
        await jpmcService.fetchJobs();

        utilityService.server.locals.jobFetchLock.jpmc = 0;
    }

    logger.info(utilityService.commonLoggerStatements.SERVICE_END);
}

module.exports = {
    run
}