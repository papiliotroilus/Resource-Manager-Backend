/**
 * @swagger
 * components:
 *   schemas:
 *     ResourceInput:
 *       type: object
 *       properties:
 *         resourceName:
 *           type: string
 *           description: Name of the resource. Must be a string between 1 and 30 characters long.
 *           example: new resource
 *         description:
 *           type: string?
 *           description: Description of the resource. Can be null.
 *           example: new resource description
 *     ResourceOutput:
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           resourceID:
 *             type: string
 *             description: Resource's ID
 *           resourceName:
 *             type: string
 *             description: Resource's name
 *           owner:
 *             type: object
 *             properties:
 *               userID:
 *                 type: string
 *                 description: Resource owner's ID
 *               userName:
 *                 type: string
 *                 description: Resource owner's name
 *           _count:
 *             type: object
 *             properties:
 *               reservations:
 *                 type: integer
 *                 description: Count of reservations for this resource
 */

import express from 'express'
import { PrismaClient } from '@prisma/client';
import handleError from '../utils/errorHandler'
import validateQuery from "../utils/validateQuery";

const router = express.Router();
const prisma = new PrismaClient();

async function validateUser(req:express.Request) {
    let {resourceID} = req.params
    let owner = await prisma.resource.findUnique({
        where: {resourceID: resourceID}, select: {owner: {select: {userName: true}}}
    })
    // @ts-ignore because TypeScript doesn't know Request can contain Keycloak authentication
    let userToken = req.kauth.grant.access_token.content
    let userName = userToken.preferred_username
    let userRoles = userToken.realm_access.roles
    // @ts-ignore because resources can't not have an owner
    let ownerName = owner.owner.userName
    if (userName !== ownerName && !userRoles.some((role: string) => role === 'admin')) {
        throw "Code 403 Resources can only be edited by their owner or by admins"
    }
}
async function validateResource(req:express.Request) {
    let {resourceName, description} = req.body
    if (!resourceName) {
        throw "Code 400 Resource must have a name"
    }
    if (resourceName.length < 1 || resourceName.length > 30) {
        throw "Code 400 Resource name must be between 1 and 30 characters long"
    }
    console.log(`The description ${description} is of the type ${typeof description}`)
    if (typeof description === "string" && description.length > 280) {
        throw "Code 400 Resource description must be at most 280 characters long"
    }
}

/**
 * @swagger
 * /v1/resources/:
 *   post:
 *     summary: Create a new resource
 *     tags:
 *     - Resources
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResourceInput'
 *     responses:
 *       201:
 *         description: Resource created
 *         content:
 *           text:
 *             schema:
 *               type: string
 *               description: ID of the created resource
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       400:
 *         description: Resource name or description are invalid
 */
router.post('/v1/resources/', async (req:express.Request, res:express.Response) => {
    try {
        let {resourceName, description} = req.body
        await validateResource(req)
        // @ts-ignore because TypeScript doesn't know Request can contain Keycloak authentication
        let userName = req.kauth.grant.access_token.content.preferred_username
        await prisma.user.upsert({
            where: {userName: userName},
            update: {userName: userName},
            create: {userName: userName},
        });
        let owner = await prisma.user.findUnique({where: {userName: userName}})
        let newResource = await prisma.resource.create({
            // @ts-ignore Because resources can't not have an owner
            data: {userID: owner.userID, resourceName: resourceName, description: description}
        })
            res.status(201).send(newResource.resourceID)
    } catch (error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/resources/:
 *   get:
 *     summary: Get a list of resources (can take queries)
 *     tags:
 *     - Resources
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
 *       description: Number of resources per page
 *       schema:
 *         type: integer
 *         minimum: 1
 *     - name: page
 *       in: query
 *       description: Page number to retrieve
 *       schema:
 *         type: integer
 *         minimum: 1
 *     - name: userID
 *       in: query
 *       description: Exact ID of owner
 *       schema:
 *         type: string
 *     - name: user
 *       in: query
 *       description: Text by which to filter owners
 *       schema:
 *         type: string
 *     - name: resource
 *       in: query
 *       description: Text by which to filter resources
 *       schema:
 *         type: string
 *     - name: description
 *       in: query
 *       description: Text by which to filter descriptions
 *       schema:
 *         type: string
 *     - name: col
 *       in: query
 *       description: Column to sort by (default is `resourceName`).
 *       schema:
 *         type: string
 *         enum: [resourceName, reservationCount]
 *     - name: dir
 *       in: query
 *       description: Sorting direction (`asc` or `desc`, default is `asc`).
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
 *                 pageResources:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ResourceOutput'
 *                 totalResources:
 *                   type: integer
 *                   description: Count of resources matching filter criteria
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       400:
 *         description: Query parameters invalid
 */
router.get('/v1/resources/', async (req:express.Request, res:express.Response) => {
    try {
        let queryParams = validateQuery(req, ['resourceName', 'reservationCount'])
        let sortOrder: { [p: string]: string | {[p: string]: string} } = {[queryParams.sortCol]: queryParams.sortDir}
        if (queryParams.sortCol === 'reservationCount') {
            sortOrder = {reservations: {_count: queryParams.sortDir}}
        }
        let [pageResources, totalResources] = await prisma.$transaction([
            prisma.resource.findMany({
                where: {
                    resourceName: {
                        contains: queryParams.resourceName
                    },
                    description: {
                        contains: queryParams.description
                    },
                    owner: {
                        userName: {
                            contains: queryParams.userName
                        },
                        userID: queryParams.userID
                    }
                },
                select: {
                    resourceID: true, resourceName: true, description: true,
                    owner: {
                        select: {
                            userID: true, userName: true
                        }
                    },
                    _count: {
                        select: {reservations: true}
                    }
                },
                orderBy: sortOrder,
                take: queryParams.pageSize,
                skip: queryParams.skip
            }),
            prisma.resource.count({
                where: {
                    resourceName: {
                        contains: queryParams.resourceName
                    },
                    owner: {
                        userName: {
                            contains: queryParams.userName
                        },
                        userID: queryParams.userID
                    }
                }
            })
        ])
        res.status(200).send({pageResources, totalResources})
    } catch (error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/resources/{resourceID}:
 *   get:
 *     summary: Get details of resource by ID, including first 100 future reservations
 *     tags:
 *     - Resources
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
 *     - name: resourceID
 *       required: true
 *       in: path
 *       schema:
 *         type: string
 *       description: ID of the resource to query.
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resourceID:
 *                   type: string
 *                   description: Resource's ID
 *                 resourceName:
 *                   type: string
 *                   description: Resource's name
 *                 description:
 *                   type: string
 *                   nullable: true
 *                   description: Resource's description (optional)
 *                 owner:
 *                   type: object
 *                   properties:
 *                     userID:
 *                       type: string
 *                       description: Resource owner's ID
 *                     userName:
 *                       type: string
 *                       description: Resource owner's name
 *                 _count:
 *                   type: object
 *                   properties:
 *                     reservations:
 *                       type: integer
 *                       description: Count of reservations for this resource
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
 *                         format: date-time
 *                         description: Reservation's start time
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                         description: Reservation's end time
 *                       reservee:
 *                         type: object
 *                         properties:
 *                           userID:
 *                             type: string
 *                             description: Reservee's user ID
 *                           userName:
 *                             type: string
 *                             description: Reservee's name
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       404:
 *         description: Resource not found
 */
router.get('/v1/resources/:resourceID', async (req:express.Request, res:express.Response) => {
    try {
        let {resourceID} = req.params
        if (await prisma.resource.count({where: {resourceID: resourceID}}) === 0) {
            throw "Code 404 Resource not found"
        }
        let specificResource = await prisma.resource.findUnique({
            where: {resourceID: resourceID},
            select: {
                resourceID: true, resourceName: true, description: true,
                owner: {
                    select: {userID: true, userName: true}
                },
                _count: {
                    select: {reservations: true}
                },
                reservations: {
                    select: {
                        reservationID: true, startTime: true, endTime: true,
                        reservee: {
                            select: {userID: true, userName: true}
                        }
                    },
                    where: {
                        endTime: {
                            gte: new Date()
                        }
                    },
                    orderBy: {startTime: 'asc'},
                    take: 100
                }
            },
        })
        res.status(200).send(specificResource)
    } catch (error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/resources/{resourceID}:
 *   patch:
 *     summary: Update resource
 *     tags:
 *     - Resources
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
 *     - name: resourceID
 *       required: true
 *       in: path
 *       schema:
 *         type: string
 *       description: ID of the resource to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResourceInput'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           text:
 *             schema:
 *               type: string
 *               description: ID of the updated resource
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       400:
 *         description: Resource name or description are invalid
 *       403:
 *         description: User unauthorised
 *       404:
 *         description: Resource not found
 */
router.patch('/v1/resources/:resourceID', async (req:express.Request, res:express.Response) => {
    try {
        let {resourceID} = req.params
        let {resourceName, description} = req.body
        if (await prisma.resource.count({where: {resourceID: resourceID}}) === 0) {
            throw "Code 404 Resource not found"
        }
        await validateUser(req)
        await validateResource(req)
        let updatedResource = await prisma.resource.update({
            where: {resourceID: resourceID},
            data: {resourceName: resourceName, description: description}
        })
        res.status(200).send(updatedResource.resourceID)
    } catch (error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/resources/{resourceID}:
 *   delete:
 *     summary: Delete resource
 *     tags:
 *     - Resources
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
 *     - name: resourceID
 *       required: true
 *       in: path
 *       schema:
 *         type: string
 *       description: ID of the resource to delete.
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           text:
 *             schema:
 *               type: string
 *               description: ID of the deleted resource
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       403:
 *         description: User unauthorised
 *       404:
 *         description: Resource not found
 */
router.delete('/v1/resources/:resourceID', async (req:express.Request, res:express.Response) => {
    try {
        let {resourceID} = req.params
        if (await prisma.resource.count({where: {resourceID: resourceID}}) === 0) {
            throw "Code 404 Resource not found"
        }
        await validateUser(req)
        await prisma.reservation.deleteMany({
            where: {resourceID: resourceID}
        })
        let deletedResource = await prisma.resource.delete({
            where: {resourceID: resourceID}
        })
        res.status(200).send(deletedResource.resourceID)
    } catch (error) {
        handleError(error, res)
    }
})

export default router