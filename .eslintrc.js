module.exports = {
  "extends": [
    '@blockstack'
  ],
  "rules": {
    "@typescript-eslint/no-unnecessary-type-assertion": ["off"],
    "no-restricted-globals": ["error", {
      "name": "fetch",
      "message": "Use `privateFetch` instead."
    }
  ],
  }
}
