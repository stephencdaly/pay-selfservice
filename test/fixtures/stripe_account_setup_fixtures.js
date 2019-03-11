'use strict'

// NPM dependencies
const path = require('path')
const _ = require('lodash')

// Global setup
const pactBase = require(path.join(__dirname, '/pact_base'))
const pactRegister = pactBase()

function buildUpdateStripeAccountSetupFlagRequest (path, completed) {
  const data = [
    {
      op: 'replace',
      path,
      value: completed
    }
  ]

  return {
    getPactified: () => {
      return pactRegister.pactify(data)
    },
    getPlain: () => {
      return _.clone(data)
    }
  }
}

module.exports = {
  buildUpdateBankAccountDetailsFlagRequest (completed) {
    return buildUpdateStripeAccountSetupFlagRequest('bank_account', completed)
  },

  buildUpdateOrganisationDetailsFlagRequest (completed) {
    return buildUpdateStripeAccountSetupFlagRequest('organisation_details', completed)
  },

  buildUpdateResponsiblePersonFlagRequest (completed) {
    return buildUpdateStripeAccountSetupFlagRequest('responsible_person', completed)
  },

  buildGetStripeAccountSetupResponse (opts = {}) {
    const data = {
      'bank_account': opts.bank_account || false,
      'organisation_details': opts.organisation_details || false,
      'responsible_person': opts.responsible_person || false
    }

    return {
      getPactified: () => {
        return pactRegister.pactify(data)
      },
      getPlain: () => {
        return _.clone(data)
      }
    }
  },

  buildGetStripeAccountResponse (opts = {}) {
    const data = {
      'stripe_account_id': opts.stripe_account_id || 'acct_123example123'
    }

    return {
      getPactified: () => {
        return pactRegister.pactify(data)
      },
      getPlain: () => {
        return _.clone(data)
      }
    }
  }
}