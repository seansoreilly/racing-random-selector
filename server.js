const express = require("express");
const path = require("path");
const { getBuildInfo, getPublicBuildInfo } = require("./lib/build-info");

const app = express();
const PORT = process.env.PORT || 3000;

// Get build info at startup
const buildInfo = getBuildInfo();
console.log("Server starting with build info:", buildInfo);

// JSON middleware for API routes
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
// Health check endpoint with build info
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    ...getPublicBuildInfo(),
  });
});

// Build info endpoint
app.get("/api/build-info", (req, res) => {
  res.json(getPublicBuildInfo());
});

// Static file serving options shared across the explicit allowlist below
const staticOptions = {
  etag: true,
  lastModified: true,
  maxAge: "1h",
  setHeaders: (res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    // Add build info to response headers for debugging
    res.set("X-Build-Commit", buildInfo.commitHash);
    res.set("X-Build-Time", buildInfo.buildTime);
  },
};

// Serve only the specific assets the app references, instead of exposing
// the entire repository root via express.static(__dirname).
app.use("/public", express.static(path.join(__dirname, "public"), staticOptions));
["/index.html", "/script.js", "/styles.css"].forEach((route) => {
  app.use(route, express.static(path.join(__dirname, route), staticOptions));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Unknown API routes get a real JSON 404 instead of falling back to index.html
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Any remaining request for what looks like a static file (has a file
// extension) was not matched by the allowlist above, so it does not exist —
// return a real 404 rather than leaking repository files through the SPA
// fallback below.
app.use((req, res, next) => {
  if (path.extname(req.path)) {
    return res.status(404).send("Not found");
  }
  next();
});

// Handle 404s and serve index.html for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

function createApp() {
  return app;
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(
      `Build info - Commit: ${buildInfo.commitHash}, Environment: ${buildInfo.environment}`
    );
  });
}

module.exports = app;
module.exports.createApp = createApp;
