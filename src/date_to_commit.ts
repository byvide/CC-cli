import { format } from 'date-fns';
import { currentConfig, describeFlag } from './config.ts';
import { sleep } from './L_command.ts';
import { commit } from './L_git.ts';
import { formatMilliseconds, futureNow, stringifyDate } from './L_time.ts';
import { logger } from './U_logger.ts';

const encoder = new TextEncoder();

/**
 * Processes a list of ISO string dates and generates commits for each.
 *
 * **Note:** This function does not perform any validation on the dates.
 *
 * @param {string[]} dates - The list of ISO string dates to process.
 *
 * @returns {Promise<void>}
 */
async function processDateStrings(
	dates: string[],
): Promise<void> {
	const totalCommits = dates.length;
	logger.log(
		`\tEstimated time: ${formatMilliseconds(totalCommits * (currentConfig.throttle + 100))}`,
	);

	for (let i = 0; i < totalCommits; i++) {
		try {
			await commit(dates[i]);
			await Deno.stdout.write(encoder.encode(`\t⌛ ${i + 1}/${totalCommits}\r`));
		} catch (error) {
			if (currentConfig['let-it-go']) {
				logger.log(`\t❌ Error committing for date: "${dates[i]}": ${error}`);
			} else {
				throw new Error(
					`Error committing for date: ${
						dates[i]
					}: ${error}\nFor different behavior consider using:\n${describeFlag('let-it-go')}`,
				);
			}
		}
		await sleep(currentConfig.throttle);
	}
}

/**
 * Processes a list of Date objects and generates commits for each.
 *
 * This function performs validation to ensure that dates are within
 * the acceptable range.
 *
 * @param {Date[]} dates - The list of Date objects to process.
 *
 * @returns {Promise<void>}
 */
export async function processDates(
	dates: Date[],
): Promise<void> {
	dates = dates.filter((date) => {
		try {
			const year = date.getFullYear();
			if (year < 1970) {
				throw new Error('Date cannot be before 1970.');
			}
			const future = futureNow.getFullYear() - 1;
			if (year > future) {
				throw new Error(`Date cannot be after ${future}.`);
			}
			return true;
		} catch (error) {
			if (currentConfig['let-it-go']) {
				logger.log(`\t❌ Date is not acceptable: "${stringifyDate(date)}": ${error}`);
				return false;
			} else {
				throw new Error(
					`One of the dates are not acceptable: "${
						stringifyDate(date)
					}": ${error}\nFor different behavior consider using:\n${describeFlag('let-it-go')}`,
				);
			}
		}
	});

	await processDateStrings(dates.map(stringifyDate));
}

// The map representing paint codes and their corresponding commit count values.
// These are the upper thresholds. On the GitHub contribution calendar, the actual
// color may vary (only brighter). For instance, if paint code 2 is used, it might
// appear as paint code 4 on the calendar due to GitHub's relative frequency algorithm
// that determines the color intensity.
const UNUSED_PAINT_CODES = {
	0: 0, // No contribution
	1: 1, // #0e4429
	2: 11, // #006d32
	3: 21, // #26a641
	4: 31, // #39d353
};
export type UNUSED_Paint = keyof typeof UNUSED_PAINT_CODES;

/**
 * Generates a string representing a sequence of commits on a specific date based on the provided paint code.
 *
 * @param {Date} date - The date on which the commits should be made.
 * @param {UNUSED_Paint} paint - The paint code determining the number of commits (intensity).
 *
 * @returns {string} - A string representing the date followed by the appropriate number of commit entries.
 */
export function UNUSED_drawDate(date: Date, paint: UNUSED_Paint): string {
	const count = UNUSED_PAINT_CODES[paint];
	let res: string = '';

	if (count) {
		res += format(date, 'yyyy-MM-dd');
	}

	for (let i = 1; i < count; i++) {
		res += ' 0';
	}

	return res;
}
