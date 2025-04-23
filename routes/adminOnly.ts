import express from 'express'
import handleError from '../utils/errorHandler'
import {deleteUser, getUserRole, changeUserRole} from "../utils/keycloakRequests"

const router = express.Router();

/**
 * @swagger
 * /v1/users/role/{userID}:
 *   get:
 *     summary: Get user role by ID
 *     tags:
 *     - Admin Only
 *     security:
 *     - bearerAuth: []
 *     parameters:
 *     - name: Authorization
 *       required: true
 *       in: header
 *       description: Bearer token with admin access
 *       schema:
 *         type: string
 *         example: "Bearer {{admin_access_token}}"
 *     - name: userID
 *       required: true
 *       in: path
 *       description: ID of the user to query
 *       schema:
 *         type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: "admin"
 *       403:
 *         description: Not logged in as admin
 *       404:
 *         description: User not found
 */
router.get('/v1/users/role/:userID', async (req:express.Request, res:express.Response) => {
    try {
        let {userID} = req.params
        let userRole = await getUserRole(userID)
        res.status(200).send(userRole)
    } catch (error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/users/role/{userID}:
 *   patch:
 *     summary: Change user role by ID
 *     tags:
 *     - Admin Only
 *     security:
 *     - bearerAuth: []
 *     parameters:
 *     - name: Authorization
 *       required: true
 *       in: header
 *       description: Bearer token with admin access
 *       schema:
 *         type: string
 *         example: "Bearer {{admin_access_token}}"
 *     - name: userID
 *       required: true
 *       in: path
 *       description: ID of the user to promote or demote
 *       schema:
 *         type: string
 *     requestBody:
 *       required: true
 *       content:
 *         content:
 *           text:
 *             schema:
 *               type: string
 *               description: The new role to assign to the user
 *               example: "admin"
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               description: The user's new role
 *               example: "admin"
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       400:
 *         description: Given role is invalid
 *       403:
 *         description: Not logged in as admin
 *       404:
 *         description: User not found
 */
router.patch('/v1/users/role/:userID', async (req:express.Request, res:express.Response) => {
    try {
        let {userID} = req.params
        let {role} = req.body
        await changeUserRole(userID, role)
        res.status(200).send(await getUserRole(userID))
    } catch (error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/users/{userID}:
 *   delete:
 *     summary: Delete a user by ID
 *     tags:
 *     - Admin Only
 *     security:
 *     - bearerAuth: []
 *     parameters:
 *     - name: Authorization
 *       required: true
 *       in: header
 *       description: Bearer token with admin access
 *       schema:
 *         type: string
 *         example: "Bearer {{admin_access_token}}"
 *     - name: userID
 *       required: true
 *       in: path
 *       description: ID of the user to delete
 *       schema:
 *         type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               description: ID of the user that was deleted
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       403:
 *         description: Not logged in as admin
 *       404:
 *         description: User not found
 */
router.delete('/v1/users/:userID', async (req:express.Request, res:express.Response) => {
    try {
        let {userID} = req.params
        await deleteUser(userID)
        res.status(200).send(userID)
    } catch (error) {
        handleError(error, res)
    }
})

export default router