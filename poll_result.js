module.exports = (choices, grades, votes) => {

    const grade_id_map = Object.fromEntries(grades.map((g, i) => [g, i]))
    const choice_id_map = Object.fromEntries(choices.map((c, i) => [c, i]))

    const votes_separation = choices.map(() => Array(grades.length).fill(0).map(() => []))
    votes.forEach(vote => vote
        .forEach(({ choice, grade }) => votes_separation[choice_id_map[choice]][grade_id_map[grade]].push(grade_id_map[grade])))
    const vote_ids = votes_separation.map(gids => gids.flat())

    const median_index = Math.max(0, Math.floor((vote_ids[0].length + 1) / 2))
    const result_ids = vote_ids.map(gids => gids[median_index])

    const ordered_choices_ids = result_ids.map((gid, i) => [i, gid]).sort(([, a], [, b]) => a - b).map(([cid]) => cid)

    const c_grades = vote_ids.map(gids => gids.map(gid => grades[gid]))
    const results = result_ids.map(gid => grades[gid])

    const choices_votes = Object.fromEntries(c_grades.map((gs, i) => [choices[i], gs]))
    const choices_results = Object.fromEntries(results.map((g, i) => [choices[i], g]))

    const ordered_choices = ordered_choices_ids.map(cid => choices[cid])

    const winner_choice = ordered_choices[0]

    return {
        choices_votes, choices_results,
        ordered_choices,
        winner_choice
    }
}