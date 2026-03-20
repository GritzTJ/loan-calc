import { Issuer, generators, custom } from 'openid-client'
import session from 'express-session'

// Augmente le timeout HTTP (défaut 3500ms trop court derrière Traefik/TLS)
custom.setHttpOptionsDefaults({ timeout: 10000 })

let oidcClient = null

// Lazy init via OIDC Discovery (.well-known/openid-configuration)
async function getClient() {
  if (oidcClient) return oidcClient
  const issuer = await Issuer.discover(process.env.OIDC_ISSUER)
  oidcClient = new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID,
    client_secret: process.env.OIDC_CLIENT_SECRET,
    redirect_uris: [process.env.OIDC_REDIRECT_URI],
    response_types: ['code']
  })
  return oidcClient
}

export function sessionMiddleware() {
  return session({
    secret: process.env.SESSION_SECRET || 'changeme_32chars_minimum',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development', // secure uniquement hors dev
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000 // 8 heures
    }
  })
}

// Guard : protège toutes les routes montées après lui
export function requireAuth(req, res, next) {
  if (req.session.user) return next()

  // Les routes API retournent 401 sans redirection
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Mémorise l'URL de destination pour y revenir après login
  req.session.returnTo = req.originalUrl
  res.redirect('/auth/login')
}

// Déclenche le flux Authorization Code : génère state + code_verifier et redirige vers le provider
export async function loginRoute(req, res) {
  try {
    const client = await getClient()
    const state = generators.state()
    const codeVerifier = generators.codeVerifier()
    const codeChallenge = generators.codeChallenge(codeVerifier)

    // Stocke en session pour vérification au callback
    req.session.oidcState = state
    req.session.oidcCodeVerifier = codeVerifier

    const authUrl = client.authorizationUrl({
      scope: 'openid profile email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    res.redirect(authUrl)
  } catch (err) {
    console.error('[OIDC] loginRoute error:', err.message)
    res.status(500).send('Erreur lors de la redirection vers le provider OIDC.')
  }
}

// Reçoit le code du provider, échange contre des tokens, crée la session utilisateur
export async function callbackRoute(req, res) {
  try {
    const client = await getClient()
    const params = client.callbackParams(req)

    const tokenSet = await client.callback(
      process.env.OIDC_REDIRECT_URI,
      params,
      {
        state: req.session.oidcState,
        code_verifier: req.session.oidcCodeVerifier
      }
    )

    // Certains providers (ex: Pocket ID) n'exposent pas d'endpoint userinfo séparé
    let userinfo
    try {
      userinfo = await client.userinfo(tokenSet)
    } catch {
      userinfo = tokenSet.claims()
    }

    req.session.user = {
      sub: userinfo.sub,
      name: userinfo.name || userinfo.preferred_username || userinfo.email || userinfo.sub,
      email: userinfo.email || null
    }

    // Nettoie les données OIDC temporaires
    delete req.session.oidcState
    delete req.session.oidcCodeVerifier

    const returnTo = req.session.returnTo || '/'
    delete req.session.returnTo

    res.redirect(returnTo)
  } catch (err) {
    console.error('[OIDC] callbackRoute error:', err.message)
    res.redirect('/auth/login')
  }
}

// Détruit la session et redirige vers la racine (qui relancera le flux OIDC)
export function logoutRoute(req, res) {
  req.session.destroy(() => {
    res.redirect('/')
  })
}

// Retourne les infos de l'utilisateur connecté au frontend
export function meRoute(req, res) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  res.json(req.session.user)
}
