var Service = require("node-windows").Service;
const path = require("path");

// Create a new service object
var svc = new Service({
  name: "Notion CMS Script",
  description:
    "Periodically checks for new Notion posts and pushes them to GitHub.",
  script: path.join(process.cwd(), "index.js"),
});

svc.on("install", function () {
  svc.start();
});

svc.install();
