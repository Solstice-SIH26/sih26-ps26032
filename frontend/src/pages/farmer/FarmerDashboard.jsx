import { useState, useEffect, useCallback } from 'react'
import './FarmerDashboard.css'

import { requestToken, getToken } from '../../services/tokenService.js'
import { getCenters } from '../../services/scheduleService.js'
import { getCropPrices } from '../../services/priceService.js'

/*
 * ─── TEMPORARY DEMO VALUES ──────────────────────────────────────────
 * Authentication does not exist yet (team leader's responsibility).
 * The farmer UUID below is a syntactically valid placeholder so
 * POST /tokens does not 422. Replace with real identity once auth lands.
 * ─────────────────────────────────────────────────────────────────────
 */
const DEMO_FARMER_ID = 'd1376198-a857-4729-84ff-947e1fe82ca6'


/**
 * Map a lowercase backend status to a human-readable display label.
 * Backend statuses: waiting, called, completed, cancelled
 */
const STATUS_LABELS = {
  waiting: 'Waiting',
  called: 'Called',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function displayStatus(backendStatus) {
  return STATUS_LABELS[backendStatus] || backendStatus
}


/**
 * Determine if a center is currently open based on open_date / close_date.
 * Both are date strings (YYYY-MM-DD). Returns true if today falls within
 * the inclusive [open_date, close_date] range.
 */
function isCenterOpen(openDate, closeDate) {
  if (!openDate || !closeDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const open = new Date(openDate + 'T00:00:00')
  const close = new Date(closeDate + 'T23:59:59')
  return today >= open && today <= close
}


/** Format a number as Indian Rupee with locale grouping (e.g. ₹2,275) */
function formatPrice(amount) {
  return `₹${amount.toLocaleString('en-IN')}`
}


/**
 * StatusBadge — small local component for status indicators.
 * Uses both a colored dot AND text label so status is never
 * communicated by color alone.
 */
function StatusBadge({ status }) {
  const safeStatus = status || 'Unknown'
  const modifier = safeStatus.toLowerCase().replace(/\s+/g, '-')

  return (
    <span
      className={`farmer-dash__status-badge farmer-dash__status-badge--${modifier}`}
      role="status"
    >
      <span className="farmer-dash__status-dot" aria-hidden="true" />
      {safeStatus}
    </span>
  )
}


function FarmerDashboard() {
  /* ── Token state ────────────────────────────────────────────────── */
  const [token, setToken] = useState(() => {
    const savedTokenId = localStorage.getItem('farmerTokenId')
    return savedTokenId ? { id: savedTokenId } : null
  })
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState(null)
  const [isRefreshingToken, setIsRefreshingToken] = useState(false)

  /* ── Centers state ──────────────────────────────────────────────── */
  const [centers, setCenters] = useState([])
  const [centersLoading, setCentersLoading] = useState(true)
  const [centersError, setCentersError] = useState(null)
  const [selectedCenterId, setSelectedCenterId] = useState('')

  /* ── Crop prices state ──────────────────────────────────────────── */
  const [prices, setPrices] = useState([])
  const [pricesLoading, setPricesLoading] = useState(true)

  /* ── Derived: selected center object ────────────────────────────── */
  const selectedCenter = centers.find((c) => c.id === selectedCenterId) || null

  /* ── Fetch centers on mount ─────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false

    async function loadCenters() {
      try {
        const data = await getCenters()
        if (cancelled) return

        if (data && data.length > 0) {
          setCenters(data)
          // Auto-select the first center
          setSelectedCenterId(data[0].id)
        } else {
          setCenters([])
        }
      } catch {
        if (cancelled) return
        setCentersError('Unable to load procurement centers.')
      } finally {
        if (!cancelled) setCentersLoading(false)
      }
    }

    loadCenters()
    return () => { cancelled = true }
  }, [])

  /* ── Fetch crop prices on mount ─────────────────────────────────── */
  useEffect(() => {
    let cancelled = false

    async function loadPrices() {
      try {
        const data = await getCropPrices()
        if (cancelled) return
        setPrices(data && data.length > 0 ? data : [])
      } catch {
        if (cancelled) return
        setPrices([])
      } finally {
        if (!cancelled) setPricesLoading(false)
      }
    }

    loadPrices()
    return () => { cancelled = true }
  }, [])

  /* ── Request a new token ────────────────────────────────────────── */
  const handleRequestToken = useCallback(async () => {
    if (!selectedCenterId) return

    setTokenLoading(true)
    setTokenError(null)

    try {
      const newToken = await requestToken(DEMO_FARMER_ID, selectedCenterId)

      localStorage.setItem('farmerTokenId', newToken.id)

      setToken({
        id: newToken.id,
        tokenNumber: newToken.token_number,
        status: newToken.status,
        centerId: newToken.center_id,
      })
    } catch (err) {
      setTokenError(
        err.status
          ? `Request failed (${err.status}). Please try again.`
          : 'Unable to reach the server. Please try again later.'
      )
    } finally {
      setTokenLoading(false)
    }
  }, [selectedCenterId])

  /* ── Refresh token status ───────────────────────────────────────── */
  const handleRefreshToken = useCallback(async () => {
    if (!token) return

    setIsRefreshingToken(true)
    setTokenError(null)

    try {
      const refreshedToken = await getToken(token.id)

      setToken({
        id: refreshedToken.id,
        tokenNumber: refreshedToken.token_number,
        status: refreshedToken.status,
        centerId: refreshedToken.center_id,
      })
    } catch (err) {
      setTokenError(
        err.status
          ? `Refresh failed (${err.status}). Please try again.`
          : 'Unable to reach the server. Please try again later.'
      )
    } finally {
      setIsRefreshingToken(false)
    }
  }, [token])


  /* ── Restore saved token on page load ───────────────────────────── */
  useEffect(() => {
    const savedTokenId = localStorage.getItem('farmerTokenId')

    if (!savedTokenId) return

    let cancelled = false

    async function loadSavedToken() {
      try {
        const savedToken = await getToken(savedTokenId)

        if (cancelled) return

        setToken({
          id: savedToken.id,
          tokenNumber: savedToken.token_number,
          status: savedToken.status,
          centerId: savedToken.center_id,
        })
      } catch {
        if (cancelled) return

        localStorage.removeItem('farmerTokenId')
        setToken(null)
      }
    }

    loadSavedToken()

    return () => {
      cancelled = true
    }
  }, [])


  /* ── Automatically refresh token status every 10 seconds ───────── */
  useEffect(() => {
    if (!token) return

    const intervalId = setInterval(() => {
      handleRefreshToken()
    }, 10000)

    return () => {
      clearInterval(intervalId)
    }
  }, [token, handleRefreshToken])


  /** Resolve a center name from our loaded centers list */
  function centerName(centerId) {
    const c = centers.find((x) => x.id === centerId)
    return c ? c.name : '—'
  }

  return (
    <div className="farmer-dash">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="farmer-dash__header">
        <h1 className="farmer-dash__title">Farmer Dashboard</h1>
        <p className="farmer-dash__subtitle">
          View your token status, procurement schedule, and current crop prices.
        </p>
      </header>

      {/* ── Section 1: My Token ─────────────────────────────── */}
      <section className="farmer-dash__section" aria-labelledby="token-heading">
        <h2 id="token-heading" className="farmer-dash__section-title">
          My Token
        </h2>

        <div className="farmer-dash__card farmer-dash__token-card">
          {token ? (
            <>
              <div className="farmer-dash__token-header">
                <span className="farmer-dash__token-number">
                  #{token.tokenNumber}
                </span>
                <StatusBadge status={displayStatus(token.status)} />
              </div>

              <dl className="farmer-dash__token-details">
                <div className="farmer-dash__detail-row">
                  <dt>Procurement Center</dt>
                  <dd>{centerName(token.centerId)}</dd>
                </div>
              </dl>

              <button
                type="button"
                className="farmer-dash__btn farmer-dash__btn--secondary"
                onClick={handleRefreshToken}
                disabled={isRefreshingToken}
                style={{ marginTop: '1rem' }}
              >
                {isRefreshingToken ? 'Refreshing…' : 'Refresh Status'}
              </button>
            </>
          ) : (
            <p className="farmer-dash__empty-state">
              No active token. Select a center and request one below.
            </p>
          )}

          {tokenError && (
            <p className="farmer-dash__error-msg" role="alert">
              {tokenError}
            </p>
          )}

          {/* ── Center selector ──────────────────────────────── */}
          {centersLoading ? (
            <p className="farmer-dash__loading-msg">Loading centers…</p>
          ) : centersError ? (
            <p className="farmer-dash__error-msg" role="alert">
              {centersError}
            </p>
          ) : centers.length > 0 ? (
            <div className="farmer-dash__center-select-row">
              <label
                htmlFor="center-select"
                className="farmer-dash__center-select-label"
              >
                Center
              </label>
              <select
                id="center-select"
                className="farmer-dash__center-select"
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
              >
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.crop_type}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="farmer-dash__empty-state">
              No procurement centers available.
            </p>
          )}

          <button
            type="button"
            className="farmer-dash__btn farmer-dash__btn--primary"
            onClick={handleRequestToken}
            disabled={tokenLoading || !selectedCenterId}
          >
            {tokenLoading ? 'Requesting…' : 'Request New Token'}
          </button>
        </div>
      </section>

      {/* ── Bottom grid: Schedule + Prices ──────────────────── */}
      <div className="farmer-dash__grid">

        {/* ── Section 2: Procurement Schedule ────────────────── */}
        <section className="farmer-dash__section" aria-labelledby="schedule-heading">
          <h2 id="schedule-heading" className="farmer-dash__section-title">
            Procurement Schedule
          </h2>

          <div className="farmer-dash__card">
            {centersLoading ? (
              <p className="farmer-dash__loading-msg">Loading schedule…</p>
            ) : selectedCenter ? (
              <dl className="farmer-dash__schedule-details">
                <div className="farmer-dash__detail-row">
                  <dt>Center</dt>
                  <dd>{selectedCenter.name}</dd>
                </div>
                <div className="farmer-dash__detail-row">
                  <dt>Location</dt>
                  <dd>{selectedCenter.location}</dd>
                </div>
                <div className="farmer-dash__detail-row">
                  <dt>Crop</dt>
                  <dd>{selectedCenter.crop_type}</dd>
                </div>
                <div className="farmer-dash__detail-row">
                  <dt>Opens</dt>
                  <dd>{selectedCenter.open_date || '—'}</dd>
                </div>
                <div className="farmer-dash__detail-row">
                  <dt>Closes</dt>
                  <dd>{selectedCenter.close_date || '—'}</dd>
                </div>
                <div className="farmer-dash__detail-row">
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge
                      status={
                        isCenterOpen(selectedCenter.open_date, selectedCenter.close_date)
                          ? 'Open'
                          : 'Closed'
                      }
                    />
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="farmer-dash__empty-state">
                No centers available at this time.
              </p>
            )}
          </div>
        </section>

        {/* ── Section 3: Crop Prices / MSP ───────────────────── */}
        <section className="farmer-dash__section" aria-labelledby="prices-heading">
          <h2 id="prices-heading" className="farmer-dash__section-title">
            Crop Prices / MSP
          </h2>

          <div className="farmer-dash__card">
            {pricesLoading ? (
              <p className="farmer-dash__loading-msg">Loading prices…</p>
            ) : prices.length > 0 ? (
              <table className="farmer-dash__price-table">
                <thead>
                  <tr>
                    <th scope="col">Crop</th>
                    <th scope="col">MSP Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((item) => (
                    <tr key={item.crop}>
                      <td>{item.crop}</td>
                      <td className="farmer-dash__price-value">
                        {formatPrice(item.mspRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="farmer-dash__empty-state">
                No price data available.
              </p>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}

export default FarmerDashboard
