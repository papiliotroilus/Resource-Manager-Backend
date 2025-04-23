import express from 'express'
import dotenv from 'dotenv'

dotenv.config()
const router = express.Router()

/**
 * @swagger
 * /v1/logout:
 *   get:
 *     summary: Redirect to Keycloak for logout
 *     tags:
 *     - Authentication
 *     security:
 *     - bearerAuth: []
 *     parameters:
 *     - name: Authorization
 *       required: true
 *       in: header
 *       description: Bearer token with user access
 *       schema:
 *         type: string
 *         example: "Bearer {{user_access_token}}"
 *     responses:
 *       302:
 *         description: Redirects to post-logout URL
 */
router.get('/v1/logout', async (req: express.Request, res:express.Response) => {
    const redirectURL = encodeURIComponent((process.env.LOGOUT_URL || ''))
    let logoutURL = `${process.env.KEYCLOAK_URL}realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout?redirect_uri=${redirectURL}`
    req.session.destroy((err) => {
        if (err) {
            console.log('Failed to destroy session:', err)
            return res.status(500).send('Failed to log out')
        }
        res.redirect(logoutURL)
    })
})

export default router