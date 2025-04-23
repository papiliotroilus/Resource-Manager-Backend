import request from "supertest"
import app from "../../app"
import {getUserToken} from "../../utils/keycloakRequests"

const logout = () => describe("Log out", () => {
    test("Visit Keycloak logout page", async () => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        const response = await request(app)
            .get("/v1/logout")
            .set({
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
        expect(response.statusCode).toBe(302)
    })
})

export default logout