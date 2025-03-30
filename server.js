// Clear module cache
Object.keys(require.cache).forEach(function(key) {
  delete require.cache[key];
});

const express = require("express");
const path = require("path");

const app = express();
const PORT = 8000;

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve index.html for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
