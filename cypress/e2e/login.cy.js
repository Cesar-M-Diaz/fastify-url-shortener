describe('it tests the login workflow', () => {
  it('it should redirect user to welcome page', () => {
    cy.visit('/')
    cy.get('#google').should('be.visible')
    cy.get('#github').should('be.visible')
    cy.get('#login').should('be.visible')
    cy.get('#register').should('be.visible')
  })

  it('it should redirect user to register', () => {
    cy.get('#register').should('be.visible').click({ force: true })
    cy.get('[type="submit"]').should('be.visible')
    cy.get('#home').should('be.visible').click({ force: true })
  })

  it('it should redirect user to login', () => {
    cy.get('#login').should('be.visible').click({ force: true })
    cy.get('[type="submit"]').should('be.visible')
    cy.get('#home').should('be.visible').click({ force: true })
  })
})
