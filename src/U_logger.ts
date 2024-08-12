import { currentConfig, prelog } from './config.ts';

/**
 * Initializes a logger with optional silent mode.
 *
 * @returns {function} logger.log - Logs a message. If silent mode is disabled, the message is also logged to the console.
 * @returns {function} logger.getAll - Returns an array of all stored messages.
 * @returns {function} logger.printAll - Prints all stored messages to the console.
 */
function initializeLogger(silent?: boolean) {
	const logArray: string[] = [];
	const doLog = silent ? (msg: string) => logArray.push(msg) : (msg: string) => {
		logArray.push(msg);
		console.log(msg);
	};

	prelog.forEach((item) => {
		doLog(item);
	});
	doLog('--------------');

	return {
		log: doLog,
		getLog: () => [...logArray],
		printLog: () => logArray.forEach((msg) => console.log(msg)),
	};
}
export const logger = initializeLogger(currentConfig.silent);
