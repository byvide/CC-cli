import { addHours, addMinutes, formatISO, parse } from 'date-fns';

/**
 * Converts a YYYY-MM-DD date string to a Date object.
 *
 * @param {string} dateStr - The YYYY-MM-DD date string to convert.
 *
 * @returns {Date} - The corresponding Date object.
 */
export function parseDate(dateStr: string): Date {
	return parse(dateStr, 'yyyy-MM-dd', new Date());
}

/**
 * Converts a given Date object to its ISO string representation.
 *
 * @param {Date} date - The date to convert.
 *
 * @returns {string} The ISO string representation of the date.
 */
export function stringifyDate(date: Date): string {
	return formatISO(date);
}

export function normalizeDate(date: Date) {
	/*
	There seems to be an inconsistency with how GitHub interprets and displays dates,
	possibly related to how it handles time zones or Daylight Saving Time.
	To ensure the date appears correctly on GitHub, we add 1 hour to the given date
	before adjusting it based on the local time zone offset.

	This adjustment has been observed to work consistently, though the exact reason
	for the discrepancy isn't fully understood. Adjustments may vary depending on
	your specific GitHub settings or how GitHub processes dates.
	*/
	const timezoneOffset = date.getTimezoneOffset();
	const utcAdjustedDate = addMinutes(addHours(date, 1), -timezoneOffset);
	return new Date(utcAdjustedDate.toISOString());
}

export const futureNow = (() => {
	const futureDate = new Date(new Date());
	futureDate.setFullYear(futureDate.getFullYear() + 74); // is the limit [75 as year] or [2099 as date]? Writing this in 2024, setting 74 and lets see next year.
	return futureDate;
})();
export const futureNowString = stringifyDate(futureNow);

/**
 * Converts milliseconds to a readable format.
 *
 * @param {number} ms - The time in milliseconds.
 *
 * @returns {string} The formatted time as "mm:ss".
 */
export function formatMilliseconds(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000) + 1;
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}
