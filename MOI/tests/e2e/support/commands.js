// Custom Cypress commands for MOI application

// Authentication commands
Cypress.Commands.add('login', (email, password) => {
  const userEmail = email || Cypress.env('testUser').email;
  const userPassword = password || Cypress.env('testUser').password;

  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(userEmail);
  cy.get('[data-testid="password-input"]').type(userPassword);
  cy.get('[data-testid="login-button"]').click();
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/dashboard');
  cy.get('[data-testid="user-menu"]').should('be.visible');
});

Cypress.Commands.add('register', (userData) => {
  const user = userData || Cypress.env('testUser');

  cy.visit('/register');
  cy.get('[data-testid="firstName-input"]').type(user.firstName);
  cy.get('[data-testid="lastName-input"]').type(user.lastName);
  cy.get('[data-testid="email-input"]').type(user.email);
  cy.get('[data-testid="password-input"]').type(user.password);
  cy.get('[data-testid="register-button"]').click();
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

// Content management commands
Cypress.Commands.add('createContent', (contentData) => {
  const defaultContent = {
    title: 'Test Content',
    content: 'This is test content for E2E testing',
    platforms: ['linkedin'],
    ...contentData
  };

  cy.get('[data-testid="create-content-button"]').click();
  cy.get('[data-testid="content-title-input"]').type(defaultContent.title);
  cy.get('[data-testid="content-body-input"]').type(defaultContent.content);
  
  // Select platforms
  defaultContent.platforms.forEach(platform => {
    cy.get(`[data-testid="platform-${platform}"]`).check();
  });
  
  cy.get('[data-testid="save-content-button"]').click();
  
  // Wait for success message
  cy.get('[data-testid="success-message"]').should('be.visible');
});

Cypress.Commands.add('generateAIContent', (prompt, options = {}) => {
  cy.get('[data-testid="ai-generate-button"]').click();
  cy.get('[data-testid="ai-prompt-input"]').type(prompt);
  
  if (options.platforms) {
    options.platforms.forEach(platform => {
      cy.get(`[data-testid="ai-platform-${platform}"]`).check();
    });
  }
  
  if (options.tone) {
    cy.get('[data-testid="ai-tone-select"]').click();
    cy.get(`[data-value="${options.tone}"]`).click();
  }
  
  cy.get('[data-testid="generate-button"]').click();
  
  // Wait for AI generation to complete
  cy.get('[data-testid="generated-content"]', { timeout: 30000 }).should('be.visible');
});

Cypress.Commands.add('approveContent', (contentId) => {
  cy.visit(`/content/${contentId}`);
  cy.get('[data-testid="approve-button"]').click();
  cy.get('[data-testid="approval-feedback-input"]').type('Content approved for publishing');
  cy.get('[data-testid="confirm-approval-button"]').click();
  
  // Wait for approval confirmation
  cy.get('[data-testid="approval-success"]').should('be.visible');
});

Cypress.Commands.add('publishContent', (contentId) => {
  cy.visit(`/content/${contentId}`);
  cy.get('[data-testid="publish-button"]').click();
  cy.get('[data-testid="confirm-publish-button"]').click();
  
  // Wait for publishing to complete
  cy.get('[data-testid="publishing-success"]').should('be.visible');
});

// Navigation commands
Cypress.Commands.add('navigateTo', (page) => {
  const routes = {
    dashboard: '/dashboard',
    content: '/content',
    campaigns: '/campaigns',
    analytics: '/analytics',
    settings: '/settings'
  };
  
  if (routes[page]) {
    cy.visit(routes[page]);
  } else {
    cy.visit(page);
  }
});

// API commands
Cypress.Commands.add('apiRequest', (method, url, body = null) => {
  return cy.request({
    method,
    url: `${Cypress.env('apiUrl')}${url}`,
    body,
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('token')}`
    },
    failOnStatusCode: false
  });
});

// Database commands (requires backend test helpers)
Cypress.Commands.add('resetDatabase', () => {
  return cy.task('db:reset');
});

Cypress.Commands.add('seedDatabase', (data) => {
  return cy.task('db:seed', data);
});

// Utility commands
Cypress.Commands.add('waitForApiResponse', (alias, timeout = 10000) => {
  cy.wait(alias, { timeout });
});

Cypress.Commands.add('interceptApiCall', (method, url, response, alias) => {
  cy.intercept(method, `${Cypress.env('apiUrl')}${url}`, response).as(alias);
});

// File upload command
Cypress.Commands.add('uploadFile', (selector, fileName, fileType = 'image/jpeg') => {
  cy.get(selector).selectFile({
    contents: Cypress.Buffer.from('file content'),
    fileName,
    mimeType: fileType
  });
});

// Custom assertions
Cypress.Commands.add('shouldHaveNotification', (message, type = 'success') => {
  cy.get(`[data-testid="notification-${type}"]`)
    .should('be.visible')
    .and('contain.text', message);
});

Cypress.Commands.add('shouldBeOnPage', (page) => {
  cy.url().should('include', page);
  cy.get(`[data-testid="page-${page}"]`).should('be.visible');
});
