/**
 * The package is ESM ("type": "module"), so Jest runs the tests as native ES
 * modules. That needs node's `--experimental-vm-modules` flag, which the `test`
 * scripts in package.json pass. No transform: the source ships as-is.
 */
export default {
  testEnvironment: 'node',
  transform: {},
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    // Jest's experimental ESM loader fails to link @graphql-eslint's ESM build
    // ("module is already linked"). Resolve it to the CJS build the package
    // publishes for `require`; Jest's interop still gives us its named exports.
    '^@graphql-eslint/eslint-plugin$': '<rootDir>/node_modules/@graphql-eslint/eslint-plugin/cjs/index.js',
  },
};
