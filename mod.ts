import { addDays, addMinutes } from 'date-fns';
import { red, yellow } from 'jsr:@std/fmt@^0.225.6/colors';
import { currentConfig as config, describeFlag, printHelp } from './src/config.ts';
import { processDates } from './src/date_to_commit.ts';
import { checkCommandAvailability } from './src/L_command.ts';
import {
	cleanRepository,
	createInitialCommit,
	getCommitCount,
	getCurrentCommitHash,
	hardResetToCommit,
	initializeGitRepository,
	isGitRepository,
	isRepositoryClean,
	resetRepository,
} from './src/L_git.ts';
import { normalizeDate, parseDate } from './src/L_time.ts';
import { Command } from './src/U_command.ts';
import { logger } from './src/U_logger.ts';

try {
	if (config.help) {
		printHelp();
		Deno.exit();
	}

	logger.log('➡️  Checking command availability...');
	const commandAvailability = await checkCommandAvailability();
	for (const key in commandAvailability) {
		logger.log(`\t${commandAvailability[key as Command] ? '✅' : '❌'} ${key}`);
	}
	if (!commandAvailability['git']) {
		throw new Error(
			'Aborting, cannot continue without Git, please ensure it is installed and accessible.',
		);
	}

	logger.log('➡️  Checking if directory is a Git repository...');
	const isRepo = await isGitRepository();
	if (!isRepo) {
		logger.log('🔀  Directory is not a repository. Initializing...');
		await initializeGitRepository();
		logger.log('\t✅ Git repository initialized.');
	} else {
		logger.log('\t✅');
	}

	logger.log('➡️  Checking if repository is clean...');
	const isClean = await isRepositoryClean();
	if (!isClean) {
		if (config['cleanse']) {
			logger.log('🔀 Repository is not clean, cleaning up...');
			await cleanRepository(config['cleanse']);
			logger.log('\t✅ Uncommitted changes have been saved to a future commit.');
		} else {throw new Error(
				`Aborting, repository is not clean, there are uncommitted changes. For different behavior consider using:\n${
					describeFlag('cleanse')
				}`,
			);}
	} else logger.log('\t✅');

	const commitCount = await getCommitCount();
	if (!commitCount) {
		logger.log('➡️  Creating the first commit for technical reasons...');
		await createInitialCommit();
		logger.log('\t✅');
	} else {
		logger.log(`⚠️  There are already ${commitCount} commits present!`);
		if (config.reset) {
			logger.log('🔀 Reset enabled, hiding previous commits...');
			await resetRepository(config.reset);
			logger.log(
				'\t✅ Reset is done.\n' +
					yellow(
						'\tDONT FORGET TO USE git push origin --force TO OVERRIDE THE REMOTE HISTORY WITH YOUR LOCAL ONE IF NECESSARY!',
					),
			);
		} else {
			logger.log(
				`⏭️  Ignoring them. For different behavior consider using:\n${describeFlag('reset')}`,
			);
		}
	}

	const dates: Date[] = [];
	if (!config._.length) {
		logger.log('🟨 Module stopped: No dates were provided.');
		Deno.exit();
	}
	logger.log('➡️  Preparing dates...');
	(() => {
		let previousDate: Date | null = null;
		let previousDate_onlyDate: Date | null = null; //the point of this is with previousDate, date can be incemeneted by minutes, but when hopping to a new date with relative date numbers, i dont want to keep the incemented part

		if (config.direction && !/^[+-]$/.test(config.direction)) {
			throw new Error(
				'Invalid direction flag. The direction flag must be either "+" or "-".',
			);
		}
		const dir = config.direction === '+' ? 1 : -1;

		config._.forEach((item) => {
			item = item.toString();
			let thisDate: Date;

			if (/^\d+$/.test(item)) {
				const daysToAdd = parseInt(item, 10) * dir;
				if (previousDate) {
					if (daysToAdd === 0) {
						thisDate = addMinutes(previousDate, 1);
					} else {
						if (!previousDate_onlyDate) {
							throw new Error(
								'PREVIOUS DATE (ONLY DATE) VARIABLE HAS NO VALUE CURRENTLY: THIS IS AN IMPOSSIBLE CASE.',
							);
						}
						thisDate = addDays(previousDate_onlyDate, daysToAdd);
						previousDate_onlyDate = thisDate;
					}
				} else {
					throw new Error(
						'Relative date adjustment is used before any date has been provided.',
					);
				}
			} else if (/^\d{4}-\d{2}-\d{2}$/.test(item)) {
				thisDate = parseDate(item);
				if (thisDate.getTime() === previousDate?.getTime()) {
					thisDate = addMinutes(thisDate, 1);
				} else {
					if (thisDate.getTime() === previousDate_onlyDate?.getTime()) { // in case of [1990-01-01, 0, 1990-01-01]: this if is crucial for the 3rd element
						if (!previousDate) {
							throw new Error(
								'PREVIOUS DATE (FULL TIME) VARIABLE HAS NO VALUE CURRENTLY: THIS IS AN IMPOSSIBLE CASE.',
							);
						}
						thisDate = addMinutes(previousDate, 1);
					} else {
						previousDate_onlyDate = thisDate;
					}
				}
			} else {
				throw new Error(
					'Invalid input format. Expected a date string in the format YYYY-MM-DD or a relative day number. If you meant to use relative numbers, please specify the direction using the appropriate flag, rather than including the sign in the number itself.\n' +
						describeFlag('direction'),
				);
			}

			previousDate = thisDate;
			dates.push(normalizeDate(thisDate));
		});
	})();
	logger.log('\t✅');

	if (config['no-commit']) {
		logger.log(
			'🟨 Module stopped: The process was stopped before committing due to the "no-commit" flag.',
		);
		Deno.exit();
	}

	logger.log('➡️  Saving current state of the repository...');
	const theHashBeforeCommits = await getCurrentCommitHash();
	logger.log('\t✅');
	try {
		logger.log(`➡️  Creating ${dates.length} commits...`);
		await processDates(dates);
		logger.log('\t✅');
	} catch (error) {
		logger.log('🟥 ' + error);
		logger.log('🔀 Reseting repository to the saved state...');
		await hardResetToCommit(theHashBeforeCommits);
		logger.log('\t✅ Hard reset was successful.');
	}
} catch (error) {
	console.error(red('🟥 Module failed:\n') + error.message);
}
