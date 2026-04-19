import type { FastifyInstance } from 'fastify'
import { fetch } from 'undici'

const SERVICE_URL = process.env.SERVICE_URL ?? 'http://localhost:3001'

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/game/tasks?campaignId=...
  app.get<{ Querystring: { campaignId: string } }>(
    '/api/game/tasks',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const serviceUrl = new URL(`${SERVICE_URL}/api/internal/tasks`)
      serviceUrl.searchParams.set('userId', userId)
      serviceUrl.searchParams.set('campaignId', req.query.campaignId)
      const res = await fetch(serviceUrl.toString())
      const data = await res.json()
      return reply.status(res.status).send(data)
    }
  )

  // POST /api/game/tasks/:taskId/claim
  app.post<{ Params: { taskId: string }; Body: { campaignId: string } }>(
    '/api/game/tasks/:taskId/claim',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const { taskId } = req.params
      const res = await fetch(`${SERVICE_URL}/api/internal/tasks/${taskId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, campaignId: req.body.campaignId }),
      })
      const data = await res.json()
      return reply.status(res.status).send(data)
    }
  )
}
