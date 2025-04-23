import request from "supertest"
import app from "../../app"
import {getUserToken} from "../../utils/keycloakRequests"
import {PrismaClient} from "@prisma/client"

const prisma = new PrismaClient()

const users = () => describe("View users", () => {
    test("View all users", async() => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let response = await request(app)
            .get("/v1/users/")
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(200)
    })
    test("View single user by ID", async() => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let user = await prisma.user.findUnique({where: {userName: 'autotestadmin'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        let response = await request(app)
            .get(`/v1/users/${userID}`)
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(200)
    })
    test("Attempt to view user by inexistent ID", async() => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let response = await request(app)
            .get(`/v1/users/${userToken}`)
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(404)
    })
})

export default users