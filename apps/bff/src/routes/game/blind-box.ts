import type { FastifyInstance } from 'fastify'
import { fetch } from 'undici'

const SERVICE_URL = process.env.SERVICE_URL ?? 'http://localhost:3001'

export async function blindBoxRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { campaignId: string } }>(
    '/api/game/blind-box/init',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const res = await fetch(`${SERVICE_URL}/api/internal/game/blind-box/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, campaignId: req.body.campaignId }),
      })
      return reply.status(res.status).send(await res.json())
    }
  )

  app.post<{ Body: { campaignId: string } }>(
    '/api/game/blind-box/play',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const res = await fetch(`${SERVICE_URL}/api/internal/game/blind-box/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, campaignId: req.body.campaignId }),
      })
      return reply.status(res.status).send(await res.json())
    }
  )

  app.get<{ Querystring: { campaignId: string } }>(
    '/api/game/blind-box/result',
    async (req, reply) => {
      const userId = req.headers['x-user-token'] as string
      const serviceUrl = new URL(`${SERVICE_URL}/api/internal/game/blind-box/result`)
      serviceUrl.searchParams.set('userId', userId)
      serviceUrl.searchParams.set('campaignId', req.query.campaignId)
      const res = await fetch(serviceUrl.toString())
      return reply.status(res.status).send(await res.json())
    }
  )
}
