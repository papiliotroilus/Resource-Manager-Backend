import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    const alice = await prisma.user.create({
        data: {
            userName: "alice",
        }
    })
    const bob = await prisma.user.create({
        data: {
            userName: "bob",
        },
    })
    const testResource = await prisma.resource.create({
        data: {
            owner: {
                connect: {
                    userID: alice.userID
                },
            },
            resourceName: "Alice's resource",
            description: "Test resource",
        },
    })
    const testReservation = await prisma.reservation.create({
        data: {
            reservedResource: {
                connect: {
                    resourceID: testResource.resourceID
                },
            },
            reservee: {
                connect: {
                    userID: bob.userID
                },
            },
            startTime: new Date(2025, 1, 20, 14),
            endTime: new Date(2025, 1, 20, 16, 30)
        }
    })
}
main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })