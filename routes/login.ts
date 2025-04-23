import express from 'express'
import {getUserToken, createUser} from '../utils/keycloakRequests'
import handleError from "../utils/errorHandler";

const router = express.Router()

/**
 * @swagger
 * /v1/login:
 *   get:
 *     summary: Redirect to homepage for login via Keycloak
 *     tags:
 *     - Authentication
 *     responses:
 *       302:
 *         description: Redirects to Keycloak login
 */
router.get('/v1/login', async (req: express.Request, res:express.Response) => {
    res.status(302).redirect("/")
})

/**
 * @swagger
 * /v1/login:
 *   post:
 *     summary: Return access token for user with given username and password
 *     tags:
 *     - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *             - username
 *             - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: User's name
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Authenticated successfully, returns an access token.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Given credentials invalid
 */
router.post('/v1/login', async (req: express.Request, res:express.Response) => {
    try {
        let {username, password} = req.body
        if (typeof username !== 'string' || typeof password !== 'string') {
            throw "Code 400 Must provide username and password"
        }
        let accessToken = await getUserToken(username, password)
        res.status(200).send(accessToken)
    } catch(error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/register:
 *   get:
 *     summary: Redirect to homepage for registration via Keycloak
 *     tags:
 *     - Authentication
 *     responses:
 *       302:
 *         description: Redirects to Keycloak login
 */
router.get('/v1/register', async (req: express.Request, res:express.Response) => {
    res.status(302).redirect("/")
})

/**
 * @swagger
 * /v1/register:
 *   post:
 *     summary: Creates a new user with given username, password, and email
 *     tags:
 *     - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *             - email
 *             - username
 *             - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: New user's email address
 *               username:
 *                 type: string
 *                 description: New user's username
 *               password:
 *                 type: string
 *                 format: password
 *                 description: New user's password
 *     responses:
 *       201:
 *         description: OK
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid username, password, or email
 *       409:
 *         description: Username or email are already taken
 */
router.post('/v1/register', async (req: express.Request, res:express.Response) => {
    try {
        let {email, username, password} = req.body
        await createUser(email, username, password)
        res.status(201).send(`User ${username.toLowerCase()} created successfully`)
    } catch(error) {
        handleError(error, res)
    }
})

export default router