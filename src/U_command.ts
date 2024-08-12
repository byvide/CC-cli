/**
 * Initializes the OS-specific command setup.
 */
function initializeRunCommand() {
	const createCommand: (args: string[]) => Deno.Command = (Deno.build.os === 'windows')
		? (args: string[]) => new Deno.Command('cmd', { args: ['/c', ...args] })
		: (args: string[]) => new Deno.Command(args[0], { args: args.slice(1) });
	const decoder = new TextDecoder();

	/**
	 * Runs a command with the given arguments.
	 *
	 * @param {string[]} args - The arguments to pass to the command.
	 *
	 * @returns {Promise<{ code: number; stdout: string; stderr: string }>}
	 */
	return async function runCommand(
		args: CommandArgs,
	): Promise<{ code: number; stdout: string; stderr: string }> {
		const command = createCommand(args);
		const { code, stdout, stderr } = await command.output();

		return {
			code,
			stdout: decoder.decode(stdout),
			stderr: decoder.decode(stderr),
		};
	};
}

export type Command = 'git' | 'echo';
export type CommandArgs = [Command, ...string[]];
export const runCommand = initializeRunCommand();
