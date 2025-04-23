import express from 'express'

const router = express.Router()

/* Display home page */
router.get('/', async (req: express.Request, res:express.Response) => {
    // @ts-ignore because TypeScript doesn't know Request can contain Keycloak authentication
    let username: string = req.kauth.grant.access_token.content.preferred_username
    res.status(200).send(`Welcome! You are logged in as ${username}`)
})

export default router