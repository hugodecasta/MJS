const fs = require('fs')
const short_hash = require('short-hash')

const auth_dir = `${__dirname}/auth`
const auth_file = `${auth_dir}/auth.json`

function save_auth(auths) {
    fs.writeFileSync(auth_file, JSON.stringify(auths))
    return true
}

if (!fs.existsSync(auth_dir)) fs.mkdirSync(auth_dir)
if (!fs.existsSync(auth_file)) save_auth({})

const auth = {}
module.exports = {}

// ------------------------------------------------------ UTILS

function hash(name) {
    return short_hash(name)
}

function auth_array() {
    return JSON.parse(fs.readFileSync(auth_file))
}

// ------------------------------------------------------ EXPORTS

auth.is_auth = (name) => {
    return hash(name) in auth_array()
}

auth.register_auth = (name) => {
    if (auth.is_auth(name)) return false
    const hash = hash(name)
    auth_array()[hash] = true
    return save_auth()
}

auth.delete_auth = (name) => {
    if (!auth.is_auth(name)) return false
    const hash = hash(name)
    delete auth_array()[hash]
    return save_auth()
}