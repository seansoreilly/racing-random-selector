// Clear module cache
Object.keys(require.cache).forEach(function(key) {
  delete require.cache[key];
});

const express = require("express");
const path = require("path");

const app = express();
const PORT = 8000;

// Serve static files from the root directory with logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
// Serve static files from the root directory with caching
app.use(express.static(__dirname, {
  etag: true,
  lastModified: true,
  maxAge: '1h',
  setHeaders: (res, path) => {
    // Set appropriate content types
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    } else if (path.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    }
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// Handle 404s and serve index.html for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
