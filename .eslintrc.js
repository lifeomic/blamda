module.exports = {
  extends: ['@lifeomic/standards', 'prettier', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  env: {
    node: true,
  },
  rules: {
    '@typescript-eslint/no-require-imports': 'off',
  },
};
