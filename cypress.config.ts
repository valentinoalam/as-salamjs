/* eslint-disable @typescript-eslint/no-unused-vars */
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    supportFile: "cypress/support/e2e.ts",
    // SpecPattern specifies which files Cypress should consider as test files.
    // Default: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',

    // Viewport settings for testing responsiveness
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    // Retries configuration for failed tests
    // Set to 1 to retry failed tests once
    retries: {
      runMode: 1, // Number of retries when running via 'cypress run'
      openMode: 0, // Number of retries when running via 'cypress open'
    },
  },
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    supportFile: "cypress/support/component.ts",
    specPattern: "cypress/component/**/*.cy.{js,jsx,ts,tsx}",
  },
});
