module.exports = {
  logMessage(msg) {
    const date = new Date();
    console.log("[" + date.toISOString() + "] " + msg);
  }
}