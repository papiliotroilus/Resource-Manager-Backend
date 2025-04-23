import request from "supertest"
import app from "../../app"
import {getUserToken} from "../../utils/keycloakRequests"
import querystring from "querystring"
import {PrismaClient} from "@prisma/client"

const prisma = new PrismaClient()

const adminOnly = () => describe("Admin-only actions", () => {
    test("Attempt to access admin-only endpoint as normal user", async() => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let user = await prisma.user.findUnique({where: {userName: 'autotestuser'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        const response = await request(app)
            .get(`/v1/users/role/${userID}`)
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(403);
    })
    test("View user role by ID", async() => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        let user = await prisma.user.findUnique({where: {userName: 'autotestuser'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        const response = await request(app)
            .get(`/v1/users/role/${userID}`)
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(200);
    })
    test("Attempt to view user role by inexistent ID", async() => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        const response = await request(app)
            .get(`/v1/users/role/fakeID`)
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(404);
    })
    test("Attempt to update a user's role by inexistent ID", async () => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        const response = await request(app)
            .patch(`/v1/users/role/fakeID`)
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                role: 'admin'
            }))
        expect(response.statusCode).toBe(404);
    })
    test("Attempt to change a user by ID to inexistent role", async () => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        let user = await prisma.user.findUnique({where: {userName: 'autotestuser'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        const response = await request(app)
            .patch(`/v1/users/role/${userID}`)
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                role: 'neither'
            }))
        expect(response.statusCode).toBe(400);
    })
    test("Promote a user by ID", async () => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        let user = await prisma.user.findUnique({where: {userName: 'autotestuser'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        const response = await request(app)
            .patch(`/v1/users/role/${userID}`)
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                role: 'admin'
            }))
        expect(response.statusCode).toBe(200);
    })
    test("Demote a user by ID", async () => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        let user = await prisma.user.findUnique({where: {userName: 'autotestuser'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        const response = await request(app)
            .patch(`/v1/users/role/${userID}`)
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
            .send(querystring.stringify({
                role: 'user'
            }))
        expect(response.statusCode).toBe(200);
    })
    test("Attempt to delete a user by inexistent ID", async () => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        const response = await request(app)
            .delete(`/v1/users/fakeID`)
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
        expect(response.statusCode).toBe(404);
    })
    test("Delete a user by ID", async () => {
        let userToken = await getUserToken('autoTestAdmin', 'autoTestAdminPass')
        let user = await prisma.user.findUnique({where: {userName: 'autotestuser'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        const response = await request(app)
            .delete(`/v1/users/${userID}`)
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
        expect(response.statusCode).toBe(200);
    })
})

export default adminOnly