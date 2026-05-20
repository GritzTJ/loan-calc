import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import simulationsRouter from './routes/simulations.js'
import { sessionMiddleware, requireAuth, loginRoute, callbackRoute, logoutRoute, meRoute } from './auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.API_PORT || 3000

// Validation des variables d'environnement obligatoires au démarrage
const requiredEnv = ['SESSION_SECRET', 'OIDC_ISSUER', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET', 'OIDC_REDIRECT_URI']
const missing = requiredEnv.filter(k => !process.env[k])
if (missing.length > 0) {
  console.error(`[boot] Variables d'environnement manquantes : ${missing.join(', ')}`)
  process.exit(1)
}

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

// Assets PWA publics : doivent être accessibles sans session,
// sinon iOS/Android ne peuvent ni installer l'app ni récupérer le service worker.
const publicDir = join(__dirname, 'public')
app.get(['/manifest.webmanifest', '/sw.js'], (req, res) => {
  // sw.js ne doit jamais être mis en cache navigateur (mises à jour)
  if (req.path === '/sw.js') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  }
  res.sendFile(join(publicDir, req.path))
})
// Workbox runtime (fichiers /workbox-<hash>.js) + icônes : également publics
app.get(/^\/workbox-[^/]+\.js$/, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.sendFile(join(publicDir, req.path))
})
app.use('/icons', express.static(join(publicDir, 'icons')))

// Guard : protège toutes les routes ci-dessous
app.use(requireAuth)

// API REST
app.use('/api/simulations', simulationsRouter)

// Frontend statique (build Vue)
app.use(express.static(publicDir))

// SPA fallback : renvoie index.html pour toutes les routes non-API
app.get('*', (req, res) => {
  res.sendFile(join(publicDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`loan-calc server running on port ${PORT}`)
})
