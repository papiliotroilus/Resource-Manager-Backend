import request from "supertest"
import app from "../../app"
import querystring from "querystring"
import {changeUserRole, getUserRole} from "../../utils/keycloakRequests"
import {PrismaClient} from "@prisma/client"

const prisma = new PrismaClient()

const userRegistration = () => describe("User registration", () => {
    test("Visit Keycloak registration page", async () => {
        const response = await request(app)
            .get("/v1/register");
        expect(response.statusCode).toBe(302)
    })
    test("Create a user directly", async () => {
        const response = await request(app)
            .post("/v1/register")
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(querystring.stringify({
                username: 'autoTestUser',
                password: 'autoTestUserPass',
                email: 'autoTestUser@test.com'
            }))
        expect(response.statusCode).toBe(201)
    })
    test("Attempt to create a user with bad input", async () => {
        const response = await request(app)
            .post("/v1/register")
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(querystring.stringify({
                badInput: 'badInput',
            }))
        expect(response.statusCode).toBe(400)
    })
    test("Attempt to create a user with already taken credentials", async () => {
        const response = await request(app)
            .post("/v1/register")
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(querystring.stringify({
                username: 'autoTestUser',
                password: 'autoTestUserPass',
                email: 'autoTestUser@test.com'
            }))
        expect(response.statusCode).toBe(409)
    })
    test("Create an admin user", async () => {
        const response = await request(app)
            .post("/v1/register")
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(querystring.stringify({
                username: 'autoTestAdmin',
                password: 'autoTestAdminPass',
                email: 'autoTestAdmin@test.com'
            }));
        let user = await prisma.user.findUnique({where: {userName: 'autotestadmin'}, select: {userID: true}})
        if (!user) {throw "NAMED USER NOT FOUND"}
        let userID = user.userID
        await changeUserRole(userID, 'admin')
        let newRole = await getUserRole(userID)
        expect(response.statusCode).toBe(201)
        expect(newRole).toBe('admin')
    })
})

export default userRegistration