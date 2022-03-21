module.exports = async (PORT) => {

    const express = require('express')
    const app = express()

    const http = require('http')

    const swaggerUi = require('swagger-ui-express')
    const swaggerFile = require('./swagger_output.json')

    const api = require('./api')
    app.use('/api', api)

    app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile))

    const server = http.createServer(app).listen(PORT)
    server.on('close', () => console.log('MJS closed'))

    console.log('MJS listening on', PORT)

    return server
}