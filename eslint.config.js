const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      "styles.css",
      "public/**",
      "src/**",
      "nanobanana-output/**",
    ],
  },
  {
    // Browser script (plain <script> tag, no bundler/modules)
    files: ["script.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": "warn",
    },
  },
  {
    // Node.js server + lib code
    files: ["server.js", "lib/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },
];
