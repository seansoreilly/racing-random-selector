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

// Serve static files from the root directory with caching
app.use(
  express.static(__dirname, {
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
