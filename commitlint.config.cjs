/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Restrict to the types defined in the versioning policy
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'chore', 'ci', 'test', 'refactor', 'perf'],
    ],
  },
};
