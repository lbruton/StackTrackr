module.exports = [
  {
    files: ["js/**/*.js", "sw.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "script",
    },
    rules: {
      "no-undef": "off",
    },
  },
];
