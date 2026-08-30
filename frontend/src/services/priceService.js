/*
 * priceService.js — Crop / MSP price data for the farmer dashboard.
 *
 * The backend does NOT have a dedicated /prices endpoint.
 * MSP information is embedded in center objects returned by GET /centers.
 * This service calls the centers API and extracts crop_type + msp_rate
 * into a UI-friendly shape.
 *
 * Backend endpoint consumed:
 *   GET  /centers  — each center object includes crop_type and msp_rate
 */

import { getCenters } from './scheduleService.js'


/**
 * Fetch crop MSP rates by reading center data.
 *
 * Returns de-duplicated crop entries (one row per unique crop_type)
 * with the msp_rate from the first center found for that crop.
 *
 * @returns {Promise<Array<{ crop: string, mspRate: number }>>}
 */
export async function getCropPrices() {
  const centers = await getCenters()

  // De-duplicate by crop_type so the UI shows one row per crop
  const seen = new Map()

  for (const center of centers) {
    const crop = center.crop_type
    if (crop && !seen.has(crop)) {
      seen.set(crop, {
        crop,
        mspRate: center.msp_rate ?? 0,
      })
    }
  }

  return Array.from(seen.values())
}
