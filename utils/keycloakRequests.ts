import request from "superagent"
import querystring from "querystring"
import dotenv from "dotenv"
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();
dotenv.config()

export async function getUserToken(username: string, password: string) {
    let response = await request
        .post(`${process.env.KEYCLOAK_URL}realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(querystring.stringify({
            username: username.toLowerCase(),
            password: password,
            client_id: process.env.KEYCLOAK_CLIENT,
            client_secret: process.env.KEYCLOAK_SECRET,
            grant_type: 'password',
            scope: 'openid'
        }))
        .ok(() => true)
    switch (response.status) {
        case 200: return response.body.access_token;
    }
}

export async function getAdminToken() {
    let username = process.env.KEYCLOAK_ADMIN_USERNAME
    let password = process.env.KEYCLOAK_ADMIN_PASSWORD
    let response = await request
        .post(`${process.env.KEYCLOAK_URL}realms/master/protocol/openid-connect/token`)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(querystring.stringify({
            username: username,
            password: password,
            client_id: 'admin-cli',
            grant_type: 'password',
        }))
        .ok(() => true)
    switch (response.status) {
        case 200: return response.body.access_token
    }
}

export async function createUser(email: string, username: string, password: string) {
    let adminToken = await getAdminToken()
    let response = await request
        .post(`${process.env.KEYCLOAK_URL}admin/realms/${process.env.KEYCLOAK_REALM}/users`)
        .set({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
        })
        .send({
            username: username,
            email: email,
            credentials: [{
                type: "password",
                value: password,
                temporary: "false"
            }],
            enabled: true
        })
        .ok(() => true)
    switch (response.status) {
        case 400: throw "Code 400 Must provide valid email, username, and password"
        case 409: throw "Code 409 User with same name or email already exists";
        case 201: await prisma.user.create({
                data: {userName: username.toLowerCase()}
            })
    }
}

async function getAllUsers() {
    let adminToken = await getAdminToken()
    let response = await request
        .get(`${process.env.KEYCLOAK_URL}admin/realms/${process.env.KEYCLOAK_REALM}/users/`)
        .set({
            Authorization: `Bearer ${adminToken}`
        })
        .ok(() => true)
    switch (response.status) {
        case 200: return response.body
    }
}

export async function refreshUsers() {
    let userList = await getAllUsers()
    for (let user of userList) {
        let userName = user.username
        await prisma.user.upsert({
            where: {userName: userName},
            update: {userName: userName},
            create: {userName: userName},
        });
    }
}

async function getKeycloakID(username: string) {
    let adminToken = await getAdminToken()
    let response = await request
        .get(`${process.env.KEYCLOAK_URL}admin/realms/${process.env.KEYCLOAK_REALM}/users`)
        .set({
            Authorization: `Bearer ${adminToken}`
        })
        .query({username: username.toLowerCase()})
        .ok(() => true)
    switch (response.status) {
        case 200:
            return response.body[0].id
    }
}

export async function getUserRole(userID: string) {
    let prismaUser = await prisma.user.findUnique({where: {userID: userID}})
    if (!prismaUser) {
        throw "Code 404 User not found"
    } else {
        let adminToken = await getAdminToken()
        let keycloakID = await getKeycloakID(prismaUser.userName)
        let response = await request
            .get(`${process.env.KEYCLOAK_URL}admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakID}/role-mappings/`)
            .set({
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`
            })
            .ok(() => true)
        switch (response.status) {
            case 200:
                let roles = response.body.realmMappings.map(((role: { name: string }) => role.name))
                if (roles.some((roleName: string) => roleName === 'admin')) {
                    return 'admin'
                } else {
                    return 'user'
                }
        }
    }
}

export async function changeUserRole(userID: string, role: string) {
    let prismaUser = await prisma.user.findUnique({where: {userID: userID.toLowerCase()}})
    if (!prismaUser) {
        throw "Code 404 User not found"
    } else {
        let adminToken = await getAdminToken()
        let keycloakID = await getKeycloakID(prismaUser.userName)
        let adminRoleID = undefined
        let adminRoleResponse = await request
            .get(`${process.env.KEYCLOAK_URL}admin/realms/${process.env.KEYCLOAK_REALM}/roles/admin`)
            .set({
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`
            })
            .ok(() => true)
        switch (adminRoleResponse.status) {
            case 200: adminRoleID = adminRoleResponse.body.id
        }
        switch (role) {
            case "admin":
                await request
                    .post(`${process.env.KEYCLOAK_URL}admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakID}/role-mappings/realm`)
                    .set({
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${adminToken}`
                    })
                    .send([{
                        id: adminRoleID,
                        name: "admin"
                    }])
                    .ok(() => true)
                break
            case "user":
                await request
                    .delete(`${process.env.KEYCLOAK_URL}admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakID}/role-mappings/realm`)
                    .set({
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${adminToken}`
                    })
                    .send([{
                        id: adminRoleID,
                        name: "admin"
                    }])
                    .ok(() => true)
                break
            default: throw "Code 400 Given role invalid"
        }
    }
}

export async function deleteUser(userID: string) {
    let prismaUser = await prisma.user.findUnique({where: {userID: userID.toLowerCase()}})
    if (prismaUser == null) {
        throw "Code 404 User not found"
    } else {
        let adminToken = await getAdminToken()
        let keycloakID = await getKeycloakID(prismaUser.userName)
        let response = await request
            .delete(`${process.env.KEYCLOAK_URL}admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakID}`)
            .set({
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`
            })
            .ok(() => true)
        switch (response.status) {
            case 204:
                await prisma.reservation.deleteMany({where: {userID: userID}})
                await prisma.resource.deleteMany({where: {userID: userID}})
                await prisma.user.delete({where: {userID: userID}})
        }
    }
}