import express from 'express'
import { DateTime} from 'luxon'

function checkDate(date:any) {
    if (date) {
        if (typeof date !== 'string' || !DateTime.fromISO(date).isValid) {
            throw "Code 400 Query times are invalid"
        } else {
            return new Date(date)
        }
    } else {
        return undefined
    }
}

function validateQuery(req: express.Request, cols: string[]) {
    let pageSize: number | undefined = 0
    let pageNum = 1
    let skip = 0
    if (typeof req.query.size === 'string') {
        if (/^\d+$/.test(req.query.size) && parseInt(req.query.size) > 0) {
            pageSize = parseInt(req.query.size)
        } else {
            throw "Code 400 Page size must be a positive non-zero integer"
        }
    } else {
        pageSize = undefined
    }
    if (typeof req.query.page === 'string') {
        if (/^\d+$/.test(req.query.page) && parseInt(req.query.page) > 0) {
            pageNum = parseInt(req.query.page)
        } else {
            throw "Code 400 Page size must be a positive non-zero integer"
        }
    }
    if (pageSize) {
        skip = pageSize * (pageNum - 1)
    }
    let userID = req.query.userID
    if (userID && typeof userID !== 'string') {
        throw "Code 400 User ID query is invalid"
    }
    let userName = req.query.user
    if (userName && typeof userName !== 'string') {
        throw "Code 400 User name query is invalid"
    }
    let resourceID = req.query.resourceID
    if (resourceID && typeof resourceID !== 'string') {
        throw "Code 400 Resource ID query is invalid"
    }
    let resourceName = req.query.resource
    if (resourceName && typeof resourceName !== 'string') {
        throw "Code 400 Resource name query is invalid"
    }
    let description = req.query.description
    if (description && typeof description !== 'string') {
        throw "Code 400 Description query is invalid"
    }
    let startsBefore = checkDate(req.query.startsBefore)
    let startsAfter = checkDate(req.query.startsAfter)
    let endsBefore = checkDate(req.query.endsBefore)
    let endsAfter = checkDate(req.query.endsAfter)
    let queryCol = req.query.col;
    let sortCol = cols[0]
    if (queryCol) {
        if (typeof queryCol !== 'string' || !cols.includes(<string>queryCol)) {
            throw "Code 400 Query column is invalid"
        } else {
            sortCol = queryCol
        }
    }
    let queryDir = req.query.dir
    let sortDir = "asc"
    if (queryDir) {
        if (typeof queryDir !== 'string' || !["asc", "desc"].includes(<string>queryDir)) {
            throw "Code 400 Query direction is invalid"
        } else {
            sortDir = queryDir
        }
    }
    return {pageSize, skip, userID, userName, resourceID, resourceName, description,
        startsBefore, startsAfter, endsBefore, endsAfter, sortCol, sortDir}
}

export default validateQuery