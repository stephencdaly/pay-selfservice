'use strict'

const util = require('util')
const EventEmitter = require('events').EventEmitter

const logger = require('../../utils/logger')(__filename)
const oldBaseClient = require('./old-base.client')
const baseClient = require('./base-client/base.client')
const requestLogger = require('../../utils/request-logger')
const createCallbackToPromiseConverter = require('../../utils/response-converter').createCallbackToPromiseConverter
const StripeAccountSetup = require('../../models/StripeAccountSetup.class')
const StripeAccount = require('../../models/StripeAccount.class')

// Constants
const SERVICE_NAME = 'connector'
const ACCOUNTS_API_PATH = '/v1/api/accounts'
const ACCOUNT_API_PATH = ACCOUNTS_API_PATH + '/{accountId}'
const ACCOUNT_API_BY_EXTERNAL_ID_PATH = ACCOUNTS_API_PATH + '/external-id/{externalId}'
const CHARGES_API_PATH = ACCOUNT_API_PATH + '/charges'
const CHARGE_API_PATH = CHARGES_API_PATH + '/{chargeId}'
const CHARGE_REFUNDS_API_PATH = CHARGE_API_PATH + '/refunds'
const CARD_TYPES_API_PATH = '/v1/api/card-types'
const STRIPE_ACCOUNT_SETUP_PATH = ACCOUNT_API_PATH + '/stripe-setup'
const STRIPE_ACCOUNT_PATH = ACCOUNT_API_PATH + '/stripe-account'

const ACCOUNTS_FRONTEND_PATH = '/v1/frontend/accounts'
const ACCOUNT_FRONTEND_PATH = ACCOUNTS_FRONTEND_PATH + '/{accountId}'
const SERVICE_NAME_FRONTEND_PATH = ACCOUNT_FRONTEND_PATH + '/servicename'
const ACCEPTED_CARD_TYPES_FRONTEND_PATH = ACCOUNT_FRONTEND_PATH + '/card-types'
const ACCOUNT_NOTIFICATION_CREDENTIALS_PATH = '/v1/api/accounts' + '/{accountId}' + '/notification-credentials'
const ACCOUNT_CREDENTIALS_PATH = ACCOUNT_FRONTEND_PATH + '/credentials'
const EMAIL_NOTIFICATION__PATH = '/v1/api/accounts/{accountId}/email-notification'
const CHECK_WORLDPAY_3DS_FLEX_CREDENTIALS_PATH = '/v1/api/accounts/{accountId}/worldpay/check-3ds-flex-config'
const FLEX_CREDENTIALS_PATH = '/v1/api/accounts/{accountId}/3ds-flex-credentials'
const TOGGLE_3DS_PATH = ACCOUNTS_FRONTEND_PATH + '/{accountId}/3ds-toggle'

const responseBodyToStripeAccountSetupTransformer = body => new StripeAccountSetup(body)
const responseBodyToStripeAccountTransformer = body => new StripeAccount(body)

/**
 * @private
 * @param  {object} self
 */
function _createResponseHandler (self) {
  return function (callback) {
    return function (error, response, body) {
      if (error || !isInArray(response.statusCode, [200, 202])) {
        if (error) {
          logger.error('Calling connector error', {
            service: 'connector',
            error: JSON.stringify(error)
          })
        } else {
          logger.info('Calling connector response failed', {
            service: 'connector',
            status: response.statusCode
          })
        }
        self.emit('connectorError', error, response, body)
        return
      }

      callback(body, response)
    }
  }
}

/**
 * @private
 * @param  {Object} value - value to find into the array
 * @param {Object[]} array - array source for finding the given value
 */
function isInArray (value, array) {
  return array.indexOf(value) > -1
}

/** @private */
function _accountApiUrlFor (gatewayAccountId, url) {
  return url + ACCOUNT_API_PATH.replace('{accountId}', gatewayAccountId)
}

/** @private */
function _accountUrlFor (gatewayAccountId, url) {
  return url + ACCOUNT_FRONTEND_PATH.replace('{accountId}', gatewayAccountId)
}

/** @private */
function _accountByExternalIdUrlFor (gatewayAccountExternalId, url) {
  return url + ACCOUNT_API_BY_EXTERNAL_ID_PATH.replace('{externalId}', gatewayAccountExternalId)
}

/** @private */
function _accountsUrlFor (gatewayAccountIds, url) {
  return url + ACCOUNTS_FRONTEND_PATH + '?accountIds=' + gatewayAccountIds.join(',')
}

/** @private */
function _accountNotificationCredentialsUrlFor (gatewayAccountId, url) {
  return url + ACCOUNT_NOTIFICATION_CREDENTIALS_PATH.replace('{accountId}', gatewayAccountId)
}

/** @private */
function _accountCredentialsUrlFor (gatewayAccountId, url) {
  return url + ACCOUNT_CREDENTIALS_PATH.replace('{accountId}', gatewayAccountId)
}

/** @private */
function _accountAcceptedCardTypesUrlFor (gatewayAccountId, url) {
  return url + ACCEPTED_CARD_TYPES_FRONTEND_PATH.replace('{accountId}', gatewayAccountId)
}

/** @private */
function _cardTypesUrlFor (url) {
  return url + CARD_TYPES_API_PATH
}

/** @private */
function _serviceNameUrlFor (gatewayAccountId, url) {
  return url + SERVICE_NAME_FRONTEND_PATH.replace('{accountId}', gatewayAccountId)
}

/** @private */
var _getNotificationEmailUrlFor = function (accountID, url) {
  return url + EMAIL_NOTIFICATION__PATH.replace('{accountId}', accountID)
}

/** @private */
var _get3dsFlexCredentialsUrlFor = function (accountID, url) {
  return url + FLEX_CREDENTIALS_PATH.replace('{accountId}', accountID)
}

/** @private */
var _getToggle3dsUrlFor = function (accountID, url) {
  return url + TOGGLE_3DS_PATH.replace('{accountId}', accountID)
}

/**
 * Connects to connector
 * @param {string} connectorUrl connector url
 */
function ConnectorClient (connectorUrl) {
  this.connectorUrl = connectorUrl
  this.responseHandler = _createResponseHandler(this)

  EventEmitter.call(this)
}

ConnectorClient.prototype = {
  /**
   * Retrieves the given gateway account
   * @param params
   *          An object with the following elements;
   *            gatewayAccountId (required)
   *            correlationId (optional)
   *@return {Promise}
   */
  getAccount: function (params) {
    let url = _accountUrlFor(params.gatewayAccountId, this.connectorUrl)
    return baseClient.get(url, {
      correlationId: params.correlationId,
      description: 'get an account',
      service: SERVICE_NAME
    })
  },
  /**
   * Retrieves gateway account by external ID
   * @param params
   *          An object with the following elements;
   *            gatewayAccountExternalId (required)
   *            correlationId (optional)
   *@return {Promise}
   */
  getAccountByExternalId: function (params) {
    let url = _accountByExternalIdUrlFor(params.gatewayAccountExternalId, this.connectorUrl)
    let context = {
      url: url,
      correlationId: params.correlationId,
      description: 'get an account',
      service: SERVICE_NAME
    }

    return baseClient.get(url, context)
  },

  /**
   * Retrieves multiple gateway accounts for a given array of ids
   * @param params
   *          An object with the following elements;
   *            gatewayAccountIds (required)
   *            correlationId (optional)
   *@return {Promise}
   */
  getAccounts: function (params) {
    let url = _accountsUrlFor(params.gatewayAccountIds, this.connectorUrl)
    let context = {
      url: url,
      correlationId: params.correlationId,
      description: 'get an account',
      service: SERVICE_NAME
    }

    return baseClient.get(
      url, context
    )
  },

  /**
   * Creates a new gateway account
   *
   * @param paymentProvider
   * @param type
   * @param serviceName
   * @param analyticsId
   * @param correlationId
   *
   * @returns {*|Constructor|promise}
   */
  createGatewayAccount: function (paymentProvider, type, serviceName, analyticsId, correlationId) {
    const url = this.connectorUrl + ACCOUNTS_API_PATH

    let payload = {
      payment_provider: paymentProvider
    }
    if (type) {
      payload.type = type
    }
    if (serviceName) {
      payload.service_name = serviceName
    }
    if (analyticsId) {
      payload.analytics_id = analyticsId
    }

    return baseClient.post(url, {
      body: payload,
      correlationId: correlationId,
      description: 'create a gateway account',
      service: SERVICE_NAME,
      baseClientErrorHandler: 'old'
    })
  },

  /**
   *
   * @param {Object} params
   * @returns {ConnectorClient}
   */
  patchAccountCredentials: function (params) {
    const url = _accountCredentialsUrlFor(params.gatewayAccountId, this.connectorUrl)

    logger.debug('Calling connector to patch account credentials', {
      service: 'connector',
      method: 'PATCH',
      url: url
    })

    return baseClient.patch(url, {
      body: params.payload,
      correlationId: params.correlationId,
      description: 'patch gateway account credentials',
      service: SERVICE_NAME
    })
  },

  /**
   *
   * @param {Object} params
   * @returns {ConnectorClient}
   */
  postAccountNotificationCredentials: function (params) {
    const url = _accountNotificationCredentialsUrlFor(params.gatewayAccountId, this.connectorUrl)

    logger.debug('Calling connector to update notification credentials', {
      service: 'connector',
      method: 'POST',
      url: url
    })

    return baseClient.post(url, {
      body: params.payload,
      correlationId: params.correlationId,
      description: 'patch gateway account credentials',
      service: SERVICE_NAME
    })
  },

  /**
   * Checks Worldpay 3DS Flex credentials
   *
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  postCheckWorldpay3dsFlexCredentials: function (params) {
    return baseClient.post(
      {
        baseUrl: this.connectorUrl,
        url: CHECK_WORLDPAY_3DS_FLEX_CREDENTIALS_PATH.replace('{accountId}', params.gatewayAccountId),
        json: true,
        body: params.payload,
        correlationId: params.correlationId,
        description: 'Check Worldpay 3DS Flex credentials',
        service: SERVICE_NAME
      }
    )
  },

  /**
   *
   * @param {Object} params
   * @returns {Promise}
   */
  post3dsFlexAccountCredentials: function (params) {
    const url = _get3dsFlexCredentialsUrlFor(params.gatewayAccountId, this.connectorUrl)

    return baseClient.post(url, {
      body: params.payload,
      correlationId: params.correlationId,
      description: 'Update 3DS Flex credentials',
      service: SERVICE_NAME
    })
  },

  /**
   * Retrieves the accepted card Types for the given account
   * @param gatewayAccountId (required)
   * @param correlationId (optional)
   * @returns {Promise<Object>}
   */
  getAcceptedCardsForAccountPromise: function (gatewayAccountId, correlationId) {
    const url = _accountAcceptedCardTypesUrlFor(gatewayAccountId, this.connectorUrl)

    return baseClient.get(url, {
      correlationId: correlationId,
      description: 'get accepted card types for account',
      service: SERVICE_NAME
    })
  },

  /**
   * Updates the accepted card Types for to the given gateway account
   * @param gatewayAccountId (required)
   * @param payload (required)
   * @param correlationId (optional)
   * @returns {Promise<Object>}
   */
  postAcceptedCardsForAccount: function (gatewayAccountId, payload, correlationId) {
    const url = _accountAcceptedCardTypesUrlFor(gatewayAccountId, this.connectorUrl)
    const params = { gatewayAccountId, payload, correlationId }

    return baseClient.post(url, {
      body: params,
      correlationId: correlationId,
      description: 'post accepted card types for account',
      service: SERVICE_NAME
    })
  },

  /**
   * Retrieves all card types
   * @param params (optional)
   *          And object with the following elements;
   *            correlationId
   * @param successCallback
   *          Callback function upon successful card type retrieval
   */
  getAllCardTypes: function (params, successCallback) {
    if (typeof params === 'function') {
      successCallback = params
    }

    let url = _cardTypesUrlFor(this.connectorUrl)
    logger.debug('Calling connector to get all card types', {
      service: 'connector',
      method: 'GET',
      url: url
    })
    oldBaseClient.get(url, params, this.responseHandler(successCallback))
    return this
  },

  /**
   * This will replace the callback version soon
   * Retrieves all card types
   * @param correlationId
   * @returns {Promise<Object>}
   */
  getAllCardTypesPromise: function (correlationId) {
    return new Promise((resolve, reject) => {
      const url = _cardTypesUrlFor(this.connectorUrl)
      const params = { correlationId }
      const startTime = new Date()
      const context = {
        description: 'get all card types',
        method: 'GET',
        service: 'connector',
        url: url,
        defer: { resolve: resolve, reject: reject },
        startTime: startTime,
        correlationId
      }
      requestLogger.logRequestStart(context)

      const callbackToPromiseConverter = createCallbackToPromiseConverter(context)

      oldBaseClient.get(url, params, callbackToPromiseConverter)
        .on('error', callbackToPromiseConverter)
    })
  },

  /**
   * @param gatewayAccountId
   * @param serviceName
   * @param correlationId
   * @returns {Promise<Object>}
   */
  patchServiceName: function (gatewayAccountId, serviceName, correlationId) {
    return new Promise((resolve, reject) => {
      const params = {
        gatewayAccountId: gatewayAccountId,
        payload: {
          service_name: serviceName
        },
        correlationId: correlationId
      }

      const url = _serviceNameUrlFor(gatewayAccountId, this.connectorUrl)
      const startTime = new Date()
      const context = {
        url: url,
        defer: { resolve: resolve, reject: reject },
        startTime: startTime,
        correlationId: correlationId,
        method: 'PATCH',
        description: 'update service name',
        service: SERVICE_NAME
      }

      const callbackToPromiseConverter = createCallbackToPromiseConverter(context)

      requestLogger.logRequestStart(context)

      oldBaseClient.patch(url, params, callbackToPromiseConverter)
        .on('error', callbackToPromiseConverter)
    })
  },

  /**
   * @param gatewayAccountId
   * @param allowApplePay (boolean)
   * @param correlationId
   * @returns {Promise<Object>}
   */
  toggleApplePay: function (gatewayAccountId, allowApplePay, correlationId) {
    return baseClient.patch(
      {
        baseUrl: this.connectorUrl,
        url: ACCOUNT_API_PATH.replace('{accountId}', gatewayAccountId),
        json: true,
        body: {
          op: 'replace',
          path: 'allow_apple_pay',
          value: allowApplePay
        },
        correlationId,
        description: 'toggle allow apple pay',
        service: SERVICE_NAME
      }
    )
  },

  /**
   * @param gatewayAccountId
   * @param allowGooglePay (boolean)
   * @param correlationId
   * @returns {Promise<Object>}
   */
  toggleGooglePay: function (gatewayAccountId, allowGooglePay, correlationId) {
    return baseClient.patch(
      {
        baseUrl: this.connectorUrl,
        url: ACCOUNT_API_PATH.replace('{accountId}', gatewayAccountId),
        json: true,
        body: {
          op: 'replace',
          path: 'allow_google_pay',
          value: allowGooglePay
        },
        correlationId,
        description: 'toggle allow google pay',
        service: SERVICE_NAME
      }
    )
  },

  /**
   * @param gatewayAccountId
   * @param isMaskCardNumber (boolean)
   * @param correlationId
   * @returns {Promise<Object>}
   */
  toggleMotoMaskCardNumberInput: function (gatewayAccountId, isMaskCardNumber, correlationId) {
    return baseClient.patch(
      {
        baseUrl: this.connectorUrl,
        url: ACCOUNT_API_PATH.replace('{accountId}', gatewayAccountId),
        json: true,
        body: {
          op: 'replace',
          path: 'moto_mask_card_number_input',
          value: isMaskCardNumber
        },
        correlationId,
        description: 'Toggle gateway account card number masking setting',
        service: SERVICE_NAME
      }
    )
  },

  /**
   * @param gatewayAccountId
   * @param isMaskSecurityCode (boolean)
   * @param correlationId
   * @returns {Promise<Object>}
   */
  toggleMotoMaskSecurityCodeInput: function (gatewayAccountId, isMaskSecurityCode, correlationId) {
    return baseClient.patch(
      {
        baseUrl: this.connectorUrl,
        url: ACCOUNT_API_PATH.replace('{accountId}', gatewayAccountId),
        json: true,
        body: {
          op: 'replace',
          path: 'moto_mask_card_security_code_input',
          value: isMaskSecurityCode
        },
        correlationId,
        description: 'Toggle gateway account card security code masking setting',
        service: SERVICE_NAME
      }
    )
  },

  /**
   * @param gatewayAccountId
   * @param gatewayMerchantId (string)
   * @param correlationId
   * @returns {Promise<Object>}
   */
  setGatewayMerchantId: function (gatewayAccountId, gatewayMerchantId, correlationId) {
    return baseClient.patch(
      {
        baseUrl: this.connectorUrl,
        url: ACCOUNT_API_PATH.replace('{accountId}', gatewayAccountId),
        json: true,
        body: {
          op: 'add',
          path: 'credentials/gateway_merchant_id',
          value: gatewayMerchantId
        },
        correlationId,
        description: 'set gateway merchant id',
        service: SERVICE_NAME
      }
    )
  },

  /**
   * @param gatewayAccountId
   * @param chargeId
   * @param payload
   * @param correlationId
   * @returns {Promise<Object>}
   */
  postChargeRefund: function (gatewayAccountId, chargeId, payload, correlationId) {
    return baseClient.post(
      {
        baseUrl: this.connectorUrl,
        url: CHARGE_REFUNDS_API_PATH.replace('{accountId}', gatewayAccountId).replace('{chargeId}', chargeId),
        json: true,
        body: payload,
        correlationId,
        description: 'submit refund',
        service: SERVICE_NAME
      }
    )
  },
  /**
   *
   * @param {Object} params
   * @param {Function} successCallback
   */
  updateConfirmationEmail: function (params, successCallback) {
    let url = _getNotificationEmailUrlFor(params.gatewayAccountId, this.connectorUrl)
    oldBaseClient.patch(url, params, this.responseHandler(successCallback))

    return this
  },

  /**
   *
   * @param {Object} params
   * @param {Function} successCallback
   */
  updateConfirmationEmailEnabled: function (params, successCallback) {
    let url = _getNotificationEmailUrlFor(params.gatewayAccountId, this.connectorUrl)
    oldBaseClient.patch(url, params, this.responseHandler(successCallback))

    return this
  },

  /**
   *
   * @param {Object} params
   * @param {Function} successCallback
   */
  updateEmailCollectionMode: function (params, successCallback) {
    let url = _accountApiUrlFor(params.gatewayAccountId, this.connectorUrl)
    oldBaseClient.patch(url, params, this.responseHandler(successCallback))

    return this
  },

  /**
   *
   * @param {Object} params
   * @param {Function} successCallback
   */
  updateRefundEmailEnabled: function (params, successCallback) {
    let url = _getNotificationEmailUrlFor(params.gatewayAccountId, this.connectorUrl)
    oldBaseClient.patch(url, params, this.responseHandler(successCallback))

    return this
  },

  /**
   * Update whether 3DS is on/off
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  update3dsEnabled: function (params) {
    return new Promise((resolve, reject) => {
      const url = _getToggle3dsUrlFor(params.gatewayAccountId, this.connectorUrl)
      const startTime = new Date()
      const context = {
        description: 'Update whether 3DS is on or off',
        method: 'PATCH',
        service: 'connector',
        url: url,
        defer: { resolve: resolve, reject: reject },
        startTime: startTime,
        correlationId: params.correlationId
      }
      requestLogger.logRequestStart(context)

      const callbackToPromiseConverter = createCallbackToPromiseConverter(context)
      oldBaseClient.patch(url, params, callbackToPromiseConverter)
        .on('error', callbackToPromiseConverter)
    })
  },

  /**
   * @param gatewayAccountId
   * @param integrationVersion3ds (number)
   * @param correlationId
   * @returns {Promise<Object>}
   */
  updateIntegrationVersion3ds: function (gatewayAccountId, integrationVersion3ds, correlationId) {
    return baseClient.patch(
      {
        baseUrl: this.connectorUrl,
        url: ACCOUNT_API_PATH.replace('{accountId}', gatewayAccountId),
        json: true,
        body: {
          op: 'replace',
          path: 'integration_version_3ds',
          value: integrationVersion3ds
        },
        correlationId,
        description: 'Set the 3DS integration version to use when authorising with the gateway',
        service: SERVICE_NAME
      }
    )
  },

  getStripeAccountSetup: function (gatewayAccountId, correlationId) {
    return baseClient.get(
      {
        baseUrl: this.connectorUrl,
        url: STRIPE_ACCOUNT_SETUP_PATH.replace('{accountId}', gatewayAccountId),
        json: true,
        correlationId,
        description: 'get stripe account setup flags for gateway account',
        service: SERVICE_NAME,
        transform: responseBodyToStripeAccountSetupTransformer,
        baseClientErrorHandler: 'old'
      }
    )
  },

  setStripeAccountSetupFlag: function (gatewayAccountId, stripeAccountSetupFlag, correlationId) {
    return baseClient.patch(
      {
        baseUrl: this.connectorUrl,
        url: STRIPE_ACCOUNT_SETUP_PATH.replace('{accountId}', gatewayAccountId),
        json: true,
        body: [
          {
            op: 'replace',
            path: stripeAccountSetupFlag,
            value: true
          }
        ],
        correlationId,
        description: 'set stripe account setup flag to true for gateway account',
        service: SERVICE_NAME,
        baseClientErrorHandler: 'old'
      }
    )
  },

  getStripeAccount: function (gatewayAccountId, correlationId) {
    return baseClient.get(
      {
        baseUrl: this.connectorUrl,
        url: STRIPE_ACCOUNT_PATH.replace('{accountId}', gatewayAccountId),
        json: true,
        correlationId,
        description: 'get stripe account for gateway account',
        service: SERVICE_NAME,
        transform: responseBodyToStripeAccountTransformer,
        baseClientErrorHandler: 'old'
      }
    )
  }
}

util.inherits(ConnectorClient, EventEmitter)

module.exports.ConnectorClient = ConnectorClient
