import { currentConfig } from './config.ts';
import { futureNowString } from './L_time.ts';
import { runCommand } from './U_command.ts';

/**
 * Initializes a new Git repository in the current directory.
 *
 * @returns {Promise<void>}
 */
export async function initializeGitRepository(): Promise<void> {
	try {
		await runCommand(['git', 'init']);
	} catch (error) {
		throw new Error(`Error initializing Git repository: ${error.message}`);
	}
}

/**
 * Checks if the current directory is a Git repository.
 *
 * @returns {Promise<boolean>} True if the current directory is a Git repository, false otherwise.
 */
export async function isGitRepository(): Promise<boolean> {
	try {
		const { code } = await runCommand(['git', 'rev-parse', '--is-inside-work-tree']);
		return code === 0;
	} catch (error) {
		throw new Error(`Error checking if directory is a git repository: ${error.message}`);
	}
}

/**
 * Checks if the current Git repository is clean (no changes).
 *
 * @returns {Promise<boolean>} True if the repository is clean, false otherwise.
 */
export async function isRepositoryClean(): Promise<boolean> {
	try {
		const { stdout } = await runCommand(['git', 'status', '--porcelain']);
		return stdout.trim() === '';
	} catch (error) {
		throw new Error(`Error checking if repository is clean: ${error.message}`);
	}
}

/**
 * Creates the initial commit with a future date in the current directory.
 *
 * The initial commit is set to a future date to ensure it is effectively "hidden" from the current commit history.
 * This approach is necessary because when using `git reset` to "delete" or squash commits, the root commit cannot be
 * part of the reset process. By setting the initial commit to a date far in the future, it remains untouched and
 * separate from the commits that are reset.
 *
 * @returns {Promise<void>}
 */
export async function createInitialCommit(): Promise<void> {
	try {
		if (!currentConfig?.endUserInfo) {
			await commit(futureNowString);
			return;
		}

		const { file, msg } = currentConfig.endUserInfo;
		await runCommand([
			'echo',
			msg,
			'>',
			file,
		]);
		await runCommand(['git', 'add', '.']);
		await runCommand([
			'git',
			'commit',
			'--quiet',
			'--date',
			futureNowString,
			'-m',
			`INIT`,
		]);
	} catch (error) {
		throw new Error(`Error creating initial commit: ${error.message}`);
	}
}

/**
 * Creates a commit on the specified date.
 *
 * @param {string} date - The date to use for the git commit.
 *
 * @returns {Promise<void>}
 */
export function commit(date: string) {
	return runCommand(['echo', `"${date}"`, '>', currentConfig.targetFile])
		.catch((error) => {
			throw new Error(`Error in echo command for date ${date}: ${error.message}`);
		})
		.then(() => runCommand(['git', 'add', '.']))
		.catch((error) => {
			throw new Error(`Error in git add command for date ${date}: ${error.message}`);
		})
		.then(() =>
			runCommand([
				'git',
				'commit',
				'--quiet',
				'--date',
				date,
				'-m',
				`${date}`,
			])
		)
		.catch((error) => {
			throw new Error(`Error in git commit command for date ${date}: ${error.message}`);
		});
}

/**
 * Returns the number of commits in the repository.
 *
 * @returns {Promise<number>} The number of commits in the repository.
 */
export async function getCommitCount(): Promise<number> {
	try {
		const { stdout } = await runCommand(['git', 'rev-list', '--count', 'HEAD']);
		return parseInt(stdout.trim(), 10);
	} catch (error) {
		throw new Error(`Error counting commits: ${error.message}`);
	}
}

/**
 * Resets the whole repository by "squashing" all commits into one and setting its date to the future.
 *
 * This function uses soft reset to the root commit followed by creating a new commit.
 * Attempting to ""squash" everything into the root commit via interactive rebase is not feasible here
 * because interactive rebase requires manual intervention and cannot be easily automated in a non-interactive script.
 * Additionally, squashing commits into the root commit typically involves manipulating branches, which adds complexity
 * and potential risk of errors.
 *
 * The chosen approach (soft reset to the root commit and then creating a new commit) is straightforward and ensures
 * that all changes are included in the final commit without losing any uncommitted changes.
 *
 * @param {string} commitMsg - The commit message to use for the squashed commit.
 *
 * @returns {Promise<void>}
 */
export async function resetRepository(commitMsg: string): Promise<void> {
	try {
		const { stdout: rootHash } = await runCommand([
			'git',
			'rev-list',
			'--max-parents=0',
			'HEAD',
		]);
		const rootCommitHash = rootHash.trim();

		await runCommand(['git', 'reset', '--soft', rootCommitHash]);
		await runCommand(['git', 'add', '-all']);
		await runCommand([
			'git',
			'commit',
			'--date',
			futureNowString,
			'-m',
			commitMsg,
		]);
	} catch (error) {
		throw new Error(`Error resetting repository: ${error.message}`);
	}
}

/**
 * Cleans the repository by committing any uncommitted changes to a commit dated far into the future.
 * If the `check` parameter is true, the function first checks if the repository is clean.
 *
 * @param {string} commitMsg - The commit message to use for the commit.
 * @param {boolean} [check=false] - If true, checks if the repository is clean before trying to commit. Default is false.
 *
 * @returns {Promise<void>}
 */
export async function cleanRepository(commitMsg: string, check?: boolean): Promise<void> {
	try {
		if (check) {
			const isClean = await isRepositoryClean();
			if (isClean) return;
		}

		await runCommand(['git', 'add', '-A']);
		await runCommand([
			'git',
			'commit',
			'--date',
			futureNowString,
			'-m',
			commitMsg,
		]);
	} catch (error) {
		throw new Error(`Error cleaning repository: ${error.message}`);
	}
}

/**
 * Returns the current commit hash.
 *
 * @returns {Promise<string>} The hash of the current commit.
 */
export async function getCurrentCommitHash(): Promise<string> {
	try {
		const { stdout: currentCommitHash } = await runCommand(['git', 'rev-parse', 'HEAD']);
		return currentCommitHash.trim();
	} catch (error) {
		throw new Error(`Error saving current commit hash: ${error.message}`);
	}
}

/**
 * Performs a hard reset to the specified commit hash.
 *
 * @param {string} commitHash - The commit hash to reset to.
 *
 * @returns {Promise<void>}
 */
export async function hardResetToCommit(commitHash: string): Promise<void> {
	try {
		await runCommand(['git', 'reset', '--hard', commitHash]);
	} catch (error) {
		throw new Error(`Error performing hard reset to commit ${commitHash}: ${error.message}`);
	}
}
