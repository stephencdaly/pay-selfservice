'use strict'

// NPM dependencies
const lodash = require('lodash')
const moment = require('moment-timezone')

// Local dependencies
const paths = require('../../../paths')
const response = require('../../../utils/response')
const {
  validateMandatoryField, validateOptionalField, validatePostcode, validateDateOfBirth
} = require('./responsible-person-validations')

const FIRST_NAME_FIELD = 'first-name'
const LAST_NAME_FIELD = 'last-name'
const HOME_ADDRESS_LINE1_FIELD = 'home-address-line-1'
const HOME_ADDRESS_LINE2_FIELD = 'home-address-line-2'
const HOME_ADDRESS_CITY_FIELD = 'home-address-city'
const HOME_ADDRESS_POSTCODE_FIELD = 'home-address-postcode'
const DOB_DAY_FIELD = 'dob-day'
const DOB_MONTH_FIELD = 'dob-month'
const DOB_YEAR_FIELD = 'dob-year'

const validationRules = [
  {
    field: FIRST_NAME_FIELD,
    validator: validateMandatoryField,
    maxLength: 100
  },
  {
    field: LAST_NAME_FIELD,
    validator: validateMandatoryField,
    maxLength: 100
  },
  {
    field: HOME_ADDRESS_LINE1_FIELD,
    validator: validateMandatoryField,
    maxLength: 200
  },
  {
    field: HOME_ADDRESS_LINE2_FIELD,
    validator: validateOptionalField,
    maxLength: 200
  },
  {
    field: HOME_ADDRESS_CITY_FIELD,
    validator: validateMandatoryField,
    maxLength: 100
  },
  {
    field: HOME_ADDRESS_POSTCODE_FIELD,
    validator: validatePostcode
  }
]

module.exports = (req, res) => {
  const normaliseField = (fieldName) => {
    return lodash.get(req.body, fieldName, '').trim()
  }

  const formFields = {}
  formFields[FIRST_NAME_FIELD] = normaliseField(FIRST_NAME_FIELD)
  formFields[LAST_NAME_FIELD] = normaliseField(LAST_NAME_FIELD)
  formFields[HOME_ADDRESS_LINE1_FIELD] = normaliseField(HOME_ADDRESS_LINE1_FIELD)
  formFields[HOME_ADDRESS_LINE2_FIELD] = normaliseField(HOME_ADDRESS_LINE2_FIELD)
  formFields[HOME_ADDRESS_CITY_FIELD] = normaliseField(HOME_ADDRESS_CITY_FIELD)
  formFields[HOME_ADDRESS_POSTCODE_FIELD] = normaliseField(HOME_ADDRESS_POSTCODE_FIELD)
  formFields[DOB_DAY_FIELD] = normaliseField(DOB_DAY_FIELD)
  formFields[DOB_MONTH_FIELD] = normaliseField(DOB_MONTH_FIELD)
  formFields[DOB_YEAR_FIELD] = normaliseField(DOB_YEAR_FIELD)

  const errors = validationRules.reduce((errors, validationRule) => {
    const errorMessage = validate(formFields, validationRule.field, validationRule.validator, validationRule.maxLength)
    if (errorMessage) {
      errors[validationRule.field] = errorMessage
    }
    return errors
  }, {})

  const dateOfBirthErrorMessage = validateDoB(formFields)
  if (dateOfBirthErrorMessage) {
    errors['dob'] = dateOfBirthErrorMessage
  }

  const pageData = {
    firstName: formFields[FIRST_NAME_FIELD],
    lastName: formFields[LAST_NAME_FIELD],
    homeAddressLine1: formFields[HOME_ADDRESS_LINE1_FIELD],
    homeAddressLine2: formFields[HOME_ADDRESS_LINE2_FIELD],
    homeAddressCity: formFields[HOME_ADDRESS_CITY_FIELD],
    homeAddressPostcode: formFields[HOME_ADDRESS_POSTCODE_FIELD],
    dobDay: formFields[DOB_DAY_FIELD],
    dobMonth: formFields[DOB_MONTH_FIELD],
    dobYear: formFields[DOB_YEAR_FIELD],
  }

  if (!lodash.isEmpty(errors)) {
    pageData['errors'] = errors
    return response.response(req, res, 'stripe-setup/responsible-person/index', pageData)
  } else if (lodash.get(req.body, 'answers-checked') === 'true') {
    return res.redirect(303, paths.dashboard.index)
  } else if (lodash.get(req.body, 'answers-need-changing') === 'true') {
    return response.response(req, res, 'stripe-setup/responsible-person/index', pageData)
  } else {
    const friendlyDob = formatDateOfBirth(formFields[DOB_DAY_FIELD], formFields[DOB_MONTH_FIELD] - 1, formFields[DOB_YEAR_FIELD])
    pageData['friendlyDateOfBirth'] = friendlyDob
    return response.response(req, res, 'stripe-setup/responsible-person/check-your-answers', pageData)
  }
}

const validate = (formFields, fieldName, fieldValidator, maxLength) => {
  const field = formFields[fieldName]
  const isFieldValid = fieldValidator(field, maxLength)
  if (!isFieldValid.valid) {
    return isFieldValid.message
  }
  return null
}

const validateDoB = (formFields) => {
  const day = formFields[DOB_DAY_FIELD]
  const month = formFields[DOB_MONTH_FIELD]
  const year = formFields[DOB_YEAR_FIELD]
  const dateOfBirthValidationResult = validateDateOfBirth(day, month, year)
  if (!dateOfBirthValidationResult.valid) {
    return dateOfBirthValidationResult.message
  }
  return null
}

const formatDateOfBirth = (day, month, year) => {
  return moment({
    day: day,
    month: month - 1,
    year: year,
  }).format('D MMMM YYYY')
}