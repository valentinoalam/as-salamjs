declare namespace Cypress {
  interface Chainable {
    /**
     * Custom login command with session caching
     * @example cy.login('user@example.com', 'password123')
     */
    login(email: string, password: string): Chainable<void>;

    /**
     * Logs in as admin using predefined credentials
     * @example cy.loginAsAdmin()
     */
    loginAsAdmin(): Chainable<void>;

    /**
     * Logs in as regular user using predefined credentials
     * @example cy.loginAsUser()
     */
    loginAsUser(): Chainable<void>;

    /**
     * Seeds the test database
     * @example cy.seedDatabase()
     */
    seedDatabase(): Chainable<void>;

    /**
     * Cleans the test database
     * @example cy.cleanDatabase()
     */
    cleanDatabase(): Chainable<void>;

    /**
     * Gets element by data-testid attribute
     * @example cy.getByTestId('submit-button')
     */
    getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
  }
}