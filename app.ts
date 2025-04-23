import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import session from 'express-session'
import Keycloak, {KeycloakConfig} from 'keycloak-connect'
import cors from 'cors'
import dotenv from 'dotenv'

import homeRouter from './routes/home'
import loginRouter from './routes/login'
import logoutRouter from './routes/logout'
import userRouter from './routes/users'
import resourceRouter from './routes/resources'
import reservationRouter from './routes/reservations'
import swaggerRouter from './routes/swagger'
import adminRouter from './routes/adminOnly'

const app = express()
dotenv.config()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

// cors
const corsOptions = {
    origin: process.env.FRONTEND_URL,
    optionsSuccessStatus: 200
}
app.use(cors(corsOptions))

// session management
const memoryStore = new session.MemoryStore()
app.use(session({
    secret: "session-secret",
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}))

// keycloak
const kcConfig:KeycloakConfig = {
    "realm": process.env.KEYCLOAK_REALM || "",
    "auth-server-url": process.env.KEYCLOAK_URL || "",
    "ssl-required": "external",
    "resource": process.env.KEYCLOAK_CLIENT || "",
    // @ts-ignore because the KeycloakConfig type doesn't include the credentials/secret field
    "credentials": {
        "secret": process.env.KEYCLOAK_SECRET || ""
    },
    "confidential-port": 0
}
const keycloak = new Keycloak({ store: memoryStore }, kcConfig)
app.use(keycloak.middleware())

// unprotected routes
app.use(swaggerRouter, loginRouter)
// protected routes
app.use(keycloak.protect(), cors(corsOptions), logoutRouter, userRouter, homeRouter, resourceRouter, reservationRouter)
// admin-only routes
app.use(keycloak.protect('realm:admin'), cors(corsOptions), adminRouter)

export default app