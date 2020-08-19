module.exports = {
  root: true,
  extends: ['@blockstack/eslint-config'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  "rules": {
    "@typescript-eslint/no-unnecessary-type-assertion": ["off"],
    "@typescript-eslint/no-non-null-assertion": ["off"],
    "no-restricted-globals": ["error", {
      "name": "fetch",
      "message": "Use `privateFetch` instead."
    }
  ],
  }
}
