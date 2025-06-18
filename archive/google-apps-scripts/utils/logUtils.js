function logError(context, error) {
  Logger.log(`[${context}] ${error && error.stack ? error.stack : error}`);
}
module.exports = { logError };