/**
 * @swagger
 * components:
 *   schemas:
 *     ReservationInput:
 *       type: object
 *       properties:
 *         resourceID:
 *           type: string
 *           description: ID of resource to reserve
 *         startTime:
 *           type: Date
 *           description: Time when the reservation starts.
 *           example: 2025-01-31T12:00:00.000+02:00
 *         endTime:
 *           type: Date
 *           description: Time when the reservation ends.
 *           example: 2025-01-31T13:00:00.000+02:00
 *     ReservationOutput:
 *       type: object
 *       properties:
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Reservation's start time
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: Reservation's end time.
 *         reservationID:
 *           type: string
 *           description: Reservation's ID
 *         reservedResource:
 *           type: object
 *           properties:
 *             resourceID:
 *               type: string
 *               description: Reserved resource's ID
 *             resourceName:
 *               type: string
 *               description: Reserved resource's name
 *         reservee:
 *           type: object
 *           properties:
 *             userID:
 *               type: string
 *               description: Reservee's user ID
 *             userName:
 *               type: string
 *               description: Reservee's username
 */

import express from 'express'
import { PrismaClient } from '@prisma/client';
import { DateTime} from 'luxon'
import handleError from '../utils/errorHandler'
import validateQuery from "../utils/validateQuery";

const router = express.Router();
const prisma = new PrismaClient();

function checkDate(date: string) {
    return DateTime.fromISO(date).isValid
}
function checkOverlap(startTimeFirst: Date, endTimeFirst: Date, startTimeSecond: Date, endTimeSecond: Date) {
    let earlierEnd = endTimeFirst
    let latterStart = startTimeSecond
    if (new Date(startTimeFirst) > new Date(startTimeSecond)) {
        earlierEnd = endTimeSecond
        latterStart = startTimeFirst
    }
    return new Date(earlierEnd).getTime() - new Date(latterStart).getTime() > 0;
}
async function validateReservation(req: express.Request, reservationID?: string) {
    let {resourceID, startTime, endTime} = req.body
    if (!resourceID) {
        throw "Code 400 Must specify resource to reserve"
    }
    if (!checkDate(startTime) || !checkDate(endTime)) {
        throw "Code 400 Both start and end times must be valid dates"
    }
    if (startTime > endTime) {
        throw "Code 400 Start time must be before end time"
    }
    if (await prisma.resource.count({where: {resourceID: resourceID}}) === 0) {
        throw "Code 404 Resource not found"
    }
    let existingReservations = await prisma.reservation.findMany({
        where: {resourceID: resourceID, NOT: {reservationID: reservationID}},
        select: {reservationID: true, startTime: true, endTime: true},
    })
    for (let existingReservation of existingReservations) {
        if (checkOverlap(startTime, endTime, existingReservation.startTime, existingReservation.endTime)) {
            throw `Code 409 Overlap with reservation ${existingReservation.reservationID}`
        }
    }
}
async function validateUser(req: express.Request) {
    let {reservationID} = req.params
    let reservee = await prisma.reservation.findUnique({
        where: {reservationID: reservationID}, select: {reservee: {select: {userName: true}}}
    })
    // @ts-ignore because TypeScript doesn't know Request can contain Keycloak authentication
    let userToken = req.kauth.grant.access_token.content
    let userName = userToken.preferred_username
    let userRoles = userToken.realm_access.roles
    // @ts-ignore because reservations can't not have a reservee
    let reserveeName = reservee.reservee.userName
    if (userName !== reserveeName && !userRoles.some((role: string) => role === 'admin')) {
        throw "Code 403 Reservations can only be edited by their reservee or by admins"
    }
}

/**
 * @swagger
 * /v1/reservations/:
 *   post:
 *     summary: Create reservation
 *     tags:
 *     - Reservations
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
 *             $ref: '#/components/schemas/ReservationInput'
 *     responses:
 *       201:
 *         description: Reservation created
 *         content:
 *           text:
 *             schema:
 *               type: string
 *               description: ID of the created reservation
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       400:
 *         description: Reservation start time, end time, or resource ID are invalid
 *       409:
 *         description: Given time interval overlaps existing reservation for same resource
 *       404:
 *         description: Resource to reserve not found
 */
router.post('/v1/reservations/', async (req:express.Request, res:express.Response) => {
    try {
        let {resourceID, startTime, endTime} = req.body
        await validateReservation(req)
        // @ts-ignore because TypeScript doesn't know Request can contain Keycloak authentication
        let userName = req.kauth.grant.access_token.content.preferred_username
        await prisma.user.upsert({
            where: {userName: userName},
            update: {userName: userName},
            create: {userName: userName},
        });
        let reservee = await prisma.user.findUnique({where: {userName: userName}})
        let newReservation = await prisma.reservation.create({
            data: {
                // @ts-ignore because a reservation can't not have a reservee
                userID: reservee.userID, resourceID: resourceID, startTime: startTime, endTime: endTime
            }
        })
        res.status(201).send(newReservation.reservationID)
    } catch (error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/reservations/:
 *   get:
 *     summary: Get a list of reservations (can take queries)
 *     tags:
 *     - Reservations
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
 *       description: Number of reservations per page
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
 *       description: Exact ID of reservee
 *       schema:
 *         type: string
 *     - name: user
 *       in: query
 *       description: Text by which to filter reservees
 *       schema:
 *         type: string
 *     - name: userID
 *       in: query
 *       description: Exact ID of reserved resource
 *       schema:
 *         type: string
 *     - name: resource
 *       in: query
 *       description: Text by which to filter reserved resources
 *       schema:
 *         type: string
 *     - name: startsBefore
 *       in: query
 *       description: Date that reservations must start before
 *       schema:
 *         type: Date
 *     - name: startsAfter
 *       in: query
 *       description: Date that reservations must start before
 *       schema:
 *         type: Date
 *     - name: endsBefore
 *       in: query
 *       description: Date that reservations must end before
 *       schema:
 *         type: Date
 *     - name: endsBefore
 *       in: query
 *       description: Date that reservations must end after
 *       schema:
 *         type: Date
 *     - name: endsAfter
 *     - name: col
 *       in: query
 *       description: Column to sort by (default is `startTime`).
 *       schema:
 *         type: string
 *         enum: [startTime, endTime]
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
 *                 pageReservations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ReservationOutput'
 *                 totalReservations:
 *                   type: integer
 *                   description: Count of reservations matching filter criteria
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       400:
 *         description: Query parameters invalid
 */
router.get('/v1/reservations/', async (req: express.Request, res:express.Response) => {
    try {
        let queryParams = validateQuery(req, ["startTime", "endTime"])
        let [pageReservations, totalReservations] = await prisma.$transaction([
            prisma.reservation.findMany({
                where: {
                    reservedResource: {
                        resourceID: queryParams.resourceID,
                        resourceName: {
                            contains: queryParams.resourceName
                        }
                    },
                    reservee: {
                        userID: queryParams.userID,
                        userName: {
                            contains: queryParams.userName
                        }
                    },
                    startTime: {
                        lte: queryParams.startsBefore,
                        gte: queryParams.startsAfter
                    },
                    endTime: {
                        lte: queryParams.endsBefore,
                        gte: queryParams.endsAfter
                    }
                },
                select: {
                    reservationID: true, startTime: true, endTime: true,
                    reservedResource: {
                        select: {resourceID: true, resourceName: true}
                    },
                    reservee: {
                        select: {userID: true, userName: true}
                    }
                },
                orderBy: {[queryParams.sortCol]: queryParams.sortDir},
                take: queryParams.pageSize,
                skip: queryParams.skip
            }),
            prisma.reservation.count({
                where: {
                    reservedResource: {
                        resourceID: queryParams.resourceID,
                        resourceName: {
                            contains: queryParams.resourceName
                        }
                    },
                    reservee: {
                        userID: queryParams.userID,
                        userName: {
                            contains: queryParams.userName
                        }
                    },
                    startTime: {
                        lte: queryParams.startsBefore,
                        gte: queryParams.startsAfter
                    },
                    endTime: {
                        lte: queryParams.endsBefore,
                        gte: queryParams.endsAfter
                    }
                }
            })
        ])
        res.status(200).send({pageReservations, totalReservations})
    } catch (error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/reservations/{reservationID}:
 *   get:
 *     summary: Get details of reservation by ID
 *     tags:
 *     - Reservations
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
 *     - name: reservationID
 *       required: true
 *       in: path
 *       schema:
 *         type: string
 *       description: ID of the reservation to query.
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReservationOutput'
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       404:
 *         description: Reservation not found
 */
router.get('/v1/reservations/:reservationID', async (req:express.Request, res:express.Response) => {
    try {
        let {reservationID} = req.params
        if (await prisma.reservation.count({where: {reservationID: reservationID}}) === 0) {
            throw "Code 404 Error: Reservation not found"
        }
        let specificReservation = await prisma.reservation.findUnique({
            where: {reservationID: reservationID},
            select: {
                reservationID: true,
                startTime: true,
                endTime: true,
                reservedResource: {
                    select: {resourceID: true, resourceName: true}
                },
                reservee: {
                    select: {userID: true, userName: true}
                }
            }
        })
        res.status(200).send(specificReservation)
    } catch (error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/reservations/{reservationID}:
 *   patch:
 *     summary: Update reservation by ID
 *     tags:
 *     - Reservations
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
 *     - name: reservationID
 *       required: true
 *       in: path
 *       schema:
 *         type: string
 *       description: ID of the reservation to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservationInput'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           text:
 *             schema:
 *               type: string
 *               description: ID of the updated reservation
 *       302:
 *         description: Redirects to Keycloak login if not valid auth token given
 *       400:
 *         description: Reservation start time, end time, or resource ID are invalid
 *       403:
 *         description: User unauthorised
 *       404:
 *         description: Reservation not found
 *       409:
 *         description: Given time interval overlaps existing reservation for same resource
 */
router.patch('/v1/reservations/:reservationID', async (req:express.Request, res:express.Response) => {
    try {
        let {reservationID} = req.params
        let {startTime, endTime} = req.body
        if (await prisma.reservation.count({where: {reservationID: reservationID}}) === 0) {
            throw "Code 404 Reservation not found"
        }
        await validateUser(req)
        await validateReservation(req, reservationID)
        let updatedReservation = await prisma.reservation.update({
            where: {reservationID: reservationID},
            data: {startTime: startTime, endTime: endTime}
        })
        console.log(updatedReservation)
        res.status(200).send(updatedReservation.reservationID)
    } catch (error) {
        handleError(error, res)
    }
})

/**
 * @swagger
 * /v1/reservations/{reservationID}:
 *   delete:
 *     summary: Delete reservation by ID
 *     tags:
 *     - Reservations
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
 *     - name: reservationID
 *       required: true
 *       in: path
 *       schema:
 *         type: string
 *       description: ID of the reservation to delete.
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           text:
 *             schema:
 *               type: string
 *               description: ID of the deleted reservation
 *       403:
 *         description: User unauthorised
 *       404:
 *         description: Reservation not found
 */
router.delete('/v1/reservations/:reservationID', async (req:express.Request, res:express.Response) => {
    try {
        let {reservationID} = req.params
        if (await prisma.reservation.count({where: {reservationID: reservationID}}) === 0) {
            throw "Code 404 Reservation not found"
        }
        await validateUser(req)
        let deletedResource = await prisma.reservation.delete({
            where: {reservationID: reservationID}
        })
        res.status(200).send(deletedResource.reservationID)
    } catch (error) {
        handleError(error, res)
    }
})

export default router