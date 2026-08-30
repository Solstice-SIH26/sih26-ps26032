/*
 * tokenService.js — API functions for procurement tokens.
 *
 * Backend endpoints consumed:
 *   POST   /tokens              — create a new token
 *   GET    /tokens/{id}         — retrieve a token by ID
 *   PATCH  /tokens/{id}/status  — update a token's status
 */

import { apiFetch } from './api.js'


/**
 * Request a new procurement token.
 *
 * @param {string} farmerId — ID of the farmer requesting the token
 * @param {string} centerId — ID of the target procurement center
 * @returns {Promise<Object>} the newly created token object
 */
export async function requestToken(farmerId, centerId) {
  return apiFetch('/tokens', {
    method: 'POST',
    body: JSON.stringify({
      farmer_id: farmerId,
      center_id: centerId,
    }),
  })
}


/**
 * Fetch a single token by its ID.
 *
 * @param {string} tokenId
 * @returns {Promise<Object>} the token object
 */
export async function getToken(tokenId) {
  return apiFetch(`/tokens/${encodeURIComponent(tokenId)}`)
}


/**
 * Update a token's status.
 * Valid statuses: waiting, called, completed, cancelled.
 *
 * @param {string} tokenId
 * @param {string} status — new status value (exact backend value)
 * @returns {Promise<Object>} the updated token object
 */
export async function updateTokenStatus(tokenId, status) {
  return apiFetch(`/tokens/${encodeURIComponent(tokenId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
