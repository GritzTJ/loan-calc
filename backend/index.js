import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import simulationsRouter from './routes/simulations.js'
import { sessionMiddleware, requireAuth, loginRoute, callbackRoute, logoutRoute, meRoute } from './auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.API_PORT || 3000

const app = express()

// Nécessaire : Traefik termine TLS, Express reçoit HTTP derrière le reverse proxy
app.set('trust proxy', 1)

app.use(express.json())
app.use(sessionMiddleware())

// Routes d'authentification publiques (avant le guard)
app.get('/auth/login', loginRoute)
app.get('/auth/callback', callbackRoute)
app.get('/auth/logout', logoutRoute)
app.get('/auth/me', meRoute)

// Guard : protège toutes les routes ci-dessous
app.use(requireAuth)

// API REST
app.use('/api/simulations', simulationsRouter)

// Frontend statique (build Vue)
const publicDir = join(__dirname, 'public')
app.use(express.static(publicDir))

// SPA fallback : renvoie index.html pour toutes les routes non-API
app.get('*', (req, res) => {
  res.sendFile(join(publicDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`loan-calc server running on port ${PORT}`)
})
