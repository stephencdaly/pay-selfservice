'use strict'

const utils = require('../../utils/request_to_go_live_utils')
const { userExternalId, gatewayAccountId, serviceExternalId } = utils.variables

const pageUrl = `/service/${serviceExternalId}/request-to-go-live/organisation-address`

describe('The organisation address page', () => {
  const longText = 'This text is 256 ...............................................................................' +
    '...............................................................................................................' +
    '..................................characters long'

  beforeEach(() => {
    cy.setEncryptedCookies(userExternalId, gatewayAccountId)
  })

  describe('The go-live stage is ENTERED_ORGANISATION_NAME and there are no existing merchant details', () => {
    const serviceRole = utils.buildServiceRoleForGoLiveStage('ENTERED_ORGANISATION_NAME')
    beforeEach(() => {
      utils.setupGetUserAndGatewayAccountStubs(serviceRole)

      cy.visit(pageUrl)
    })

    it('should display form', () => {
      cy.get('h1').should('contain', `What is your organisation's address?`)

      cy.get(`form[method=post][action="/service/${serviceExternalId}/request-to-go-live/organisation-address"]`)
        .should('exist')
        .within(() => {
          cy.get('label[for="address-line1"]').should('exist')
          cy.get('input#address-line1[name="address-line1"]').should('exist')
          cy.get('input#address-line2[name="address-line2"]').should('exist')

          cy.get('label[for="address-city"]').should('exist')
          cy.get('input#address-city[name="address-city"]').should('exist')

          cy.get('label[for="address-country"]').should('exist')
          cy.get('select#address-country[name="address-country"]').should('exist')

          cy.get('label[for="address-postcode"]').should('exist')
          cy.get('input#address-postcode[name="address-postcode"]').should('exist')

          cy.get('label[for="telephone-number"]').should('exist')
          cy.get('span#telephone-number-hint').should('exist')
          cy.get('input#telephone-number[name="telephone-number"]').should('exist')
        })
    })

    it('should display errors when validation fails', () => {
      cy.get(`form[method=post][action="/service/${serviceExternalId}/request-to-go-live/organisation-address"]`)
        .within(() => {
          // create errors for all fields except country by leaving them blank or inputting invalid values
          cy.get('#address-line2').type(longText, { delay: 0 })
          cy.get('button[type=submit]').click()
        })

      cy.get('.govuk-error-summary').find('a').should('have.length', 4)
      cy.get('.govuk-error-summary').should('exist').within(() => {
        cy.get('a[href="#address-line1"]').should('contain', 'Building and street')
        cy.get('a[href="#address-city"]').should('contain', 'Town or city')
        cy.get('a[href="#address-postcode"]').should('contain', 'Postcode')
        cy.get('a[href="#telephone-number"]').should('contain', 'Telephone number')
      })

      cy.get(`form[method=post][action="/service/${serviceExternalId}/request-to-go-live/organisation-address"]`)
        .within(() => {
          cy.get('.govuk-form-group--error > input#address-line1').parent().should('exist').within(() => {
            cy.get('.govuk-error-message').should('contain', 'This field cannot be blank')
          })
          cy.get('.govuk-form-group--error > input#address-line2').parent().should('exist').within(() => {
            cy.get('.govuk-error-message').should('contain', 'The text is too long')
            cy.get('input#address-line2').should('have.value', longText)
          })
          cy.get('.govuk-form-group--error > input#address-city').parent().should('exist').within(() => {
            cy.get('.govuk-error-message').should('contain', 'This field cannot be blank')
          })
          cy.get('.govuk-form-group--error > input#address-postcode').parent().should('exist').within(() => {
            cy.get('.govuk-error-message').should('contain', 'This field cannot be blank')
          })
          cy.get('.govuk-form-group--error > input#telephone-number').parent().should('exist').within(() => {
            cy.get('.govuk-error-message').should('contain', 'This field cannot be blank')
          })
        })
    })

    it('should keep entered responses when validation fails', () => {
      const validLine1 = 'A building'
      const validLine2 = 'A street'
      const validCity = 'A city'
      const country = 'IE'
      const validPostcode = 'D01 F5P2'
      const invalidTelephoneNumber = 'abd'

      cy.get(`form[method=post][action="/service/${serviceExternalId}/request-to-go-live/organisation-address"]`)
        .within(() => {
          cy.get('#address-line1').type(validLine1)
          cy.get('#address-line2').type(validLine2)
          cy.get('#address-city').type(validCity)
          cy.get('#address-country').select(country)
          cy.get('#address-postcode').type(validPostcode)
          cy.get('#telephone-number').type(invalidTelephoneNumber)
          cy.get('button[type=submit]').click()
        })

      cy.get('.govuk-error-summary').find('a').should('have.length', 1)
      cy.get('.govuk-error-summary').should('exist').within(() => {
        cy.get('a[href="#telephone-number"]').should('contain', 'Telephone number')
      })

      cy.get(`form[method=post][action="/service/${serviceExternalId}/request-to-go-live/organisation-address"]`)
        .within(() => {
          cy.get('.govuk-form-group--error > input#telephone-number').parent().should('exist').within(() => {
            cy.get('.govuk-error-message').should('contain', 'Invalid telephone number')
          })

          cy.get('#address-line1').should('have.value', validLine1)
          cy.get('#address-line2').should('have.value', validLine2)
          cy.get('#address-city').should('have.value', validCity)
          cy.get('#address-country').should('have.value', country)
          cy.get('#address-postcode').should('have.value', validPostcode)
          cy.get('#telephone-number').should('have.value', invalidTelephoneNumber)
        })
    })

    it('should show errors for invalid postcode', () => {
      const invalidPostcode = '123'

      cy.get(`form[method=post][action="/service/${serviceExternalId}/request-to-go-live/organisation-address"]`)
        .within(() => {
          cy.get('#address-line1').type('A building')
          cy.get('#address-line2').type('A street')
          cy.get('#address-city').type('A city')
          cy.get('#address-country').select('GB')
          cy.get('#address-postcode').type(invalidPostcode)
          cy.get('#telephone-number').type('01134960000')
          cy.get('button[type=submit]').click()
        })

      cy.get('.govuk-error-summary').find('a').should('have.length', 1)
      cy.get('.govuk-error-summary').should('exist').within(() => {
        cy.get('a[href="#address-postcode"]').should('contain', 'Postcode')
      })

      cy.get(`form[method=post][action="/service/${serviceExternalId}/request-to-go-live/organisation-address"]`)
        .within(() => {
          cy.get('.govuk-form-group--error > input#address-postcode').parent().should('exist').within(() => {
            cy.get('.govuk-error-message').should('contain', 'Please enter a real postcode')
          })
        })
    })
  })

  describe('There are existing organisation details', () => {
    const serviceRole = utils.buildServiceRoleForGoLiveStage('ENTERED_ORGANISATION_NAME')
    const merchantDetails = {
      address_line1: 'A building',
      address_line2: 'A street',
      address_city: 'A city',
      address_country: 'IE',
      address_postcode: 'E8 4ER',
      telephone_number: '01134960000'
    }
    serviceRole.service.merchant_details = merchantDetails

    it('should display form with existing details pre-filled', () => {
      utils.setupGetUserAndGatewayAccountStubs(serviceRole)
      cy.visit(`/service/${serviceExternalId}/request-to-go-live/organisation-address`)

      cy.get(`form[method=post][action="/service/${serviceExternalId}/request-to-go-live/organisation-address"]`)
        .within(() => {
          cy.get('#address-line1').should('have.value', merchantDetails.address_line1)
          cy.get('#address-line2').should('have.value', merchantDetails.address_line2)
          cy.get('#address-city').should('have.value', merchantDetails.address_city)
          cy.get('#address-country').should('have.value', merchantDetails.address_country)
          cy.get('#address-postcode').should('have.value', merchantDetails.address_postcode)
          cy.get('#telephone-number').should('have.value', merchantDetails.telephone_number)
        })
    })
  })

  describe('User does not have the correct permissions', () => {
    const serviceRole = utils.buildServiceRoleForGoLiveStage('ENTERED_ORGANISATION_NAME')
    serviceRole.role = { permissions: [] }
    beforeEach(() => {
      utils.setupGetUserAndGatewayAccountStubs(serviceRole)
    })

    it('should show an error when the user does not have enough permissions', () => {
      cy.visit(pageUrl)
      cy.get('h1').should('contain', 'An error occurred:')
      cy.get('#errorMsg').should('contain', 'You do not have the administrator rights to perform this operation.')
    })
  })

  describe('Service has invalid go live stage', () => {
    const serviceRole = utils.buildServiceRoleForGoLiveStage('NOT_STARTED')
    beforeEach(() => {
      utils.setupGetUserAndGatewayAccountStubs(serviceRole)
    })

    it('should redirect to "Request to go live: index" page when in wrong stage', () => {
      cy.visit(pageUrl)

      cy.get('h1').should('contain', 'Request a live account')

      cy.location().should((location) => {
        expect(location.pathname).to.eq(`/service/${serviceExternalId}/request-to-go-live`)
      })
    })
  })
})