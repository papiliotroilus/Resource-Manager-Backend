import request from "supertest";
import app from "../../app";
import querystring from "querystring";

const login = () => describe("Log in", () => {
    test("Visit Keycloak login page", () => {
        request(app)
            .get("/v1/login")
            .then(response => {expect(response.statusCode).toBe(302)})
    })
    test("Attempt to log in with invalid credentials", () => {
        request(app)
            .post("/v1/login")
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(querystring.stringify({
                badInput: 'badInput'
            }))
            .then(response => {expect(response.statusCode).toBe(400)})
    })
    test("Log in as as the normal user", () => {
        request(app)
            .post("/v1/login")
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(querystring.stringify({
                username: 'autoTestUser',
                password: 'autoTestUserPass',
            }))
            .then(response => {expect(response.statusCode).toBe(200)})
    })
})

export default login