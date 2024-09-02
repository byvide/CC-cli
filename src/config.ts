import { parseArgs } from '@std/cli/parse-args';
import { green, yellow } from '@std/fmt/colors';

///////////////////////////////// FLAG DEFINITIONS /////////////////////////////////
export type FlagDefinition = {
	name: string;
	des: string;
	alias?: string;
};
/*
  - consider boolean flags as false unless the user explicitly turns them on
  - parseArgs() from @std/cli@^1.0.1 behavior:
    - all boolean flags are included in the result regardless of user input
    - by default, all boolean flags are set to false unless the user explicitly sets them to true
*/
type BoolFlagDef = FlagDefinition;
/*
  - if a string flag is passed without a value, use its FALLBACK value
  - this is different from parseArgs()'s DEFAULT values, where specifying a default value
    results in the flag being set to the default regardless of user input (user input overrides it), making the flags always truthy,
	which i dont always want, hence this DEFAULT + FALLBACK setup.
  - because of this, post-processing is required after parseArgs (see below) to apply the FALLBACK values
*/
type StringFlagDef =
	& FlagDefinition
	& (
		| { fallback: string }
		| { default: string }
	);

export const boolFlags = [
	{
		name: 'help',
		alias: 'h',
		des: 'Displays help information about the available flags.',
	},
	{
		name: 'silent',
		des: 'Suppresses console output of current actions but retains logs in memory.',
	},
	{
		name: 'let-it-go',
		des: 'By default, the application deletes all recently created commits (hard reset) when it encounters an error while creating commits for the currently processed dates. Setting this flag instructs the app to continue processing despite errors.',
	},
	{
		name: 'no-commit',
		alias: 'n',
		des: 'Prevents the execution from proceeding to the commit phase.',
	},
] as const satisfies BoolFlagDef[];
export const stringFlags = [
	{
		name: 'cleanse',
		des: "Prevents execution from halting when the repository is unclean by saving uncommitted changes to a commit dated far into the future. Unlike the reset flag, this does not alter the commit history. The flag's value will be used as the commit message.",
		fallback: 'CLEANSE',
	},
	{
		name: 'reset',
		des: "By default, the application creates commits on top of existing ones if any. Setting this flag squashes and hides all previous commits in a commit dated far into the future while keeping the changes. The flag's value will be used as the commit message.",
		fallback: 'RESET',
	},
	{
		name: 'direction',
		alias: 'd',
		des: "The direction flag determines how to interpret relative day numbers when converting them to dates. For example, '--d + -- 1990-12-23 3' would result in [1990-12-23, 1990-12-26], whereas '-' would result in [1990-12-23, 1990-12-20]. Relative day numbers allows you to quickly and easily set dates relative to the previous date, without manually entering each full date.",
		default: '+',
	},
] as const satisfies StringFlagDef[];

type BoolFlagNames = typeof boolFlags[number]['name'];
type StringFlagNames = typeof stringFlags[number]['name'];
type BoolFlagMap = { [K in BoolFlagNames]: boolean };
type StringFlagMap = { [K in StringFlagNames]: string };
export type Flag = BoolFlagNames | StringFlagNames;

///////////////////////////////// FLAG UTILITIES /////////////////////////////////
export const createFlagAliases = () => {
	return [...stringFlags, ...boolFlags].reduce((map, currentFlagDef) => {
		if ('alias' in currentFlagDef) {
			map[currentFlagDef.name] = currentFlagDef.alias;
		}
		return map;
	}, {} as { [key: string]: string });
};

export const { describeFlag, printHelp } = (() => {
	const map = {} as { [key in Flag]: string };
	boolFlags.forEach((item) => {
		map[item.name] =
			green((('alias' in item) ? `  --${item.alias}\n` : '') + `  --${item.name}`) +
			`\n      ${item.des}\n`;
	});
	stringFlags.forEach((item) => {
		map[item.name] =
			green((('alias' in item) ? `  --${item.alias}\n` : '') + `  --${item.name}`) +
			`\n      ${item.des}\n` +
			(('default' in item)
				? `\n      default value (is overridden if flag is provided): "${item.default}"\n`
				: '') +
			(('fallback' in item)
				? `\n      fallback value (used if flag is present but has no value): "${item.fallback}"\n`
				: '');
	});

	return {
		describeFlag: (flag: Flag): string => map[flag],
		printHelp: () => {
			console.log(yellow('\nOptions:'));
			for (const flag in map) {
				console.log(map[flag as Flag]);
			}
		},
	};
})();

///////////////////////////////// ARGUMENT PROCESSING /////////////////////////////////
export const prelog: string[] = []; // buffer for storing log messages before the logger is initialized

const parsedArgs = parseArgs(Deno.args, {
	boolean: boolFlags.map((item) => item.name),
	string: stringFlags.map((item) => item.name),
	alias: createFlagAliases(),
	unknown: (arg) => {
		prelog.push(`⚠️  Unknown option: ${arg}`);
		return false; // exclude the unknown flag from the final result
	},
});

/*
  REASON FOR THE FOLLOWING POST-PROCESSING:
  issues with parseArgs() from @std/cli@^1.0.1

  |                without default option                  |
  |------------------------|-------------------------------|
  | <flag is not present>  | [F] no hello property         |
  | --hello                | [F] hello := ""               |
  | --hello Alice          | [T] hello := "Alice"          |

  |          with default option { hello: "World" }        |
  |------------------------|-------------------------------|
  | <flag is not present>  | [T] hello := "World"          |
  | --hello                | [T] hello := "World"          |
  | --hello Alice          | [T] hello := "Alice"          |

  |        with custom fallback option { hello: "World" }  |
  |-----------------------|--------------------------------|
  | <flag is not present> | [F] hello := ""                |
  | --hello               | [T] hello := "World"           |
  | --hello Alice         | [T] hello := "Alice"           |

  * `[F]` indicates a falsey value.
  * `[T]` indicates a truthy value.

  The introduction of fallback values aims to achieve a consistent and predictable behavior where string flags only become truthy if explicitly passed or assigned a value.
  However, parseArgs() defaults may still lead to flags being truthy even when not explicitly set by the user.
  To address this, the post-processing ensures that string flags utilize the fallback value for truthy states and the default value for standard behavior. This makes the flag behavior more consistent and intuitive.
*/
stringFlags
	.filter((flag) => 'default' in flag) //applying defaults manually, because options.default = a function will fuck up the type of the return type of parseArgs()
	.forEach((flag) => {
		if ((parsedArgs?.[flag.name])) {
			return;
		}

		parsedArgs[flag.name] = flag.default;
	});
stringFlags
	.filter((flag) => 'fallback' in flag)
	.forEach((flag) => {
		if (parsedArgs[flag.name] === undefined) {
			parsedArgs[flag.name] = '';
		} else if (parsedArgs[flag.name] === '') {
			parsedArgs[flag.name] = flag.fallback;
		}
	});
type RemoveUndefined<T> = { [K in keyof T]-?: Exclude<T[K], undefined> };
//The post-processing ensures that parsedArgs has no keys of type string | undefined. This setup forces typeScript to actually work with the correct type.
type CORRECTED_TYPE_FOR_PARSED_ARGS = RemoveUndefined<typeof parsedArgs>;

///////////////////////////////// THE APP CONFIG /////////////////////////////////
export interface Config extends BoolFlagMap, StringFlagMap { // this type definition will throw an error if not all flag name is unique across the 2 sets of flags
	[key: string]: unknown;
}
export const currentConfig = {
	...parsedArgs as CORRECTED_TYPE_FOR_PARSED_ARGS,
	throttle: 50,
	targetFile: 'foo',
	endUserInfo: {
		file: 'README.md',
		msg: 'TODO',
	},
} satisfies Config;
