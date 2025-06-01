import './commands';

// Configure Cypress behavior
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test on uncaught exceptions
  // This is useful for handling React errors that don't affect test functionality
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});

// Global before hook
beforeEach(() => {
  // Clear localStorage and sessionStorage before each test
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Reset database state if needed
  cy.task('db:reset', { failOnStatusCode: false });
});

// Global after hook
afterEach(() => {
  // Clean up any test data
  cy.clearLocalStorage();
  cy.clearCookies();
});
