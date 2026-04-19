import Fastify from 'fastify'
import { initDb } from './db.js'
import { seedDemoData } from './seed.js'
import { gameRoutes } from './routes/game.js'

const app = Fastify({ logger: true })

app.register(async () => {
  initDb('./data.db')
  seedDemoData()
})

app.register(gameRoutes)

async function start(): Promise<void> {
  await app.listen({ port: 3001, host: '0.0.0.0' })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
