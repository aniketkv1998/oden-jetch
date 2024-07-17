const express = require("express");
const app = express();
const morgan = require("morgan");
const helmet = require("helmet");
const cron = require("node-cron");

const oracleRouter = require("./src/routes/OracleRouter.js");
const jpmcRouter = require("./src/routes/JpmcRouter.js");
const errorHandler = require("./src/middlewares/ErrorHandler.js").errorHandler;
const server = require("./src/services/UtilityService.js").server;
const cronService = require("./src/services/CronService.js");
const bootStart = require("./src/services/BootstartService.js").bootStart;

app.use(helmet());
app.disable("x-powered-by");

app.use(
  morgan(
    "[:date[clf]] :method :url :status :response-time ms - :res[content-length]"
  )
);

if (server.locals.mode === server.locals.mode.available.PUBLIC) {
  cron.schedule("0 0 0 * * *", () => {
    cronService.run();
  });
}

app.use("/oracle", oracleRouter);
app.use("/jpmc", jpmcRouter);

app.get("/", (req, res, next) => {
  res.send("Welcome to Jetch by Oden.");
});

app.use((req, res, next) => {
  res.status(404).send("Sorry couldn't find what you were looking for!");
});

app.use(errorHandler);

const listener = app.listen(8070, async () => {
  console.log(`oden-jetch is listening on port ${listener.address().port}\n`);
  
  bootStart();
});
