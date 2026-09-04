/*
 * tokenService.js — API functions for procurement requests/tokens.
 *
 * Backend endpoints:
 *   POST   /tokens
 *   GET    /tokens/{id}
 *   PATCH  /tokens/{id}/approve
 *   PATCH  /tokens/{id}/reject
 *   PATCH  /tokens/{id}/cancel
 *   PATCH  /tokens/{id}/status
 */

import { apiFetch } from './api.js'


/**
 * Submit a new procurement request.
 *
 * New requests start with status "pending".
 * The backend assigns token_number and time_slot only
 * after staff approval.
 *
 * @param {string} farmerId
 * @param {string} centerId
 * @param {string} requestedDate — YYYY-MM-DD
 * @param {string} cropType
 * @param {number} quantityKg
 * @returns {Promise<Object>} created procurement request
 */
export async function requestToken(
  farmerId,
  centerId,
  requestedDate,
  cropType,
  quantityKg
) {
  return apiFetch('/tokens', {
    method: 'POST',
    body: JSON.stringify({
      farmer_id: farmerId,
      center_id: centerId,
      requested_date: requestedDate,
      crop_type: cropType,
      quantity_kg: quantityKg,
    }),
  })
}


/**
 * Fetch a single procurement request/token.
 *
 * @param {string} tokenId
 * @returns {Promise<Object>} token/request object
 */
export async function getToken(tokenId) {
  return apiFetch(`/tokens/${encodeURIComponent(tokenId)}`)
}


/**
 * Approve a pending procurement request.
 *
 * Backend assigns:
 *   - token_number
 *   - time_slot
 *   - status = "waiting"
 *
 * @param {string} tokenId
 * @returns {Promise<Object>} approved token
 */
export async function approveToken(tokenId) {
  return apiFetch(`/tokens/${encodeURIComponent(tokenId)}/approve`, {
    method: 'PATCH',
  })
}


/**
 * Reject a pending procurement request.
 *
 * @param {string} tokenId
 * @returns {Promise<Object>} rejected request
 */
export async function rejectToken(tokenId) {
  return apiFetch(`/tokens/${encodeURIComponent(tokenId)}/reject`, {
    method: 'PATCH',
  })
}


/**
 * Cancel a pending or waiting request.
 *
 * @param {string} tokenId
 * @returns {Promise<Object>} cancelled request
 */
export async function cancelToken(tokenId) {
  return apiFetch(`/tokens/${encodeURIComponent(tokenId)}/cancel`, {
    method: 'PATCH',
  })
}


/**
 * Progress an already-approved token through the physical queue.
 *
 * Allowed transitions:
 *   waiting → called
 *   called  → completed
 *
 * @param {string} tokenId
 * @param {"called"|"completed"} status
 * @returns {Promise<Object>} updated token
 */
export async function updateTokenStatus(tokenId, status) {
  return apiFetch(`/tokens/${encodeURIComponent(tokenId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}