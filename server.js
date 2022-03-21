module.exports = async (PORT) => {

    const express = require('express')
    const app = express()

    const api = require('./api')
    app.use('/api', api)

    const server = await new Promise(ok => {
        const server = app.listen(PORT, () => {
            console.log('MJS listening on', PORT)
            ok(server)
        })
    })
    server.on('close', () => console.log('MJS closed'))

    return server
}