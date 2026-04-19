import type { FastifyInstance } from 'fastify'
import type { Prize } from '@paly-sdd/game-core'
import { getDb } from '../db.js'
import { getCampaign, getConfig } from '../campaigns/index.js'
import { drawPrize, getPrizeById } from '../prizes/index.js'
import { getRemainingPlays, recordPlay, getPlayHistory } from '../users/index.js'
import { getTasksWithProgress, updateTaskProgress, claimTask } from '../tasks/index.js'
import type { TaskUpdate } from '../tasks/index.js'

export async function gameRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/internal/game/:gameId/init
  app.post<{ Params: { gameId: string }; Body: { userId: string; campaignId: string } }>(
    '/api/internal/game/:gameId/init',
    async (req, reply) => {
      const { userId, campaignId } = req.body
      const campaign = getCampaign(campaignId)
      if (!campaign) return reply.status(404).send({ error: 'campaign not found' })

      const config = getConfig(campaignId)
      const remainingPlays = getRemainingPlays(userId, campaignId)
      return reply.send({ config, remainingPlays })
    }
  )

  // POST /api/internal/game/:gameId/play
  app.post<{ Params: { gameId: string }; Body: { userId: string; campaignId: string } }>(
    '/api/internal/game/:gameId/play',
    async (req, reply) => {
      const { userId, campaignId } = req.body
      const { gameId } = req.params
      const db = getDb()

      type PlayResult = { prize: Prize | null; remainingPlays: number } | { error: string }

      const core = db.transaction((): PlayResult => {
        const remaining = getRemainingPlays(userId, campaignId)
        if (remaining <= 0) return { error: 'no plays remaining' }
        const prize = drawPrize(campaignId)
        recordPlay(userId, campaignId, gameId, prize?.id ?? null)
        return { prize, remainingPlays: getRemainingPlays(userId, campaignId) }
      })()

      if ('error' in core) return reply.status(403).send(core)

      // Update task progress outside the main transaction so failures don't affect play result
      let taskUpdates: TaskUpdate[] = []
      try {
        taskUpdates = updateTaskProgress(userId, campaignId, 'play')
        if (core.prize !== null) {
          const winUpdates = updateTaskProgress(userId, campaignId, 'win')
          taskUpdates = [...taskUpdates, ...winUpdates]
        }
      } catch (err) {
        app.log.error(err, 'task progress update failed')
      }

      return reply.send({ ...core, taskUpdates })
    }
  )

  // GET /api/internal/game/:gameId/result
  app.get<{ Params: { gameId: string }; Querystring: { userId: string; campaignId: string } }>(
    '/api/internal/game/:gameId/result',
    async (req, reply) => {
      const { userId, campaignId } = req.query
      const history = getPlayHistory(userId, campaignId)
      const records = history
        .filter((h) => h.prize_id !== null)
        .map((h) => ({
          prize: getPrizeById(h.prize_id!)!,
          playedAt: h.played_at,
        }))
      return reply.send({ records })
    }
  )

  // GET /api/internal/tasks
  app.get<{ Querystring: { userId: string; campaignId: string } }>(
    '/api/internal/tasks',
    async (req, reply) => {
      const { userId, campaignId } = req.query
      const tasks = getTasksWithProgress(userId, campaignId)
      return reply.send({ tasks })
    }
  )

  // POST /api/internal/tasks/:taskId/claim
  app.post<{ Params: { taskId: string }; Body: { userId: string; campaignId: string } }>(
    '/api/internal/tasks/:taskId/claim',
    async (req, reply) => {
      const { taskId } = req.params
      const { userId, campaignId } = req.body
      try {
        const prize = claimTask(userId, taskId, campaignId)
        return reply.send({ prize })
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string }
        return reply.status(e.statusCode ?? 500).send({ error: e.message ?? 'claim failed' })
      }
    }
  )
}
