import {deleteUser} from "../../utils/keycloakRequests";
import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

const cleanup = () => describe("Clean up", () => {
    test("Remove created users", async() => {
        let user = await prisma.user.findUnique({where: {userName: 'autotestuser'}, select: {userID: true}})
        if (user) {
            let userID = user.userID
            await deleteUser(userID)
        }
        let admin = await prisma.user.findUnique({where: {userName: 'autotestadmin'}, select: {userID: true}})
        if (admin) {
            let adminID = admin.userID
            await deleteUser(adminID)
        }
        let userStillExists = await prisma.user.findUnique({where: {userName: 'autotestuser'}})
        let adminStillExists = await prisma.user.findUnique({where: {userName: 'autotestadmin'}})
        expect(!userStillExists && !adminStillExists)
    })
})

export default cleanup