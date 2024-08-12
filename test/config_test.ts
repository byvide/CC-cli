import { boolFlags, FlagDefinition, stringFlags } from '../src/config.ts';

const FLAG_ARRAYS: { [key: string]: FlagDefinition[] } = {
	boolFlags: boolFlags,
	stringFlags: stringFlags,
} as const;

const checkForDuplicates = (prop: 'name' | 'alias', errorMsg: string) => {
	const occurrenceMap: { [name: string]: string[] } = {};
	for (const arrLabel in FLAG_ARRAYS) {
		for (const flagDef of FLAG_ARRAYS[arrLabel]) {
			const key = flagDef[prop];
			if (!key) continue;

			if (!occurrenceMap[key]) {
				occurrenceMap[key] = [];
			}
			occurrenceMap[key].push(prop === 'name' ? arrLabel : `${flagDef.name} in ${arrLabel}`);
		}
	}

	const duplicates = Object.entries(occurrenceMap)
		.filter(([, occurrences]) => occurrences.length > 1)
		.map(([key, occurrences]) => ({ [key]: occurrences }));

	if (duplicates.length) {
		throw new Error(`${errorMsg}\n${JSON.stringify(duplicates)}\n`);
	}
};
Deno.test('No duplicate flag names', () => {
	checkForDuplicates('name', 'Duplicate flag name found!');
});
Deno.test('No duplicate flag aliases', () => {
	checkForDuplicates('alias', 'Duplicate alias found!');
});
