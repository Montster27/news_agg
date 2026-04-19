const path = require("node:path");

function getDesktopPaths(app) {
  const userData = app.getPath("userData");

  return {
    userData,
    dbPath: path.join(userData, "tech-command-center.sqlite"),
    documents: app.getPath("documents"),
  };
}

module.exports = {
  getDesktopPaths,
};
