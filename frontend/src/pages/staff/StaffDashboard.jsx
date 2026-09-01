import { useEffect, useState, useCallback } from 'react'
import './StaffDashboard.css'

import {
    getCenters,
    getCenterQueue,
    updateTokenStatus,
} from '../../services/scheduleService.js'

function StaffDashboard() {
    const [centers, setCenters] = useState([])
    const [selectedCenterId, setSelectedCenterId] = useState('')

    // Queues
    const [waitingQueue, setWaitingQueue] = useState([])
    const [calledQueue, setCalledQueue] = useState([])
    const [completedQueue, setCompletedQueue] = useState([])

    const [centersLoading, setCentersLoading] = useState(true)
    const [queueLoading, setQueueLoading] = useState(false)

    const [error, setError] = useState(null)

    // Initial centers load
    useEffect(() => {
        async function loadCenters() {
            try {
                const data = await getCenters()
                setCenters(data || [])
                if (data && data.length > 0) {
                    setSelectedCenterId(data[0].id)
                }
            } catch (err) {
                setError('Unable to load procurement centers.')
            } finally {
                setCentersLoading(false)
            }
        }
        loadCenters()
    }, [])

    const loadAllQueues = useCallback(async (isBackground = false) => {
        if (!selectedCenterId) return

        if (!isBackground) setQueueLoading(true)
        setError(null)

        try {
            const [waiting, called, completed] = await Promise.all([
                getCenterQueue(selectedCenterId, 'waiting'),
                getCenterQueue(selectedCenterId, 'called'),
                getCenterQueue(selectedCenterId, 'completed')
            ])
            console.log("WAITING:", waiting)
            console.log("CALLED:", called)
            console.log("COMPLETED:", completed)
            setWaitingQueue(waiting || [])
            setCalledQueue(called || [])
            setCompletedQueue(completed || [])
        } catch (err) {
            setError('Unable to load token queues.')
            if (!isBackground) {
                setWaitingQueue([])
                setCalledQueue([])
                setCompletedQueue([])
            }
        } finally {
            if (!isBackground) setQueueLoading(false)
        }
    }, [selectedCenterId])

    // Load queues on center change
    useEffect(() => {
        loadAllQueues()
    }, [loadAllQueues])

    // Auto-refresh interval (every 10 seconds)
    useEffect(() => {
        if (!selectedCenterId) return
        const intervalId = setInterval(() => {
            loadAllQueues(true) // background refresh
        }, 10000)
        return () => clearInterval(intervalId)
    }, [selectedCenterId, loadAllQueues])

    async function handleStatusUpdate(tokenId, status) {
        try {
            setError(null)
            await updateTokenStatus(tokenId, status)
            await loadAllQueues() // Immediately refresh all queues
        } catch (err) {
            setError(`Unable to update token to ${status}.`)
        }
    }

    return (
        <div className="staff-dash">
            <header className="staff-dash__header">
                <div>
                    <h1>Staff Dashboard</h1>
                    <p>Manage the procurement center token queue.</p>
                </div>
                <div className="staff-dash__center-selector">
                    {centersLoading ? (
                        <span className="staff-dash__loading-text">Loading centers...</span>
                    ) : centers.length === 0 ? (
                        <span className="staff-dash__error-text">No centers available</span>
                    ) : (
                        <select
                            value={selectedCenterId}
                            onChange={(e) => setSelectedCenterId(e.target.value)}
                            className="staff-dash__select"
                        >
                            {centers.map((center) => (
                                <option key={center.id} value={center.id}>
                                    {center.name} ({center.crop_type})
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </header>

            {error && (
                <div className="staff-dash__alert staff-dash__alert--error" role="alert">
                    {error}
                </div>
            )}

            <div className="staff-dash__summary">
                <div className="staff-dash__summary-card">
                    <h3>Waiting</h3>
                    <div className="staff-dash__summary-value">{waitingQueue.length}</div>
                </div>
                <div className="staff-dash__summary-card staff-dash__summary-card--active">
                    <h3>Currently Serving</h3>
                    <div className="staff-dash__summary-value">{calledQueue.length}</div>
                </div>
                <div className="staff-dash__summary-card">
                    <h3>Completed</h3>
                    <div className="staff-dash__summary-value">{completedQueue.length}</div>
                </div>
            </div>

            <div className="staff-dash__main">
                {/* CURRENTLY SERVING */}
                <section className="staff-dash__section staff-dash__section--serving">
                    <h2>Currently Serving</h2>

                    {queueLoading ? (
                        <div className="staff-dash__skeleton">Loading current tokens...</div>
                    ) : calledQueue.length === 0 ? (
                        <div className="staff-dash__empty">No farmer is currently being served.</div>
                    ) : (
                        <div className="staff-dash__current-list">
                            {calledQueue.map(token => (
                                <div key={token.id} className="staff-dash__current-card">
                                    <div className="staff-dash__current-info">
                                        <span className="staff-dash__current-number">Token #{token.token_number}</span>
                                        <span className="staff-dash__current-farmer">Farmer: {token.farmer_id.substring(0, 8)}...</span>
                                    </div>
                                    <button
                                        className="staff-dash__btn staff-dash__btn--success"
                                        onClick={() => handleStatusUpdate(token.id, 'completed')}
                                    >
                                        Complete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* WAITING QUEUE */}
                <section className="staff-dash__section staff-dash__section--waiting">
                    <h2>Waiting Queue</h2>

                    {queueLoading ? (
                        <div className="staff-dash__skeleton">Loading queue...</div>
                    ) : waitingQueue.length === 0 ? (
                        <div className="staff-dash__empty">The waiting queue is empty.</div>
                    ) : (
                        <div className="staff-dash__queue-list">
                            <table className="staff-dash__table">
                                <thead>
                                    <tr>
                                        <th>Token</th>
                                        <th>Farmer ID</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {waitingQueue.map(token => (
                                        <tr key={token.id}>
                                            <td className="staff-dash__token-highlight">#{token.token_number}</td>
                                            <td className="staff-dash__farmer-id">{token.farmer_id.substring(0, 8)}...</td>
                                            <td>
                                                <span className="staff-dash__badge staff-dash__badge--waiting">
                                                    {token.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="staff-dash__btn staff-dash__btn--primary"
                                                    onClick={() => handleStatusUpdate(token.id, 'called')}
                                                >
                                                    Call Next
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
                {/* COMPLETED QUEUE */}
                <section className="staff-dash__section staff-dash__section--completed">
                    <h2>Recently Completed</h2>

                    {queueLoading ? (
                        <div className="staff-dash__skeleton staff-dash__skeleton--compact">Loading...</div>
                    ) : completedQueue.length === 0 ? (
                        <div className="staff-dash__empty staff-dash__empty--compact">No completed tokens yet.</div>
                    ) : (
                        <div className="staff-dash__queue-list">
                            <table className="staff-dash__table staff-dash__table--compact">
                                <thead>
                                    <tr>
                                        <th>Token</th>
                                        <th>Farmer ID</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {completedQueue.slice(0, 10).map(token => (
                                        <tr key={token.id}>
                                            <td className="staff-dash__token-highlight">#{token.token_number}</td>
                                            <td className="staff-dash__farmer-id">{token.farmer_id.substring(0, 8)}...</td>
                                            <td>
                                                <span className="staff-dash__badge staff-dash__badge--completed">
                                                    {token.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}

export default StaffDashboard