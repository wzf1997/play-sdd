import { useState, useEffect } from 'react'
import './TaskList.css'

interface TaskWithProgress {
  id: string
  title: string
  description: string
  type: 'once' | 'cumulative'
  targetCount: number
  trigger: 'play' | 'win'
  prizeId: string
  currentCount: number
  status: 'in_progress' | 'completed' | 'claimed'
}

interface TaskListProps {
  campaignId: string
  playCount: number
  onClaimed: (prizeName: string) => void
}

function getUserToken(): string {
  let token = localStorage.getItem('user-token')
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem('user-token', token)
  }
  return token
}

export default function TaskList({ campaignId, playCount, onClaimed }: TaskListProps) {
  const [tasks, setTasks] = useState<TaskWithProgress[]>([])
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/game/tasks?campaignId=${campaignId}`, {
      headers: { 'x-user-token': getUserToken() },
    })
      .then((r) => r.json())
      .then((data: { tasks?: TaskWithProgress[] } | TaskWithProgress[]) => {
        // Handle both { tasks: [...] } shape and bare array fallback
        const list = Array.isArray(data) ? data : (data as { tasks?: TaskWithProgress[] }).tasks
        setTasks(list ?? [])
      })
      .catch(() => setTasks([]))
  }, [campaignId, playCount])

  async function handleClaim(taskId: string) {
    if (claiming) return
    setClaiming(taskId)
    const res = await fetch(`/api/game/tasks/${taskId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
    if (res.ok) {
      const data = await res.json()
      onClaimed(data.prize.name)
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'claimed' as const } : t))
      )
    }
    setClaiming(null)
  }

  if (tasks.length === 0) return null

  return (
    <div className="task-list">
      <h3 className="task-list-title">活动任务</h3>
      {tasks.map((task) => (
        <div key={task.id} className={`task-card task-card--${task.status}`}>
          <div className="task-info">
            <span className="task-title">{task.title}</span>
            <span className="task-desc">{task.description}</span>
          </div>
          <div className="task-progress">
            <div className="task-progress-bar">
              <div
                className="task-progress-fill"
                style={{
                  width: `${Math.min(100, (task.currentCount / task.targetCount) * 100)}%`,
                }}
              />
            </div>
            <span className="task-progress-text">
              {task.currentCount}/{task.targetCount}
            </span>
          </div>
          {task.status === 'completed' && (
            <button
              className="task-claim-btn"
              onClick={() => handleClaim(task.id)}
              disabled={claiming === task.id}
            >
              领取奖励
            </button>
          )}
          {task.status === 'claimed' && (
            <span className="task-claimed-label">已领取 ✓</span>
          )}
        </div>
      ))}
    </div>
  )
}
