const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0', autoHeaders: false })

const package = require('./package.json')

const outputFile = './swagger_output.json'
const endpointsFiles = ['./api']
const doc = {
    info: {
        version: package.version,
        title: 'Majority Judgment Server',
        description: 'MJS API documentation',
    },
    basePath: '/api',
    schemes: ['http', 'https'],
    securityDefinitions: {
        Auth_user: {
            type: 'apiKey',
            description: "Admin or Voter auth token",
            name: 'Authorization',
            in: 'header',
        }
    },
    security: {
        Auth_user: [],
    }
}

swaggerAutogen(outputFile, endpointsFiles, doc)