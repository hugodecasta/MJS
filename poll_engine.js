const fs = require('fs')
const short_hash = require('short-hash')

const polls_dir = `${__dirname}/poll`

const poll_engine = {}
module.exports = poll_engine

poll_engine.clear = (really = false) => {
    if (!really) throw Error('clearing needs to be sure')
    if (fs.existsSync(polls_dir))
        require('rimraf').sync(polls_dir)
}

const default_grades = ['excellent', 'very good', 'good', 'acceptable', 'poor', 'to reject']

// ------------------------------------------------------ UTILS

function hash(name) {
    name += ''
    return short_hash(name) + short_hash(short_hash(name))
}

function poll_path(id) {
    if (!fs.existsSync(polls_dir)) fs.mkdirSync(polls_dir)
    return `${polls_dir}/${id}.json`
}

function save_poll(poll_data) {
    if (!poll_data.id) throw new Error('Poll data must have an id')
    const path = poll_path(poll_data.id)
    fs.writeFileSync(path, JSON.stringify(poll_data))
    return true
}

function fetch_poll(id) {
    if (!poll_engine.exists(id)) throw new Error(`poll ${id} not found`)
    return JSON.parse(fs.readFileSync(poll_path(id)))
}

function check_poll_opened(poll) {
    if (!poll.start) return false
    if (!poll.end) return true
    const now = Date.now()
    return now < poll.end
}

function check_poll_finished(poll) {
    if (!poll.start) return false
    const now = Date.now()
    return now >= poll.end
}

function check_vote(poll, vote) {
    if (!check_poll_opened(poll)) throw new Error('poll not opened (or already done)')
    const { grades, choices } = poll
    const formated_vote = []
    try {
        if (vote.length != choices.length) throw new Error()
        for (const choice_vote of vote) {
            const { choice, grade } = choice_vote
            if (
                !choice ||
                !grade ||
                !grades.includes(grade) ||
                !choices.includes(choice)
            ) return new Error()
            formated_vote.push({ choice, grade })
        }
    } catch (e) {
        throw new Error('wrong vote format')
    }
    return formated_vote
}

// ------------------------------------------------------ EXPORTS

poll_engine.exists = (id) => {
    return fs.existsSync(poll_path(id))
}

poll_engine.get_poll_data = (id) => {
    const poll = fetch_poll(id)
    const { name, grades, choices, start, end } = poll
    return { id, name, grades, choices, start, end }
}

poll_engine.get_list = () => {
    return fs.readdirSync(polls_dir).map(f => f.replace('.json', ''))
}

poll_engine.get_owned_list = (owner) => {
    return poll_engine.get_list().filter(id => fetch_poll(id).owner == hash(owner))
}

poll_engine.create_poll = (poll_data, owner) => {

    const hashed_owner = hash(owner)

    const id = hash(poll_data.name + hashed_owner)

    poll_data.id = id
    poll_data.owner = hashed_owner
    poll_data.start = poll_data.start ?? null
    poll_data.voters = poll_data.voters ?? {}
    poll_data.grades = poll_data.grades ?? default_grades
    if (poll_data.grades.length < 5)
        throw new Error(`poll must have at least 5 grades (${poll_data.grades.length} given)`)
    poll_data.votes = []

    if (poll_engine.exists(id)) throw new Error(`poll ${id} alread exists`)
    save_poll(poll_data)
    return id
}

poll_engine.is_owner = (id, owner) => {
    return fetch_poll(id).owner = hash(owner)
}

poll_engine.delete_poll = (id) => {
    fetch_poll(id)
    const path = poll_path(id)
    fs.unlinkSync(path)
    return true
}

poll_engine.start = (id) => {
    const poll = fetch_poll(id)
    if (poll.start) throw new Error(`poll ${id} already started`)
    poll.start = Date.now()
    save_poll(poll)
    return poll.start
}

poll_engine.close = (id) => {
    const poll = fetch_poll(id)
    poll.end = Date.now()
    save_poll(poll)
    return poll.end
}

poll_engine.is_voter = (id, token) => {
    const poll = fetch_poll(id)
    const voter_hash = hash(token)
    return voter_hash in poll.voters
}

poll_engine.add_voter = (id, token) => {
    if (poll_engine.is_voter(id, token)) throw new Error(`voter ${token} already in poll`)
    const poll = fetch_poll(id)
    const voter_hash = hash(token)
    poll.voters[voter_hash] = true
    return save_poll(poll)
}

poll_engine.remove_voter = (id, token) => {
    if (!poll_engine.is_voter(id, token)) throw new Error(`voter not in poll`)
    const poll = fetch_poll(id)
    const voter_hash = hash(token)
    delete poll.voters[voter_hash]
    return save_poll(poll)
}


poll_engine.vote = (id, token, vote) => {
    if (!poll_engine.is_voter(id, token)) throw new Error(`voter forbidden`)
    const poll = fetch_poll(id)
    const final_vote = check_vote(poll, vote)
    poll.votes.push(final_vote)
    save_poll(poll)
    return poll_engine.remove_voter(id, token)
}

poll_engine.has_ended = (id) => {
    const poll = fetch_poll(id)
    return check_poll_finished(poll)
}

poll_engine.has_begun = (id) => {
    const poll = fetch_poll(id)
    return check_poll_opened(poll)
}

poll_engine.results = (id, force = false) => {
    const poll = fetch_poll(id)
    if (!force && !check_poll_finished(poll)) throw new Error('poll not finished')
    const { choices, grades, votes } = poll
    return require('./poll_result')(choices, grades, votes)
}