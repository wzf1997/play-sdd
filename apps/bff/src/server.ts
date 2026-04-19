import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { authMiddleware } from './middleware/auth.js'
import { grid9Routes } from './routes/game/grid9.js'
import { spinWheelRoutes } from './routes/game/spin-wheel.js'
import { blindBoxRoutes } from './routes/game/blind-box.js'
import { taskRoutes } from './routes/game/tasks.js'

const app = Fastify({ logger: true })

app.setErrorHandler(async (error, _req, reply) => {
  reply.status(503).send({ error: 'Service unavailable' })
})

// rate limit: 5 play requests per second per user
await app.register(rateLimit, {
  max: 5,
  timeWindow: '1 second',
  keyGenerator: (req) => (req.headers['x-user-token'] as string) ?? req.ip,
  skipOnError: false,
})

app.addHook('onRequest', authMiddleware)

await app.register(grid9Routes)
await app.register(spinWheelRoutes)
await app.register(blindBoxRoutes)
await app.register(taskRoutes)

const port = Number(process.env.PORT ?? 3000)
await app.listen({ port, host: '0.0.0.0' })
