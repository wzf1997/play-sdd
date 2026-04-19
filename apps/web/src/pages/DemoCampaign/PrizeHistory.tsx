import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'

interface HistoryRecord { prize: { name: string }; playedAt: string }

export interface PrizeHistoryRef { refresh: () => void }

interface PrizeHistoryProps { gameId: string; campaignId: string }

const PrizeHistory = forwardRef<PrizeHistoryRef, PrizeHistoryProps>(
  function PrizeHistory({ gameId, campaignId }, ref) {
    const [records, setRecords] = useState<HistoryRecord[]>([])

    function load() {
      const token = localStorage.getItem('user-token') ?? ''
      fetch(`/api/game/${gameId}/result?campaignId=${campaignId}`, {
        headers: { 'x-user-token': token },
      })
        .then((r) => r.json())
        .then((data) => setRecords(data.records ?? []))
    }

    useEffect(() => { load() }, [gameId, campaignId])

    useImperativeHandle(ref, () => ({ refresh: load }))

    if (records.length === 0) return null

    return (
      <div className="prize-history">
        <h3 className="prize-history-title">我的中奖记录</h3>
        <ul className="prize-history-list">
          {records.map((r, i) => (
            <li key={i} className="prize-history-item">
              <span className="prize-name">{r.prize.name}</span>
              <span className="prize-time">{new Date(r.playedAt).toLocaleString('zh-CN')}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
)

export default PrizeHistory
