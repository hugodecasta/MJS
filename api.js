const api = require('express').Router()
const json_parser = require('body-parser').json()

module.exports = api

const poll_engine = require('./poll_engine')
const auth_engine = require('./auth_engine')

// ----------------------------------- AUTH

function parse_auth(req, res, next) {
    const token = req.header('authorization')
    if (!token) {
        return res.status(401).send('authorization needed')
    }
    req.auth_token = token
    next()
}

function check_admin(req, res, next) {
    const token = req.auth_token
    if (auth_engine.is_auth(token)) return next()
    res.status(401).send('unauthorized user')
}

function json_reser(method) {
    return function (req, res, next) {
        try {
            res.json(method(req))
        } catch (e) {
            res.status(500).send(e + '')
        }
    }
}

function get_poll_id(req, res, next) {
    const { id } = req.params
    if (!poll_engine.exists(id)) {
        return res.status(404).send('poll not found')
    }
    req.poll_id = id
    next()
}

function check_poll_not_started(req, res, next) {
    if (poll_engine.has_begun(req.poll_id))
        return res.status(400).send('poll already open')
    next()
}

function check_poll_started(req, res, next) {
    if (!poll_engine.has_begun(req.poll_id))
        return res.status(400).send('poll is not open')
    next()
}

function check_poll_not_closed(req, res, next) {
    if (poll_engine.has_ended(req.poll_id))
        return res.status(400).send('poll is already closed')
    next()
}

function check_poll_closed(req, res, next) {
    if (!poll_engine.has_ended(req.poll_id))
        return res.status(400).send('poll not closed')
    next()
}

function check_vote_rights(req, res, next) {
    if (!poll_engine.is_voter(req.poll_id, req.auth_token))
        return res.status(401).send('unauthorized voter')
    next()
}

// ----------------------------------- ENTRY
api.get('/', (req, res) => res.json('Yello'))

// ----------------------------------- ADMIN

api.post('/poll/create',
    parse_auth, check_admin, json_parser,
    json_reser((req) => poll_engine.create_poll(req.body)))

api.put('/poll/:id/start',
    parse_auth, check_admin, get_poll_id, check_poll_not_started, check_poll_not_closed,
    json_reser((req) => poll_engine.start(req.poll_id)))

api.put('/poll/:id/close',
    parse_auth, check_admin, get_poll_id, check_poll_started, check_poll_not_closed,
    json_reser((req) => poll_engine.close(req.poll_id)))

api.post('/poll/:id/voter',
    parse_auth, check_admin, get_poll_id, json_parser,
    json_reser((req) => poll_engine.add_voter(req.poll_id, req.body.token)))

api.delete('/poll/:id/voter',
    parse_auth, check_admin, get_poll_id, json_parser,
    json_reser((req) => poll_engine.remove_voter(req.poll_id, req.body.token)))

// ----------------------------------- POLL

api.post('/poll/:id/vote',
    parse_auth, get_poll_id, check_vote_rights, check_poll_started, check_poll_not_closed, json_parser,
    json_reser((req) => poll_engine.vote(req.poll_id, req.auth_token, req.body)))

api.get('/poll/:id/results',
    get_poll_id, check_poll_closed,
    json_reser((req) => poll_engine.results(req.poll_id)))