function errorHandler(err, req, res, next) {
  res.status(500).send("Internal server error.");

  next(err);
}

module.exports = {
  errorHandler,
};
