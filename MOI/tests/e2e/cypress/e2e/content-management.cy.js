describe('Content Management E2E Tests', () => {
  beforeEach(() => {
    cy.resetDatabase()
    cy.createUser({
      username: 'contentuser',
      email: 'content@example.com',
      password: 'Password123!'
    })
    cy.loginUser('content@example.com', 'Password123!')
  })

  describe('Content Creation', () => {
    it('should allow manual content creation', () => {
      cy.navigateToContent()
      cy.get('[data-cy=create-content-button]').click()
      
      cy.get('[data-cy=content-type-select]').select('post')
      cy.get('[data-cy=content-text]').type('This is a test post for social media content')
      cy.get('[data-cy=platforms]').within(() => {
        cy.get('[data-cy=platform-twitter]').check()
        cy.get('[data-cy=platform-facebook]').check()
      })
      
      cy.get('[data-cy=schedule-date]').type('2025-12-31')
      cy.get('[data-cy=schedule-time]').type('10:00')
      
      cy.get('[data-cy=save-content]').click()
      
      cy.get('[data-cy=success-message]').should('contain', 'Content created successfully')
      cy.get('[data-cy=content-list]').should('contain', 'This is a test post')
    })

    it('should allow AI-generated content creation', () => {
      cy.intercept('POST', '/api/ai/generate-content', {
        statusCode: 200,
        body: {
          content: 'AI generated content about technology trends',
          hashtags: ['#tech', '#AI', '#innovation'],
          platforms: ['twitter', 'linkedin']
        }
      }).as('generateContent')

      cy.navigateToContent()
      cy.get('[data-cy=create-content-button]').click()
      
      cy.get('[data-cy=ai-generate-tab]').click()
      cy.get('[data-cy=content-topic]').type('technology trends')
      cy.get('[data-cy=content-tone]').select('professional')
      cy.get('[data-cy=target-platforms]').within(() => {
        cy.get('[data-cy=platform-twitter]').check()
        cy.get('[data-cy=platform-linkedin]').check()
      })
      
      cy.get('[data-cy=generate-content]').click()
      
      cy.wait('@generateContent')
      
      cy.get('[data-cy=generated-content]').should('contain', 'AI generated content about technology trends')
      cy.get('[data-cy=generated-hashtags]').should('contain', '#tech')
      
      cy.get('[data-cy=accept-generated]').click()
      cy.get('[data-cy=save-content]').click()
      
      cy.get('[data-cy=success-message]').should('contain', 'Content created successfully')
    })

    it('should validate required fields', () => {
      cy.navigateToContent()
      cy.get('[data-cy=create-content-button]').click()
      
      cy.get('[data-cy=save-content]').click()
      
      cy.get('[data-cy=content-text-error]').should('contain', 'Content text is required')
      cy.get('[data-cy=platforms-error]').should('contain', 'At least one platform must be selected')
    })

    it('should allow content with media upload', () => {
      cy.navigateToContent()
      cy.get('[data-cy=create-content-button]').click()
      
      cy.get('[data-cy=content-text]').type('Post with image attachment')
      cy.get('[data-cy=platforms]').within(() => {
        cy.get('[data-cy=platform-instagram]').check()
      })
      
      // Mock file upload
      cy.fixture('test-image.jpg').then(fileContent => {
        cy.get('[data-cy=media-upload]').attachFile({
          fileContent: fileContent.toString(),
          fileName: 'test-image.jpg',
          mimeType: 'image/jpeg'
        })
      })
      
      cy.get('[data-cy=media-preview]').should('be.visible')
      cy.get('[data-cy=save-content]').click()
      
      cy.get('[data-cy=success-message]').should('contain', 'Content created successfully')
    })
  })

  describe('Content Management', () => {
    beforeEach(() => {
      cy.createContent({
        text: 'Test content for management',
        platforms: ['twitter', 'facebook'],
        status: 'draft'
      }).as('testContent')
    })

    it('should display content list with filters', () => {
      cy.navigateToContent()
      
      cy.get('[data-cy=content-list]').should('contain', 'Test content for management')
      
      cy.get('[data-cy=filter-status]').select('draft')
      cy.get('[data-cy=content-list]').should('contain', 'Test content for management')
      
      cy.get('[data-cy=filter-status]').select('published')
      cy.get('[data-cy=content-list]').should('not.contain', 'Test content for management')
    })

    it('should allow content editing', () => {
      cy.navigateToContent()
      
      cy.get('[data-cy=content-item]').first().within(() => {
        cy.get('[data-cy=edit-content]').click()
      })
      
      cy.get('[data-cy=content-text]').clear().type('Updated test content')
      cy.get('[data-cy=platforms]').within(() => {
        cy.get('[data-cy=platform-linkedin]').check()
      })
      
      cy.get('[data-cy=save-content]').click()
      
      cy.get('[data-cy=success-message]').should('contain', 'Content updated successfully')
      cy.get('[data-cy=content-list]').should('contain', 'Updated test content')
    })

    it('should allow content deletion', () => {
      cy.navigateToContent()
      
      cy.get('[data-cy=content-item]').first().within(() => {
        cy.get('[data-cy=delete-content]').click()
      })
      
      cy.get('[data-cy=confirm-delete]').click()
      
      cy.get('[data-cy=success-message]').should('contain', 'Content deleted successfully')
      cy.get('[data-cy=content-list]').should('not.contain', 'Test content for management')
    })

    it('should allow bulk content operations', () => {
      // Create multiple content items
      cy.createContent({
        text: 'Bulk content 1',
        platforms: ['twitter'],
        status: 'draft'
      })
      cy.createContent({
        text: 'Bulk content 2',
        platforms: ['facebook'],
        status: 'draft'
      })

      cy.navigateToContent()
      
      cy.get('[data-cy=select-all]').check()
      cy.get('[data-cy=bulk-actions]').select('approve')
      cy.get('[data-cy=apply-bulk-action]').click()
      
      cy.get('[data-cy=success-message]').should('contain', 'Bulk action completed')
      
      cy.get('[data-cy=filter-status]').select('approved')
      cy.get('[data-cy=content-list]').should('contain', 'Bulk content 1')
      cy.get('[data-cy=content-list]').should('contain', 'Bulk content 2')
    })
  })

  describe('Content Scheduling', () => {
    it('should allow immediate publishing', () => {
      cy.intercept('POST', '/api/social/publish', {
        statusCode: 200,
        body: { success: true, postId: 'twitter_123' }
      }).as('publishContent')

      cy.createContent({
        text: 'Content for immediate publishing',
        platforms: ['twitter'],
        status: 'approved'
      })

      cy.navigateToContent()
      
      cy.get('[data-cy=content-item]').first().within(() => {
        cy.get('[data-cy=publish-now]').click()
      })
      
      cy.get('[data-cy=confirm-publish]').click()
      
      cy.wait('@publishContent')
      
      cy.get('[data-cy=success-message]').should('contain', 'Content published successfully')
      
      cy.get('[data-cy=filter-status]').select('published')
      cy.get('[data-cy=content-list]').should('contain', 'Content for immediate publishing')
    })

    it('should allow scheduled publishing', () => {
      cy.createContent({
        text: 'Content for scheduled publishing',
        platforms: ['twitter'],
        status: 'approved',
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      })

      cy.navigateToContent()
      
      cy.get('[data-cy=filter-status]').select('scheduled')
      cy.get('[data-cy=content-list]').should('contain', 'Content for scheduled publishing')
      
      cy.get('[data-cy=content-item]').first().within(() => {
        cy.get('[data-cy=scheduled-time]').should('be.visible')
        cy.get('[data-cy=cancel-schedule]').should('be.visible')
      })
    })

    it('should allow schedule modification', () => {
      cy.createContent({
        text: 'Content with modifiable schedule',
        platforms: ['twitter'],
        status: 'scheduled',
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })

      cy.navigateToContent()
      
      cy.get('[data-cy=content-item]').first().within(() => {
        cy.get('[data-cy=edit-schedule]').click()
      })
      
      const newDate = new Date()
      newDate.setDate(newDate.getDate() + 2)
      
      cy.get('[data-cy=schedule-date]').clear().type(newDate.toISOString().split('T')[0])
      cy.get('[data-cy=schedule-time]').clear().type('14:30')
      
      cy.get('[data-cy=update-schedule]').click()
      
      cy.get('[data-cy=success-message]').should('contain', 'Schedule updated successfully')
    })
  })

  describe('Content Analytics', () => {
    beforeEach(() => {
      cy.createContent({
        text: 'Published content with analytics',
        platforms: ['twitter', 'facebook'],
        status: 'published'
      })
    })

    it('should display content analytics', () => {
      cy.intercept('GET', '/api/analytics/content/*', {
        statusCode: 200,
        body: {
          engagement: {
            likes: 45,
            shares: 12,
            comments: 8,
            clicks: 123
          },
          reach: 1500,
          impressions: 2800
        }
      }).as('getAnalytics')

      cy.navigateToContent()
      
      cy.get('[data-cy=content-item]').first().within(() => {
        cy.get('[data-cy=view-analytics]').click()
      })
      
      cy.wait('@getAnalytics')
      
      cy.get('[data-cy=analytics-modal]').should('be.visible')
      cy.get('[data-cy=likes-count]').should('contain', '45')
      cy.get('[data-cy=shares-count]').should('contain', '12')
      cy.get('[data-cy=comments-count]').should('contain', '8')
      cy.get('[data-cy=reach-count]').should('contain', '1,500')
    })

    it('should show performance comparison', () => {
      cy.intercept('GET', '/api/analytics/performance-comparison', {
        statusCode: 200,
        body: {
          current: { engagement: 65, reach: 1500 },
          previous: { engagement: 45, reach: 1200 },
          improvement: { engagement: 44.4, reach: 25 }
        }
      }).as('getComparison')

      cy.navigateToContent()
      cy.get('[data-cy=performance-tab]').click()
      
      cy.wait('@getComparison')
      
      cy.get('[data-cy=engagement-improvement]').should('contain', '+44.4%')
      cy.get('[data-cy=reach-improvement]').should('contain', '+25%')
    })
  })
})
