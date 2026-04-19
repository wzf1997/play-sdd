// apps/web/src/games/BlindBox/index.tsx
import { useState, useEffect } from 'react'
import type { GameProps } from '@paly-sdd/game-core'
import './BlindBox.css'

function getUserToken(): string {
  let token = localStorage.getItem('user-token')
  if (!token) { token = crypto.randomUUID(); localStorage.setItem('user-token', token) }
  return token
}

export default function BlindBox({ campaignId, onResult }: GameProps) {
  const [remainingPlays, setRemainingPlays] = useState(0)
  const [isOpening, setIsOpening] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/game/blind-box/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
      .then((r) => r.json())
      .then((data) => setRemainingPlays(data.remainingPlays))
  }, [campaignId])

  async function handleOpen() {
    if (isOpening || remainingPlays <= 0) return
    setIsOpening(true)
    setResult(null)

    const res = await fetch('/api/game/blind-box/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
    const data = await res.json()

    setTimeout(() => {
      setIsOpening(false)
      setRemainingPlays(data.remainingPlays)
      setResult(data.prize?.name ?? '谢谢参与')
      onResult(data.prize)
    }, 1500)
  }

  return (
    <div className="blindbox-container">
      <div className={`blindbox-box ${isOpening ? 'opening' : ''}`}>
        {/* 蝴蝶结：3 个椭圆 div — 对齐设计稿 bowLeft/bowRight/bowCenter */}
        <div className="blindbox-bow-left" />
        <div className="blindbox-bow-right" />
        <div className="blindbox-bow-center" />
        {/* 盒盖（内含丝带横竖 via ::before/::after） */}
        <div className="blindbox-lid" />
        {/* 礼盒主体（内含丝带横竖 via ::before/::after） */}
        <div className="blindbox-body">
          {!result && <span className="blindbox-question">?</span>}
          {result && <div className="blindbox-prize">{result}</div>}
        </div>
      </div>
      <div className="blindbox-remaining">
        {remainingPlays <= 0 ? '今日次数已用完' : `今日剩余次数：${remainingPlays} 次`}
      </div>
      <button
        className="blindbox-btn"
        onClick={handleOpen}
        disabled={isOpening || remainingPlays <= 0}
      >
        {isOpening ? '开启中...' : '开启盲盒'}
      </button>
    </div>
  )
}
