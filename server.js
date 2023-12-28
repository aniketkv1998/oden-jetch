const express = require("express");
const app = express();
const morgan = require("morgan");
const helmet = require("helmet");

const oracleRouter = require("./src/routes/OracleRouter.js");
const errorHandler = require("./src/middlewares/ErrorHandler.js").errorHandler;

app.use(helmet());
app.disable("x-powered-by");

app.use(
  morgan(
    "[:date[clf]] :method :url :status :response-time ms - :res[content-length]"
  )
);

app.use("/oracle", oracleRouter);

app.get("/", (req, res, next) => {
  res.send("Welcome to Jobfetch by Oden.");
});

app.use((req, res, next) => {
  res.status(404).send("Sorry couldn't find what you were looking for!");
});

app.use(errorHandler);

const listener = app.listen(8070, async () => {
  console.log(`oden-jobfetch is listening on port ${listener.address().port}`);
});
