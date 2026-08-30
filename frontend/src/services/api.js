/*
 * api.js — Centralized fetch wrapper for the FastAPI backend.
 *
 * All service modules (tokenService, scheduleService, priceService)
 * use this module for HTTP requests. This keeps the base URL, error
 * handling, and JSON parsing in a single place.
 *
 * Uses native fetch (team decision — no Axios dependency).
 */


/**
 * Custom error class for non-2xx API responses.
 * Carries the HTTP status code and, if available, the parsed
 * response body so callers can inspect error details.
 */
export class ApiError extends Error {
  constructor(status, statusText, body = null) {
    super(`API error ${status}: ${statusText}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}


/**
 * Send a request to the backend and return the parsed JSON body.
 *
 * @param {string} path — URL path relative to BASE_URL (e.g. "/tokens")
 * @param {RequestInit} [options] — standard fetch options
 * @returns {Promise<any>} parsed JSON response
 * @throws {ApiError} on non-2xx responses
 * @throws {Error}    on network failures or invalid JSON
 */
export async function apiFetch(path, options = {}) {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  const url = `${BASE_URL}${path}`

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(url, { ...options, headers })

  if (!response.ok) {
    // Try to parse error body for details, but don't crash if it fails
    let body = null
    try {
      body = await response.json()
    } catch {
      // response body wasn't JSON — that's fine
    }
    throw new ApiError(response.status, response.statusText, body)
  }

  // Some endpoints may return 204 No Content
  if (response.status === 204) {
    return null
  }

  return response.json()
}
