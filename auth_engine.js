const fs = require('fs')
const short_hash = require('short-hash')

const auth_dir = `${__dirname}/auth`
const auth_file = `${auth_dir}/auth.json`

function save_auth(auths) {
    if (!fs.existsSync(auth_dir)) fs.mkdirSync(auth_dir)
    fs.writeFileSync(auth_file, JSON.stringify(auths))
    return true
}

const auth = {}
module.exports = auth

auth.clear = (really = false) => {
    if (!really) throw Error('clearing needs to be sure')
    if (fs.existsSync(auth_dir))
        require('rimraf').sync(auth_dir)
}

// ------------------------------------------------------ UTILS

function hash(name) {
    name += ''
    return short_hash(name) + short_hash(short_hash(name))
}

function auth_array() {
    if (!fs.existsSync(auth_dir)) fs.mkdirSync(auth_dir)
    if (!fs.existsSync(auth_file)) save_auth({})
    return JSON.parse(fs.readFileSync(auth_file))
}

// ------------------------------------------------------ EXPORTS

auth.is_auth = (name) => {
    return hash(name) in auth_array()
}

auth.register_auth = (name) => {
    if (auth.is_auth(name)) return false
    const auth_hash = hash(name)
    const auths = auth_array()
    auths[auth_hash] = true
    return save_auth(auths)
}

auth.delete_auth = (name) => {
    if (!auth.is_auth(name)) return false
    const auth_hash = hash(name)
    const auths = auth_array()
    delete auths[auth_hash]
    return save_auth(auths)
}

auth.get_count = () => {
    return Object.keys(auth_array()).length
}