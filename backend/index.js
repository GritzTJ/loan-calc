import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import simulationsRouter from './routes/simulations.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.API_PORT || 3000

const app = express()
app.use(express.json())

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
