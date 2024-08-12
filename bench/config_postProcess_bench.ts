type TsimpleObject = { [key: string]: string };
const simpleObject = {
	'alpha': '...',
	'bravo': '...',
	'charlie': '...',
	'delta': '...',
	'echo': '...',
} as TsimpleObject;
type TarrayOfObjects = { name: string; value: string }[];
const arrayOfObjects = [
	{ name: 'bravo', value: 'asd' },
	{ name: 'delta', value: 'asd' },
	{ name: 'foxtrot', value: 'asd' },
] as TarrayOfObjects;

const use_for = (obj: TsimpleObject, arr: TarrayOfObjects) => {
	for (let i = 0; i < arr.length; i++) {
		if (obj[arr[i].name] === undefined) {
			obj[arr[i].name] = '';
		} else if (obj[arr[i].name] === '') {
			obj[arr[i].name] = arr[i].value;
		}
	}
};
Deno.bench('for', { group: 'iteration for parseArgs post-processing' }, () => {
	use_for({ ...simpleObject }, [...arrayOfObjects]);
});

const use_forOf = (obj: TsimpleObject, arr: TarrayOfObjects) => {
	for (const item of arr) {
		if (obj[item.name] === undefined) {
			obj[item.name] = '';
		} else if (obj[item.name] === '') {
			obj[item.name] = item.value;
		}
	}
};
Deno.bench('forof', { group: 'iteration for parseArgs post-processing' }, () => {
	use_forOf({ ...simpleObject }, [...arrayOfObjects]);
});

const use_forEach = (obj: TsimpleObject, arr: TarrayOfObjects) => {
	arr.forEach((item) => {
		if (obj[item.name] === undefined) {
			obj[item.name] = '';
		} else if (obj[item.name] === '') {
			obj[item.name] = item.value;
		}
	});
};
Deno.bench('foreach', { group: 'iteration for parseArgs post-processing' }, () => {
	use_forEach({ ...simpleObject }, [...arrayOfObjects]);
});
