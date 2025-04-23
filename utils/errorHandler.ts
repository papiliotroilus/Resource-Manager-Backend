import express from 'express'

function handleError(error: unknown, res:express.Response) {
    if (typeof error === "string" && error.slice(0, 4) === "Code") {
        res.status(Number(error.slice(5,8))).send(error.slice(9))
    } else {
        console.log(error)
        res.status(500).send("Unidentified error")
    }
}

export default handleError