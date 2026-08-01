const { execSync } = require("child_process");

/**
 * Get git commit hash from multiple sources with proper fallbacks
 * Supports Vercel, GitHub Actions, and local development
 */
function getGitCommitHash() {
  // Priority 1-3: CI/deployment environment variables
  const envSources = [
    { envVar: "VERCEL_GIT_COMMIT_SHA", source: "Vercel" },
    { envVar: "GITHUB_SHA", source: "GitHub Actions" },
    { envVar: "CI_COMMIT_SHA", source: "CI" },
  ];

  for (const { envVar, source } of envSources) {
    const value = process.env[envVar];
    if (value) {
      const shortHash = value.substring(0, 7);
      console.log(`Using ${source} commit hash: ${shortHash}`);
      return shortHash;
    }
  }

  // Priority 4: Local development fallback
  try {
    const hash = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    console.log("Using local git commit hash:", hash);
    return hash;
  } catch (error) {
    console.warn("Could not get git commit hash:", error.message);
  }

  console.warn("No git commit hash available, using fallback");
  return "unknown";
}

let cachedBuildInfo = null;

/**
 * Get comprehensive build information
 * Computed once and cached, since the commit hash and version should stay
 * stable for the lifetime of the process rather than changing per-request.
 */
function getBuildInfo() {
  if (cachedBuildInfo) {
    return cachedBuildInfo;
  }

  const buildTime = process.env.BUILD_TIME || new Date().toISOString();
  const commitHash = getGitCommitHash();

  cachedBuildInfo = {
    commitHash,
    buildTime,
    environment: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    version: `${commitHash}-${Date.now()}`,
    platform: process.env.VERCEL ? "vercel" : "local",
  };

  return cachedBuildInfo;
}

/**
 * Get safe build info for public exposure (no sensitive data)
 */
function getPublicBuildInfo() {
  const buildInfo = getBuildInfo();
  return {
    commitHash: buildInfo.commitHash,
    buildTime: buildInfo.buildTime,
    environment: buildInfo.environment,
    isProduction: buildInfo.isProduction,
    version: buildInfo.version,
    platform: buildInfo.platform,
  };
}

module.exports = {
  getGitCommitHash,
  getBuildInfo,
  getPublicBuildInfo,
};
