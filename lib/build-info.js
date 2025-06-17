const { execSync } = require("child_process");

/**
 * Get git commit hash from multiple sources with proper fallbacks
 * Supports Vercel, GitHub Actions, and local development
 */
function getGitCommitHash() {
  const sources = [
    // Priority 1: Vercel deployment environment
    () => {
      if (process.env.VERCEL_GIT_COMMIT_SHA) {
        const shortHash = process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
        console.log("Using Vercel commit hash:", shortHash);
        return shortHash;
      }
      return null;
    },

    // Priority 2: GitHub Actions environment
    () => {
      if (process.env.GITHUB_SHA) {
        const shortHash = process.env.GITHUB_SHA.substring(0, 7);
        console.log("Using GitHub Actions commit hash:", shortHash);
        return shortHash;
      }
      return null;
    },

    // Priority 3: Generic CI environment
    () => {
      if (process.env.CI_COMMIT_SHA) {
        const shortHash = process.env.CI_COMMIT_SHA.substring(0, 7);
        console.log("Using CI commit hash:", shortHash);
        return shortHash;
      }
      return null;
    },

    // Priority 4: Local development fallback
    () => {
      try {
        const hash = execSync("git rev-parse --short HEAD", {
          encoding: "utf8",
          stdio: "pipe",
        }).trim();
        console.log("Using local git commit hash:", hash);
        return hash;
      } catch (error) {
        console.warn("Could not get git commit hash:", error.message);
        return null;
      }
    },
  ];

  // Try each source in order
  for (const source of sources) {
    const hash = source();
    if (hash) {
      return hash;
    }
  }

  console.warn("No git commit hash available, using fallback");
  return "unknown";
}

/**
 * Get comprehensive build information
 */
function getBuildInfo() {
  const buildTime = process.env.BUILD_TIME || new Date().toISOString();
  const commitHash = getGitCommitHash();

  return {
    commitHash,
    buildTime,
    environment: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    version: `${commitHash}-${Date.now()}`,
    platform: process.env.VERCEL ? "vercel" : "local",
  };
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
    version: buildInfo.version,
    platform: buildInfo.platform,
  };
}

module.exports = {
  getGitCommitHash,
  getBuildInfo,
  getPublicBuildInfo,
};
