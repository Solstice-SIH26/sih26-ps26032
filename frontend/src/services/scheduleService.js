/*
 * scheduleService.js — API functions for procurement centers / schedules.
 *
 * Backend endpoints consumed:
 *   GET  /centers?crop_type=...       — list centers, optionally filtered by crop
 *   GET  /centers/{id}                — single center details
 *   GET  /centers/{id}/queue?status=  — token queue for a center
 */

import { apiFetch } from './api.js'


/**
 * Fetch a list of procurement centers.
 * Optionally filter by the type of crop being accepted.
 *
 * @param {string} [cropType] — crop type filter (e.g. "Wheat")
 * @returns {Promise<Array>} array of center objects
 */
export async function getCenters(cropType) {
  const params = new URLSearchParams()
  if (cropType) {
    params.set('crop_type', cropType)
  }
  const query = params.toString()
  return apiFetch(`/centers${query ? `?${query}` : ''}`)
}


/**
 * Fetch a single procurement center by ID.
 *
 * @param {string} centerId
 * @returns {Promise<Object>} center object
 */
export async function getCenter(centerId) {
  return apiFetch(`/centers/${encodeURIComponent(centerId)}`)
}


/**
 * Fetch the token queue for a specific center.
 *
 * @param {string} centerId
 * @param {string} [status] — optional status filter (e.g. "Waiting")
 * @returns {Promise<Array>} tokens ordered by token_number
 */
export async function getCenterQueue(centerId, status) {
  const params = new URLSearchParams()
  if (status) {
    params.set('status', status)
  }
  const query = params.toString()
  return apiFetch(
    `/centers/${encodeURIComponent(centerId)}/queue${query ? `?${query}` : ''}`
  )
}
