const test = require('ava')
const server = require('./server')
const fetch = require('node-fetch')

const auth_engine = require('./auth_engine')
const poll_engine = require('./poll_engine')

let listening_server = null

// ---------------------------------------- BEGIN

test.serial.before(() => {
    auth_engine.clear(true)
    poll_engine.clear(true)
})

// ---------------------------------------- ENGINE TESTS

// ------------------------- AUTH TEST

const auth_1_name = 'abcd'
const auth_2_name = 'ghtd1234'

test.serial('auth exists 1', t => {
    t.false(auth_engine.is_auth(auth_1_name))
})

test.serial('auth register', t => {
    t.true(auth_engine.register_auth(auth_1_name))
    t.false(auth_engine.register_auth(auth_1_name))
})

test.serial('auth unregister', t => {
    t.false(auth_engine.delete_auth(auth_2_name))
    t.true(auth_engine.delete_auth(auth_1_name))
    t.false(auth_engine.delete_auth(auth_1_name))
})

test.serial('check exist', t => {
    t.true(auth_engine.register_auth(auth_2_name))
    t.true(auth_engine.is_auth(auth_2_name))
})

// ------------------------- POLL TEST

// create, refuse create, voters, vote, results

function random_poll_data() {
    return {
        name: Math.random() + 'poll',
        choices: ['Pierre', 'Paulette', 'Jacques', 'Ivette'],
        grades: Array.from('ABCDEF')
    }
}

function random_vote_data(poll) {
    return poll.choices
        .map(choice => ({ choice, grade: poll.grades[Math.floor(Math.random() * poll.grades.length)] }))
}

const vote_data = {
    choice: 'Paulette',
    grade: 'B'
}

function random_voter_token() {
    return Math.random() + 'voter'
}

const poll_data_1 = random_poll_data()
const poll_data_2 = random_poll_data()

const voter_token_1 = random_voter_token()
const voter_token_2 = random_voter_token()

let voter_1_vote = null

let poll_1_id = null
let poll_2_id = 'NOPOSSIBLE'

test.serial('create poll', t => {
    poll_1_id = poll_engine.create_poll(poll_data_1)
    t.pass()
})

test.serial('create same fail', t => {
    t.throws(() => poll_engine.create_poll(poll_data_1))
})

test.serial('create poll sub 5 grades fail', t => {
    const poll_data = random_poll_data()
    poll_data.grades = ['A', 'B', 'C']
    const err = t.throws(() => poll_engine.create_poll(poll_data))
    t.true(err.toString().includes('(3 given)'))
})

test.serial('poll data', t => {
    const { name } = poll_engine.get_poll_data(poll_1_id)
    t.is(name, poll_data_1.name)
})

test.serial('create other pass', t => {
    poll_engine.create_poll(poll_data_2)
    t.pass()
})

test.serial('poll exists', t => {
    t.true(poll_engine.exists(poll_1_id))
    t.false(poll_engine.exists(poll_2_id))
})

test.serial('check voter', t => {
    t.false(poll_engine.is_voter(poll_1_id, voter_token_1))
})

test.serial('create voter', t => {
    t.true(poll_engine.add_voter(poll_1_id, voter_token_1))
})

test.serial('create voter twice fail', t => {
    t.throws(() => poll_engine.add_voter(poll_1_id, voter_token_1))
})

test.serial('check existing voter', t => {
    t.false(poll_engine.is_voter(poll_1_id, voter_token_2))
    t.true(poll_engine.is_voter(poll_1_id, voter_token_1))
    t.true(poll_engine.add_voter(poll_1_id, voter_token_2))
})

test.serial('vote cannot cause start', t => {
    voter_1_vote = random_vote_data(poll_data_1)
    t.throws(() => poll_engine.vote(poll_1_id, voter_token_1, voter_1_vote))
})
test.serial('vote start', t => {
    const now = parseInt(Date.now() / 1000)
    t.is(parseInt(poll_engine.start(poll_1_id) / 1000), now)
    t.throws(() => poll_engine.start(poll_1_id))
})
test.serial('vote can', t => {
    poll_engine.vote(poll_1_id, voter_token_1, voter_1_vote)
    t.pass()
})
test.serial('vote cannot', t => {
    t.throws(() => poll_engine.vote(poll_1_id, voter_token_1, voter_1_vote))
})
test.serial('cannot get result', t => {
    t.throws(() => poll_engine.results(poll_1_id))
})
test.serial('ending poll', t => {
    t.false(poll_engine.has_ended(poll_1_id))
    poll_engine.close(poll_1_id)
    t.true(poll_engine.has_ended(poll_1_id))
})
test.serial('cannot vote cause end', t => {
    const err = t.throws(() => poll_engine.vote(poll_1_id, voter_token_2, random_vote_data(poll_data_1)))
    t.is(err + '', 'Error: poll not opened (or already done)')
})
test.serial('get result', t => {
    poll_engine.results(poll_1_id)
    t.pass()
})
test.serial('results coherency', t => {

    const poll_data = {
        name: 'tester',
        choices: Array.from('1234'),
        grades: Array.from('ABCDE')
    }

    const id = poll_engine.create_poll(poll_data)
    const voter_tokens = Array(4).fill(0).map(() => Math.random())
    voter_tokens.forEach(voter_token => poll_engine.add_voter(id, voter_token))

    const needed_votes = {
        '1': 'BBBC',
        '2': 'ABBB',
        '3': 'AABB',
        '4': 'AAAB',
    }

    const votes = Array(Object.values(needed_votes)[0].length).fill(0)
        .map((_, gi) => Object.keys(needed_votes).map((choice) => ({ choice, grade: needed_votes[choice][gi] })))

    poll_engine.start(id)

    voter_tokens.forEach((voter_token, vid) => poll_engine.vote(id, voter_token, votes[vid]))

    poll_engine.close(id)

    const needed_winner = '4'

    const results = poll_engine.results(id)

    t.is(results.winner_choice, needed_winner)
    t.is(results.choices_results['2'], 'B')
    t.is(results.choices_votes['3'].join(''), 'AABB')
})

// ---------------------------------------- API TESTS

// ------------------------- OPEN SERVER

const auth_used = 'abcd1234'

const voter_token = '4567hfjd'

async function send(url, method = 'GET', data = null, token = null) {
    url = 'http://localhost:3000' + url
    const options = {
        method,
        headers: {
            'Authorization': token,
            'content-type': data ? 'application/json' : '',
        },
        body: data ? JSON.stringify(data) : undefined
    }
    const resp = await fetch(url, options)
    if (!resp.ok) {
        const err = new Error(await resp.text())
        err.status = resp.status
        throw err
    }
    const json = await resp.json()
    return json
}

const server_poll_data = random_poll_data()

let server_poll_id = null

test.serial.before(async () => {
    auth_engine.clear(true)
    poll_engine.clear(true)

    auth_engine.register_auth(auth_used)

    listening_server = await server(3000)
})
// ------------------------- TESTS

// create, start, add voter, remove voter, vote, close

test.serial('api entry', async t => {
    const response = await send('/api', 'GET')
    t.is(response, 'Yello')
})

test.serial('create no auth', async t => {
    const err = await t.throwsAsync(() => send('/api/poll/create', 'POST', random_poll_data()))
    t.is(err.status, 401)
})
test.serial('create', async t => {
    server_poll_id = await send('/api/poll/create', 'POST', server_poll_data, auth_used)
    t.pass()
})
test.serial('start', async t => {
    await t.notThrowsAsync(() => send('/api/poll/' + server_poll_id + '/start', 'PUT', null, auth_used))
    const err = await t.throwsAsync(() => send('/api/poll/' + server_poll_id + '/start', 'PUT', null, auth_used))
    t.is(err.status, 400)
})
test.serial('add voters', async t => {
    await t.notThrowsAsync(() => send('/api/poll/' + server_poll_id + '/voter', 'POST', { token: voter_token }, auth_used))
    const err = await t.throwsAsync(() => send('/api/poll/' + server_poll_id + '/voter', 'POST', { token: voter_token }, auth_used))
    t.is(err.status, 500)
    await t.notThrowsAsync(() => send('/api/poll/' + server_poll_id + '/voter', 'POST', { token: 'caca' }, auth_used))
})
test.serial('remove voter', async t => {
    await t.throwsAsync(() => send('/api/poll/' + server_poll_id + '/voter', 'DELETE', { token: 'pipi' }, auth_used))
    await t.notThrowsAsync(() => send('/api/poll/' + server_poll_id + '/voter', 'DELETE', { token: 'caca' }, auth_used))
    await t.throwsAsync(() => send('/api/poll/' + server_poll_id + '/voter', 'DELETE', { token: 'caca' }, auth_used))
})
test.serial('vote', async t => {
    const vote = random_vote_data(server_poll_data)
    await t.throwsAsync(() => send('/api/poll/' + server_poll_id + '/vote', 'POST', vote, auth_used))
    await t.notThrowsAsync(() => send('/api/poll/' + server_poll_id + '/vote', 'POST', vote, voter_token))
    await t.throwsAsync(() => send('/api/poll/' + server_poll_id + '/vote', 'POST', vote, voter_token))
})
test.serial('no results', async t => {
    await t.throwsAsync(() => send('/api/poll/' + server_poll_id + '/results'))
})
test.serial('close', async t => {
    await t.notThrowsAsync(() => send('/api/poll/' + server_poll_id + '/close', 'PUT', null, auth_used))
    await t.throwsAsync(() => send('/api/poll/' + server_poll_id + '/close', 'PUT', null, auth_used))
})
test.serial('results', async t => {
    await t.notThrowsAsync(() => send('/api/poll/' + server_poll_id + '/results'))
})
test.serial('server results coherency', async t => {

    const poll_data = {
        name: 'server tester',
        choices: Array.from('1234'),
        grades: Array.from('ABCDE')
    }

    const id = await send('/api/poll/create', 'POST', poll_data, auth_used)

    const poll_url = '/api/poll/' + id

    const voter_tokens = Array(4).fill(0).map(() => Math.random())
    await Promise.all(voter_tokens.map(token =>
        send(poll_url + '/voter', 'POST', { token }, auth_used)))

    const needed_votes = {
        '1': 'BBBC',
        '2': 'ABBB',
        '3': 'AABB',
        '4': 'AAAB',
    }

    const votes = Array(Object.values(needed_votes)[0].length).fill(0)
        .map((_, gi) => Object.keys(needed_votes).map((choice) => ({ choice, grade: needed_votes[choice][gi] })))

    await send(poll_url + '/start', 'PUT', null, auth_used)

    await Promise.all(voter_tokens.map((voter_token, vid) =>
        send(poll_url + '/vote', 'POST', votes[vid], voter_token)))

    await send(poll_url + '/close', 'PUT', null, auth_used)

    const needed_winner = '4'

    const results = await send(poll_url + '/results')

    t.is(results.winner_choice, needed_winner)
    t.is(results.choices_results['2'], 'B')
    t.is(results.choices_votes['3'].join(''), 'AABB')

})

// ------------------------- CLOSE SERVER

test.serial.after.always(() => {
    listening_server.close()
})

// ---------------------------------------- END

test.after.always(() => {
    auth_engine.clear(true)
    poll_engine.clear(true)
})