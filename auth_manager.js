const auth_engine = require('./auth_engine')

// ------------------------------------ COMMANDS

const commands = {
    'count': {
        description: 'prints auth user count',
        action: () => console.log(auth_engine.get_count())
    },
    'is_auth': {
        description: '<auth_token> checks if auth token is registered',
        command_args: ['auth_token'],
        action: (token) => console.log(auth_engine.is_auth(token))
    },
    'register_auth': {
        description: '<auth_token> register new (only new) auth tokens',
        command_args: ['auth_token'],
        action: (token) => console.log(auth_engine.register_auth(token))
    },
    'delete_auth': {
        description: '<auth_token> delete existing auth tokens',
        command_args: ['auth_token'],
        action: (token) => console.log(auth_engine.delete_auth(token))
    },
    '--help': {
        description: 'show commands',
        action: () => {
            const middle_need = 5
            const max_command_length = Math.max(...Object.keys(commands).map(c => c.length))
            const middle_size = max_command_length + middle_need
            console.log('HELP\n', 'Usage: node auth_manager <command>[ args]\n', '\nCOMMANDS:\n\n' +
                Object.entries(commands)
                    .map(([com, { description }]) => `  ${com}${' '.repeat(middle_size - com.length)}${description}`).join('\n') + '\n')
        }
    }
}

// ------------------------------------ ENGINE

const [, , command, ...args] = process.argv

if (!(command in commands)) {
    console.log(`command "${command}" not found\nUsage: node auth_manager --help (for help)`)
    process.exit(1)
}

const { action, command_args = [] } = commands[command]
if (args.length < command_args.length) {
    console.log(`\nmissing argument on command "${command}"\n\nUsage: node auth_manager ${command} ${command_args.map(arg => '<' + arg + '>').join(' ')}\n`)
    process.exit(1)
}

action(...args)