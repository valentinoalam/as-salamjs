/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 *
 * @type {import('jest').Config} // This JSDoc provides type checking in JS files
 */

// Use require for CommonJS modules, as this file is .cts
const nextJest = require('next/jest.js');
const path = require('path'); // Import path module for resolving paths

// `ts-jest` types can be imported here for type checking
// import type { JestConfigWithTsJest } from 'ts-jest';

const createJestConfig = nextJest({
  dir: './',
});

// Define the base Jest configuration
const baseConfig = { // Use JestConfigWithTsJest for better type inference
  preset: 'ts-jest',
  // Setup files to run before tests in the environment
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Test environment for browser-like DOM APIs
  testEnvironment: 'jest-environment-jsdom',

  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // --- Coverage Configuration ---
  // Indicates whether the coverage information should be collected
  collectCoverage: false,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    // Include relevant application code folders
    "src/app/**/*.{js,jsx,ts,tsx}",
    "src/components/**/*.{js,jsx,ts,tsx}",
    "src/lib/**/*.{js,jsx,ts,tsx}",
    "src/stores/**/*.{js,jsx,ts,tsx}",
    // Exclude declaration files, node_modules, build outputs, and config files from coverage
    "!src/app/api/*.{js,jsx,ts,tsx}",
    "!src/components/ui/*.{js,jsx,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**", // Don't collect coverage on the coverage report files themselves
    "!**/*.config.{js,ts,cts}", // Exclude Jest config, Next.js config, etc. - added .cts
    "!**/jest.setup.ts", // Exclude setup files from coverage
    "!middleware.ts", // Correct path if middleware is in src/
    "!src/types/**/*.ts", // Exclude global types or interfaces if they're purely types
  ],

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",

  // Configure minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // List of reporter names for coverage reports
  coverageReporters: [
    "json",
    "text",
    "lcov",
    "clover"
  ],

  // --- Module Resolution and Mocks ---
  moduleNameMapper: {
    // Alias for paths starting with @/
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock CSS/Less/Sass imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Optional: Custom mock for next/image. If you have one, uncomment this.
    // Ensure the mock file exists at the specified path.
    // '^next/image$': '<rootDir>/__mocks__/next/image.ts',
  },

  // --- Ignoring Paths ---
  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: [
    '<rootDir>/.next/', // Ignore Next.js build output
    '<rootDir>/node_modules/', // Ignore node modules
    '<rootDir>/cypress/', // Ignore Cypress specific tests
    '<rootDir>/dist/', // Ignore any custom build output directories
  ],
  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    "\\\\node_modules\\\\"
  ],

  // --- TypeScript / Transpilation for test files ---
  // This transform is explicitly set to use `ts-jest` and point it to `tsconfig.jest.json`.
  // This is crucial for applying your specific test TypeScript configuration.
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      // Use your dedicated tsconfig for Jest
      tsconfig: path.resolve(__dirname, 'tsconfig.jest.json'),
    }],
  },
  // Ensure the module file extensions include .ts and .tsx so Jest processes them.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};

// Export the Jest configuration created by nextJest
// `nextJest` wraps your config to integrate with Next.js's specific Babel/SWC setup.
module.exports = createJestConfig(baseConfig);
