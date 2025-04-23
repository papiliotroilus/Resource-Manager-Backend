import request from "supertest"
import app from "../../app"
import {getUserToken} from "../../utils/keycloakRequests"
import querystring from "querystring"
import {PrismaClient} from "@prisma/client"

const prisma = new PrismaClient()

const resources = () => describe("CRUD resources", () => {
    test("Create resource owned by normal user with name and description", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .post("/v1/resources")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceName: "Normal user's resource",
                description: "This is the resource owned by normal user",
            }))
        expect(response.statusCode).toBe(201)
    })
    test("Attempt to create a resource with no name", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .post("/v1/resources")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                description: "This is the resource with only a description",
            }))
        expect(response.statusCode).toBe(400);
    })
    test("Attempt to create a resource with an invalid name", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .post("/v1/resources")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceName: userToken,
                description: "This is a resource with an overly long name"
            }))
        expect(response.statusCode).toBe(400);
    })
    test("Attempt to create a resource with an invalid description", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let bigDescription = userToken.toString()
        const response = await request(app)
            .post("/v1/resources")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceName: "Overly big description",
                description: bigDescription
            }))
        expect(response.statusCode).toBe(400);
    })
    test("Create resource owned by admin user with name only", async () => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        const response = await request(app)
            .post("/v1/resources")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceName: "Admin user's resource",
            }))
        expect(response.statusCode).toBe(201);
    })
    test("View resources", async() => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .get("/v1/resources/")
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(200);
    })
    test("View single resource by ID", async() => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let resource = await prisma.resource.findFirst({where: {resourceName: "Admin user's resource"}, select: {resourceID: true}})
        if (!resource) {throw "NAMED RESOURCE NOT FOUND"}
        let resourceID = resource.resourceID
        const response = await request(app)
            .get(`/v1/resources/${resourceID}`)
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(200);
    })
    test("Attempt to view single resource by inexistent ID", async() => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .get(`/v1/resources/fakeID`)
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(404);
    })
    test("Attempt to update a resource by inexistent ID", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .patch(`/v1/resources/fakeID`)
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceName: "Updated inexistent resource",
                description: "This is the updated inexistent resource",
            }))
        expect(response.statusCode).toBe(404);
    })
    test("Attempt to update admin user's resource as normal user", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let resource = await prisma.resource.findFirst({where: {resourceName: "Admin user's resource"}, select: {resourceID: true}})
        if (!resource) {throw "NAMED RESOURCE NOT FOUND"}
        let resourceID = resource.resourceID
        const response = await request(app)
            .patch(`/v1/resources/${resourceID}`)
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceName: "Updated admin user's resource",
                description: "This is the updated resource owned by admin user",
            }))
        expect(response.statusCode).toBe(403);
    })
    test("Update normal user's resource as admin user", async () => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        let resource = await prisma.resource.findFirst({where: {resourceName: "Normal user's resource"}, select: {resourceID: true}})
        if (!resource) {throw "NAMED RESOURCE NOT FOUND"}
        let resourceID = resource.resourceID
        const response = await request(app)
            .patch(`/v1/resources/${resourceID}`)
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                resourceName: "Updated normal user's resource",
                description: "This is the updated resource owned by normal user",
            }))
        expect(response.statusCode).toBe(200);
    })
    test("Attempt to delete a resource by inexistent ID", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .delete(`/v1/resources/fakeID`)
            .set({
                Authorization: `Bearer ${userToken}`,
            })
        expect(response.statusCode).toBe(404);
    })
    test("Attempt to delete admin user's resource as normal user", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let resource = await prisma.resource.findFirst({where: {resourceName: "Admin user's resource"}, select: {resourceID: true}})
        if (!resource) {throw "NAMED RESOURCE NOT FOUND"}
        let resourceID = resource.resourceID
        const response = await request(app)
            .delete(`/v1/resources/${resourceID}`)
            .set({
                Authorization: `Bearer ${userToken}`,
            })
        expect(response.statusCode).toBe(403);
    })
    test("Delete normal user's resource as admin user", async () => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        let resource = await prisma.resource.findFirst({where: {resourceName: "Updated normal user's resource"}, select: {resourceID: true}})
        if (!resource) {throw "NAMED RESOURCE NOT FOUND"}
        let resourceID = resource.resourceID
        const response = await request(app)
            .delete(`/v1/resources/${resourceID}`)
            .set({
                Authorization: `Bearer ${userToken}`,
            })
        expect(response.statusCode).toBe(200);
    })
})

export default resources