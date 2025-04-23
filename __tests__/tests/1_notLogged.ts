import request from "supertest";
import app from "../../app";

const notLogged = () => describe("Access secured API when not logged in", () => {
    test("Try to access the homepage, get redirected to Keycloak", () => {
        request(app)
            .get("/")
            .then(response => {expect(response.statusCode).toBe(302)})
    })
})

export default notLogged