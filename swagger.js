const swaggerAutogen = require('swagger-autogen')()

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
}

swaggerAutogen(outputFile, endpointsFiles, doc)