import express from 'express'
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from "swagger-jsdoc"

const router = express.Router()
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Resource Manager API',
        version: '1.0.0',
        description: 'This is the backend of a simple CRUD web app for managing resources.',
    },
    contact: {
        name: 'Serena Pancu',
        email: 'spancu@dvloper.io'
    }
};
const swaggerSpec = swaggerJSDoc({swaggerDefinition, apis: ['./routes/*.ts'],})

router.use('/api', swaggerUi.serve)
router.get('/api', swaggerUi.setup(swaggerSpec))

export default router
