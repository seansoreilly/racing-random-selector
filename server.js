// Clear module cache
Object.keys(require.cache).forEach(function (key) {
  delete require.cache[key];
});

const express = require("express");
const path = require("path");
const { getBuildInfo, getPublicBuildInfo } = require("./lib/build-info");

const app = express();
const PORT = process.env.PORT || 8000;

// Get build info at startup
const buildInfo = getBuildInfo();
console.log("Server starting with build info:", buildInfo);

// JSON middleware for API routes
app.use(express.json());

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

// Serve static files from the root directory with logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static files from the root directory with caching
app.use(
  express.static(__dirname, {
    etag: true,
    lastModified: true,
    maxAge: "1h",
    setHeaders: (res, path) => {
      // Set appropriate content types
      if (path.endsWith(".js")) {
        res.set("Content-Type", "application/javascript");
      } else if (path.endsWith(".css")) {
        res.set("Content-Type", "text/css");
      } else if (path.endsWith(".png")) {
        res.set("Content-Type", "image/png");
      }
      // Enable CORS
      res.set("Access-Control-Allow-Origin", "*");
      // Add build info to response headers for debugging
      res.set("X-Build-Commit", buildInfo.commitHash);
      res.set("X-Build-Time", buildInfo.buildTime);
    },
  })
);

// Handle 404s and serve index.html for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(
    `Build info - Commit: ${buildInfo.commitHash}, Environment: ${buildInfo.environment}`
  );
});
