/**
 * Travel parse API contract (backend intent only — no planning).
 *
 * @typedef {'transport'|'hotel'|'activities'|'car_rental'} TravelServiceType
 *
 * @typedef {Object} TravelDuration
 * @property {number|null} [nights]
 *
 * @typedef {Object} TravelBudget
 * @property {number|null} [amount]
 * @property {string|null} [currency]
 *
 * @typedef {Object} TravelDates
 * @property {string|null} [start] - ISO date YYYY-MM-DD
 * @property {string|null} [end] - ISO date YYYY-MM-DD
 *
 * @typedef {Object} TravelService
 * @property {TravelServiceType} type
 * @property {string} [from]
 * @property {string} [to]
 * @property {string[]} [places]
 *
 * @typedef {Object} TravelParseResult
 * @property {string|null} destination
 * @property {TravelDuration|null} duration
 * @property {number|null} travelers
 * @property {TravelBudget|null} budget
 * @property {TravelDates|null} travelDates
 * @property {TravelService[]} services
 *
 * @typedef {Object} TravelApiErrorBody
 * @property {string} [message]
 * @property {number} [statusCode]
 */

export {};
