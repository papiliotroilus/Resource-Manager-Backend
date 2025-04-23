import request from "supertest";
import app from "../../app";
import {getUserToken} from "../../utils/keycloakRequests";

const homepage = () => describe("Access homepage while logged in", () => {
    test("Access homepage", async() => {
        let userToken = await getUserToken('autoTestUser', 'autoTestUserPass')
        let response = await request(app)
            .get("/")
            .set({
                Authorization: `Bearer ${userToken}`
            })
        expect(response.statusCode).toBe(200)
    })
})

export default homepage