const api = require('express').Router()
const json_parser = require('body-parser').json()
const cors = require('cors')

module.exports = api

api.use(cors())

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

function check_poll_owner(req, res, next) {
    if (!poll_engine.is_owner(req.poll_id, req.auth_token))
        return res.status(401).send('unauthorized owner')
    next()
}

function create_waiter(ms) {
    return function (req, res, next) {
        setTimeout(next, ms)
    }
}

// ----------------------------------- ENTRY
api.get('/', (req, res) => res.json('Yello'))

// ----------------------------------- ADMIN


api.get('/poll/list',
    parse_auth, check_admin,
    json_reser((req) =>/*
        #swagger.security = [{"Auth_user": []}]
        */
        poll_engine.get_owned_list(req.auth_token)))

api.post('/poll/create',
    parse_auth, check_admin, json_parser,
    json_reser((req) =>
        /*
        #swagger.security = [{"Auth_user": []}]

        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                   "schema": {
                        "type": "object",
                        "properties": {
                            "name": { type: "string", example: "caca" },
                            "description": { type: "string", example: "this is a poll" },
                            "tags": { type: "Array of strings", example: "['colored', 'big', '...']" },
                            "choices": { type: "Array of strings", example: ['Candidate A', 'Candidate B', '...'] },
                            "grades": { optional: true, type: "Array of strings", example: ['A','B','C','D','E','F'] },
                        },
                    }
                }
            }
        }
          
        #swagger.responses[200] = {
               description: 'Newly created poll ID',
               schema: 'abcde1234'
        } 
       */
        poll_engine.create_poll(req.body, req.auth_token)))

api.put('/poll/:id/start',
    parse_auth, check_admin, get_poll_id, check_poll_not_started, check_poll_owner, check_poll_not_closed,
    json_reser((req) =>
        /*
            #swagger.security = [{"Auth_user": []}]
            
            #swagger.responses[200] = {
               description: 'Poll start date (JS date)',
               schema: 1647896248468
            } 
        */
        poll_engine.start(req.poll_id)))

api.put('/poll/:id/close',
    parse_auth, check_admin, get_poll_id, check_poll_started, check_poll_owner, check_poll_not_closed,
    json_reser((req) =>
        /*
            #swagger.security = [{"Auth_user": []}]
            
            #swagger.responses[200] = {
               description: 'Poll end date (JS date)',
               schema: 1647896248468
            } 
        */
        poll_engine.close(req.poll_id)))

api.post('/poll/:id/voter',
    parse_auth, check_admin, get_poll_id, check_poll_owner, json_parser,
    json_reser((req) =>
        /*
            #swagger.security = [{"Auth_user": []}]

            #swagger.requestBody = {
                required: true,
                content: {
                    "application/json": {
                    "schema": {
                            "type": "object",
                            "properties": {
                                "token": { type: "string", example: "voter_token_1234" },
                            },
                        }
                    }
                }
            }
            
            #swagger.responses[200] = {
               description: 'Operation success flag',
               schema: true
            } 
        */
        poll_engine.add_voter(req.poll_id, req.body.token)))

api.delete('/poll/:id/voter',
    parse_auth, check_admin, get_poll_id, check_poll_owner, json_parser,
    json_reser((req) =>
        /*
            #swagger.security = [{"Auth_user": []}]

            #swagger.requestBody = {
                required: true,
                content: {
                    "application/json": {
                    "schema": {
                            "type": "object",
                            "properties": {
                                "token": { type: "string", example: "voter_token_1234" },
                            },
                        }
                    }
                }
            }
            
            #swagger.responses[200] = {
               description: 'Operation success flag',
               schema: true
            } 
        */
        poll_engine.remove_voter(req.poll_id, req.body.token)))

api.get('/poll/:id/voter',
    create_waiter(1000), parse_auth, get_poll_id, json_parser,
    json_reser((req) =>
        /*
            #swagger.security = [{"Auth_user": []}]
            
            #swagger.responses[200] = {
               description: 'Is voter or not',
               schema: true
            } 
        */
        poll_engine.is_voter(req.poll_id, req.auth_token)))

api.delete('/poll/:id',
    parse_auth, check_admin, get_poll_id, check_poll_owner,
    json_reser((req) =>
        /*
            #swagger.security = [{"Auth_user": []}]
        */
        poll_engine.delete_poll(req.poll_id)))

// ----------------------------------- VOTE

api.post('/poll/:id/vote',
    parse_auth, get_poll_id, check_vote_rights, check_poll_started, check_poll_not_closed, json_parser,
    json_reser((req) =>
        /*
            #swagger.security = [{"Auth_user": []}]
            
            #swagger.responses[200] = {
               description: 'Operation success flag',
               schema: true
            } 
        */
        poll_engine.vote(req.poll_id, req.auth_token, req.body)))


// ----------------------------------- RESULT

api.get('/poll/:id/results',
    get_poll_id, check_poll_closed,
    json_reser((req) => poll_engine.results(req.poll_id)))

// ----------------------------------- SIMPLE GET

api.get('/poll/:id',
    get_poll_id,
    json_reser((req) => poll_engine.get_poll_data(req.poll_id)))