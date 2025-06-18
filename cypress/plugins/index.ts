/// <reference types="cypress" />

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on: any, config: any) => {
  on("task", {
    "db:seed": async () => {
      // Add database seeding logic here
      console.log("Seeding test database...")
      return null
    },
    "db:clean": async () => {
      // Add database cleaning logic here
      console.log("Cleaning test database...")
      return null
    },
  })
}
