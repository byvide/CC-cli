import { Command, runCommand } from './U_command.ts';
import { logger } from './U_logger.ts';

const COMMAND_CHECKS = {
	'git': async () => {
		const result = await runCommand(['git', '--version']);
		return result.code === 0;
	},
	'echo': async () => {
		const result = await runCommand(['echo', 'test']);
		return result.code === 0;
	},
} satisfies { [key: string]: () => Promise<boolean> };

/**
 * Checks the availability of all commands defined in COMMAND_CHECKS.
 *
 * @returns {Promise<{ [K in Command]: boolean }>} A promise that resolves to an object with the availability
 * of each command. The keys are the command names, and the values are booleans indicating availability.
 */
export async function checkCommandAvailability() {
	const availability: { [K in Command]?: boolean } = {};

	for (const command in COMMAND_CHECKS) {
		try {
			const isAvailable = await COMMAND_CHECKS[command as Command]();
			availability[command as Command] = isAvailable;
		} catch (error) {
			logger.log(`⚠️ Error checking availability for ${command}: ${error.message}`);
			availability[command as Command] = false;
		}
	}

	return availability;
}

/**
 * This function creates a promise that resolves after the given duration, allowing the
 * execution of subsequent code to be paused when `await` or `.then` is used.
 *
 * @param {number} ms - The number of milliseconds to delay the execution.
 *
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
