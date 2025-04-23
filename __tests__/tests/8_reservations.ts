import request from "supertest"
import app from "../../app"
import {getUserToken} from "../../utils/keycloakRequests"
import querystring from "querystring"
import {PrismaClient} from "@prisma/client"

const prisma = new PrismaClient()

const reservations = () => describe("CRUD reservations", () => {
    test("Create reservation for normal user", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let resource = await prisma.resource.findFirst({where: {resourceName: "Admin user's resource"}, select: {resourceID: true}})
        if (!resource) {throw "NAMED RESOURCE NOT FOUND"}
        let resourceID = resource.resourceID
        const response = await request(app)
            .post("/v1/reservations")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceID: resourceID,
                startTime: "2025-02-04T12:00:00.000+02:00",
                endTime: "2025-02-04T12:30:00.000+02:00"
            }))
        expect(response.statusCode).toBe(201)
    })
    test("Create reservation for admin user", async () => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        let resource = await prisma.resource.findFirst({where: {resourceName: "Admin user's resource"}, select: {resourceID: true}})
        if (!resource) {throw "NAMED RESOURCE NOT FOUND"}
        let resourceID = resource.resourceID
        const response = await request(app)
            .post("/v1/reservations")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceID: resourceID,
                startTime: "2025-02-04T12:30:00.000+02:00",
                endTime: "2025-02-04T13:00:00.000+02:00"
            }))
        expect(response.statusCode).toBe(201)
    })
    test("Attempt to create a reservation with no resource", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .post("/v1/reservations")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                startTime: "2025-02-04T12:00:00.000+02:00",
                endTime: "2025-02-04T12:30:00.000+02:00"
            }))
        expect(response.statusCode).toBe(400)
    })
    test("Attempt to create a reservation with invalid times", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let resource = await prisma.resource.findFirst({where: {resourceName: "Admin user's resource"}, select: {resourceID: true}})
        if (!resource) {throw "NAMED RESOURCE NOT FOUND"}
        let resourceID = resource.resourceID
        const response = await request(app)
            .post("/v1/reservations")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceID: resourceID,
                startTime: "2025-02-30T12:00:00.000+02:00",
                endTime: "2025-02-30T12:30:00.000+02:00"
            }))
        expect(response.statusCode).toBe(400)
    })
    test("Attempt to create a reservation with flipped times", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let resource = await prisma.resource.findFirst({where: {resourceName: "Admin user's resource"}, select: {resourceID: true}})
        if (!resource) {throw "NAMED RESOURCE NOT FOUND"}
        let resourceID = resource.resourceID
        const response = await request(app)
            .post("/v1/reservations")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceID: resourceID,
                startTime: "2025-02-04T12:30:00.000+02:00",
                endTime: "2025-02-04T12:00:00.000+02:00"
            }))
        expect(response.statusCode).toBe(400)
    })
    test("Attempt to create an overlapping reservation", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let resource = await prisma.resource.findFirst({where: {resourceName: "Admin user's resource"}, select: {resourceID: true}})
        if (!resource) {throw "NAMED RESOURCE NOT FOUND"}
        let resourceID = resource.resourceID
        const response = await request(app)
            .post("/v1/reservations")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceID: resourceID,
                startTime: "2025-02-04T12:15:00.000+02:00",
                endTime: "2025-02-04T14:00:00.000+02:00"
            }))
        expect(response.statusCode).toBe(409)
    })
    test("Attempt to create a reservation for inexistent resource", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .post("/v1/reservations")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceID: "fakeID",
                startTime: "2025-02-04T12:00:00.000+02:00",
                endTime: "2025-02-04T12:30:00.000+02:00"
            }))
        expect(response.statusCode).toBe(404)
    })
    test("View reservations", async() => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .get("/v1/reservations/")
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(200);
    })
    test("View single reservation by ID", async() => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let user = await prisma.user.findUnique({where: {userName: 'autotestuser'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        let reservation = await prisma.reservation.findFirst({where: {userID: userID}, select: {reservationID: true}})
        if (!reservation) {throw "NAMED RESOURCE NOT FOUND"}
        let reservationID = reservation.reservationID
        const response = await request(app)
            .get(`/v1/reservations/${reservationID}`)
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(200);
    })
    test("Attempt to view single reservation by inexistent ID", async() => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .get(`/v1/reservations/${userToken}`)
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(404);
    })
    test("Attempt to update a reservation by inexistent ID", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .patch(`/v1/reservations/fakeID`)
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceID: 'irrelevant',
                startTime: "2025-02-03T12:30:00.000+02:00",
                endTime: "2025-02-03T13:00:00.000+02:00"
            }))
        expect(response.statusCode).toBe(404);
    })
    test("Attempt to update admin user's resource as normal user", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let resource = await prisma.resource.findFirst({where: {resourceName: "Admin user's resource"}, select: {resourceID: true}})
        if (!resource) {throw "NAMED RESOURCE NOT FOUND"}
        let resourceID = resource.resourceID
        let user = await prisma.user.findUnique({where: {userName: 'autotestadmin'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        let reservation = await prisma.reservation.findFirst({where: {userID: userID}, select: {reservationID: true}})
        if (!reservation) {throw "NAMED RESOURCE NOT FOUND"}
        let reservationID = reservation.reservationID
        const response = await request(app)
            .patch(`/v1/reservations/${reservationID}`)
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceID: resourceID,
                startTime: "2025-02-03T12:00:00.000+02:00",
                endTime: "2025-02-03T12:30:00.000+02:00"
            }))
        expect(response.statusCode).toBe(403);
    })
    test("Update normal user's reservation as an admin user", async () => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        let resource = await prisma.resource.findFirst({where: {resourceName: "Admin user's resource"}, select: {resourceID: true}})
        if (!resource) {throw "NAMED RESOURCE NOT FOUND"}
        let resourceID = resource.resourceID
        let user = await prisma.user.findUnique({where: {userName: 'autotestuser'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        let reservation = await prisma.reservation.findFirst({where: {userID: userID}, select: {reservationID: true}})
        if (!reservation) {throw "NAMED RESOURCE NOT FOUND"}
        let reservationID = reservation.reservationID
        const response = await request(app)
            .patch(`/v1/reservations/${reservationID}`)
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceID: resourceID,
                startTime: "2025-02-03T12:00:00.000+02:00",
                endTime: "2025-02-03T12:30:00.000+02:00"
            }))
        expect(response.statusCode).toBe(200);
    })
    test("Attempt to delete a reservation by inexistent ID", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .delete(`/v1/reservations/fakeID`)
            .set({
                Authorization: `Bearer ${userToken}`,
            })
        expect(response.statusCode).toBe(404);
    })
    test("Attempt to delete admin user's reservation as normal user", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let user = await prisma.user.findUnique({where: {userName: 'autotestadmin'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        let reservation = await prisma.reservation.findFirst({where: {userID: userID}, select: {reservationID: true}})
        if (!reservation) {throw "NAMED RESOURCE NOT FOUND"}
        let reservationID = reservation.reservationID
        const response = await request(app)
            .delete(`/v1/reservations/${reservationID}`)
            .set({
                Authorization: `Bearer ${userToken}`,
            })
        expect(response.statusCode).toBe(403);
    })
    test("Delete normal user's resource as admin user", async () => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        let user = await prisma.user.findUnique({where: {userName: 'autotestuser'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        let reservation = await prisma.reservation.findFirst({where: {userID: userID}, select: {reservationID: true}})
        if (!reservation) {throw "NAMED RESOURCE NOT FOUND"}
        let reservationID = reservation.reservationID
        const response = await request(app)
            .delete(`/v1/reservations/${reservationID}`)
            .set({
                Authorization: `Bearer ${userToken}`,
            })
        expect(response.statusCode).toBe(200);
    })
})

export default reservations