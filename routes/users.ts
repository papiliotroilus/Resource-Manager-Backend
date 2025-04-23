import express from 'express'
import { PrismaClient } from '@prisma/client'
import handleError from '../utils/errorHandler'
import { refreshUsers } from '../utils/keycloakRequests'
import validateQuery from "../utils/validateQuery";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /v1/users/:
 *   get:
 *     summary: Get a list of all users (can take queries)
 *     tags:
 *     - Users
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
 *     - name: size
 *       in: query
 *       description: Number of users per page
 *       schema:
 *         type: integer
 *         minimum: 1
 *     - name: page
 *       in: query
 *       description: Page number to retrieve
 *       schema:
 *         type: integer
 *         minimum: 1
 *     - name: user
 *       in: query
 *       description: Text by which to filter users
 *       schema:
 *         type: string
 *     - name: col
 *       in: query
 *       description: Column to sort by (default is `userName`)
 *       schema:
 *         type: string
 *         enum: [userName]
 *     - name: dir
 *       in: query
 *       description: Sorting direction (`asc` or `desc`, default is `asc`)
 *       schema:
 *         type: string
 *         enum: [asc, desc]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pageUsers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userID:
 *                         type: string
 *                         description: User's ID
 *                       userName:
 *                         type: string
 *                         description: User's name
 *                       _count:
 *                         type: object
 *                         properties:
 *                           resources:
 *                             type: integer
 *                             description: Count of user's resources
 *                           reservations:
 *                             type: integer
 *                             description: Count of user's reservations
 *                 totalUsers:
 *                   type: integer
 *                   description: Count of users matching filter criteria
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       400:
 *         description: Query parameters invalid
 */
router.get('/v1/users/', async (req: express.Request, res:express.Response) => {
    try {
        await (refreshUsers())
        let queryParams = validateQuery(req, ['userName', 'resourceCount', 'reservationCount'])
        let sortOrder: { [p: string]: string | {[p: string]: string} } = {[queryParams.sortCol]: queryParams.sortDir}
        if (queryParams.sortCol === 'resourceCount') {
            sortOrder = {resources: {_count: queryParams.sortDir}}
        }
        if (queryParams.sortCol === 'reservationCount') {
            sortOrder = {reservations: {_count: queryParams.sortDir}}
        }
        let [pageUsers, totalUsers] = await prisma.$transaction([
            prisma.user.findMany({
                where: {
                    userName: {
                        contains: queryParams.userName,
                    },
                },
                select: {
                    userID: true, userName: true,
                    _count: {
                        select: {resources: true, reservations: true}
                    },
                },
                orderBy: sortOrder,
                take: queryParams.pageSize,
                skip: queryParams.skip
            }),
            prisma.user.count({
                where: {
                    userName: {
                        contains: queryParams.userName,
                    },
                }
            })
        ])
        res.status(200).send({pageUsers, totalUsers})
    } catch (error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/users/{userID}:
 *   get:
 *     summary: Get details of user by ID, including first 100 resources by popularity and first 100 future reservations
 *     tags:
 *     - Users
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
 *     - name: userID
 *       required: true
 *       in: path
 *       schema:
 *         type: string
 *       description: ID of the user to query
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userID:
 *                   type: string
 *                   description: User's ID
 *                 userName:
 *                   type: string
 *                   description: User's name
 *                 _count:
 *                   type: object
 *                   properties:
 *                     resources:
 *                       type: integer
 *                       description: Count of user's resources
 *                     reservations:
 *                       type: integer
 *                       description: Count of user's reservations
 *                 resources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       resourceID:
 *                         type: string
 *                         description: Resource's ID
 *                       resourceName:
 *                         type: string
 *                         format: Date
 *                         description: Resource's name
 *                       description:
 *                         type: string
 *                         format: Date
 *                         description: Resource's descripiton
 *                       _count:
 *                         type: object
 *                         properties:
 *                           resources:
 *                             type: integer
 *                             description: Count of resource's reservations
 *                     reservations:
 *                       type: integer
 *                       description: Count of user's reservations
 *                 reservations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       reservationID:
 *                         type: string
 *                         description: Reservation's ID
 *                       startTime:
 *                         type: string
 *                         format: Date
 *                         description: Reservation's start time
 *                       endTime:
 *                         type: string
 *                         format: Date
 *                         description: Reservation's end time
 *                       reservedResource:
 *                         type: object
 *                         properties:
 *                           resourceID:
 *                             type: string
 *                             description: Reserved resource's ID
 *                           resourceName:
 *                             type: string
 *                             description: Reserved resource's name
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       404:
 *         description: User not found
 */
router.get('/v1/users/:userID', async (req:express.Request, res:express.Response) => {
    await refreshUsers()
    try {
        let {userID} = req.params
        await (refreshUsers())
        if (await prisma.user.count({where: {userID: userID}}) === 0) {
            throw "Code 404 User not found"
        }
        let specificUser = await prisma.user.findUnique({
            where: {userID: userID},
            select: {
                userID: true, userName: true,
                _count: {
                    select: {resources: true, reservations: true}
                },
                resources: {
                    select: {
                        resourceID: true,
                        resourceName: true,
                        description: true,
                        _count: {
                            select: {reservations: true}
                        }
                    },
                    orderBy: {reservations: {_count: 'asc'} },
                    take: 100
                },
                reservations: {
                    select: {
                        reservationID: true, startTime: true, endTime: true,
                        reservedResource: {
                            select: {resourceID: true, resourceName: true}
                        }
                    },
                    where: {
                        endTime: {
                            gte: new Date()
                        }
                    },
                    orderBy: {startTime: 'asc'},
                    take: 100
                },
            }
        })
        res.status(200).send(specificUser)
    } catch (error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/whoami:
 *   get:
 *     summary: Get own details from token, including first 100 resources by popularity and first 100 future reservations
 *     tags:
 *     - Users
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
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userID:
 *                   type: string
 *                   description: Own ID
 *                 userName:
 *                   type: string
 *                   description: Own name
 *                 _count:
 *                   type: object
 *                   properties:
 *                     resources:
 *                       type: integer
 *                       description: Count of own resources
 *                     reservations:
 *                       type: integer
 *                       description: Count of own reservations
 *                 reservations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       reservationID:
 *                         type: string
 *                         description: Reservation's ID
 *                       startTime:
 *                         type: string
 *                         format: Date
 *                         description: Reservation's start time
 *                       endTime:
 *                         type: string
 *                         format: Date
 *                         description: Reservation's end time
 *                       reservedResource:
 *                         type: object
 *                         properties:
 *                           resourceID:
 *                             type: string
 *                             description: Reserved resource's ID
 *                           resourceName:
 *                             type: string
 *                             description: Reserved resource's name
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       404:
 *         description: User not found
 */
router.get('/v1/whoami', async (req: express.Request, res:express.Response) => {
    try {
        // @ts-ignore because TypeScript doesn't know Request can contain Keycloak authentication
        let userName = req.kauth.grant.access_token.content.preferred_username
        await (refreshUsers())
        let self = await prisma.user.findUnique({
            where: {userName: userName},
            select: {
                userID: true, userName: true,
                _count: {
                    select: {resources: true, reservations: true}
                },
                resources: {
                    select: {resourceID: true, resourceName: true},
                    orderBy: {resourceName: 'asc'},
                    take: 100
                },
                reservations: {
                    select: {
                        reservationID: true, startTime: true, endTime: true,
                        reservedResource: {
                            select: {resourceID: true, resourceName: true}
                        }
                    },
                    orderBy: {startTime: 'asc'},
                    take: 100
                },
            }
        })
        res.status(200).send(self)
    } catch(error) {
        handleError(error, res)
    }
})

export default router