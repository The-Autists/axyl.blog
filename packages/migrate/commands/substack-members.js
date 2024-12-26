import {inspect} from 'node:util';
import {ui} from '@tryghost/pretty-cli';
import substackMembers from '../sources/substack-members.js';
import {GhostLogger} from '@tryghost/logging';
import logConfig from '../lib/loggingrc.js';
import {showLogs} from '../lib/utilties/cli-log-display.js';
import {convertOptionsToSywac, convertOptionsToDefaults} from '../lib/utilties/options-to-sywac.js';

const logger = new GhostLogger(logConfig);

// Internal ID in case we need one.
const id = 'substack-members';

const group = 'Sources:';

// The command to run and any params
const flags = 'substack-members';

// Description for the top level command
const desc = 'Migrate from Substack subscribers CSV';

// Configure all the options
const options = [
    {
        type: 'string',
        flags: '--pathToFile',
        defaultValue: null,
        desc: 'Path to the signups CSV file',
        required: true
    },
    {
        type: 'boolean',
        flags: '-V --verbose',
        defaultValue: Boolean(process?.env?.DEBUG),
        desc: 'Show verbose output'
    },
    {
        type: 'boolean',
        flags: '--zip',
        defaultValue: true,
        desc: 'Create a zip file (set to false to skip)'
    },
    {
        type: 'string',
        flags: '--subs',
        defaultValue: null,
        desc: 'Path to the subscribers CSV file (paid, comp, gift) as generated by Substack ("Subscribers").'
    },
    {
        type: 'number',
        flags: '-l, --limit',
        defaultValue: 50000,
        desc: 'Define the batch limit for import files.'
    },
    {
        type: 'string',
        flags: '--comp',
        defaultValue: '0:free',
        choices: ['YY:none', 'YY:free', 'YYYYMMDD:none', 'YYYYMMDD:free'],
        desc: 'Provide two values in the format "YY|YYYYMMDD:none|free". YY is the threshold in years or YYYYMMDD as the exact date after which Substack `comp` members should receive a complimentary plan depending on the expiry date. "none|free" the option how to import members before this threshold, e. g. 5:free'
    },
    {
        type: 'string',
        flags: '--gift',
        defaultValue: '0:free',
        choices: ['YY:none', 'YY:free', 'YYYYMMDD:none', 'YYYYMMDD:free'],
        desc: 'Provide two values in the format "YY|YYYYMMDD:none|free". YY is the threshold in years or YYYYMMDD as the exact date after which Substack `gift` members should receive a complimentary plan depending on the expiry date. "none|free" the option how to import members before this threshold, e. g. 5:free'
    },
    {
        type: 'string',
        flags: '--compLabel',
        defaultValue: 'substack-comp',
        desc: 'Provide a label for Substack `comp` subscribers'
    },
    {
        type: 'string',
        flags: '--giftLabel',
        defaultValue: 'substack-gift',
        desc: 'Provide a label for Substack `gift` subscribers'
    },
    {
        type: 'string',
        flags: '--freeLabel',
        defaultValue: 'substack-free',
        desc: 'Provide a label for Substack free subscribers'
    },
    {
        type: 'string',
        flags: '--paidLabel',
        defaultValue: 'substack-paid',
        desc: 'Provide a label for Substack paid subscribers'
    },
    {
        type: 'boolean',
        flags: '--outputSingleCSV',
        defaultValue: false,
        desc: 'Choose where to export a single CSV or one for each type. If true, `--limit` is ignored'
    },
    {
        type: 'boolean',
        flags: '--writeCSV',
        defaultValue: false,
        desc: 'Create a final CSV file'
    },
    {
        type: 'boolean',
        flags: '--cache',
        defaultValue: true,
        desc: 'Persist local cache after migration is complete (Only if `--zip` is `true`)'
    },
    {
        type: 'string',
        flags: '--tmpPath',
        defaultValue: null,
        desc: 'Specify the full path where the temporary files will be stored (Defaults a hidden tmp dir)'
    },
    {
        type: 'string',
        flags: '--outputPath',
        defaultValue: null,
        desc: 'Specify the full path where the final zip file will be saved to (Defaults to CWD)'
    },
    {
        type: 'string',
        flags: '--cacheName',
        defaultValue: null,
        desc: 'Provide a unique name for the cache directory (defaults to a UUID)'
    }
];

// Build an object of defaults to be exported - Not used here, but needs to be provided
const defaults = convertOptionsToDefaults(options);

// Convert `options` into a list of Sywac types
const setup = sywac => convertOptionsToSywac(options, sywac);

const parseCompGift = (val) => {
    let [yearsOrDate, before] = val.split(':');

    try {
        if (yearsOrDate.length >= 4) {
            yearsOrDate = new Date(yearsOrDate.replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, `$1-$2-$3T12:00:00+0000`));
        } else {
            yearsOrDate = parseInt(yearsOrDate);
        }
    } catch (error) {
        ui.log.info('Failed to parse passed in date/years for threshold, falling back to 10. Ensure the correct format');
        yearsOrDate = 10;
    }
    return {
        thresholdYearOrDate: yearsOrDate,
        beforeThreshold: before
    };
};

// What to do when this command is executed
const run = async (argv) => {
    let context = {
        errors: [],
        warnings: []
    };

    const startMigrationTime = Date.now();

    if (argv.subs) {
        argv.hasSubscribers = true;
    }

    if (argv.verbose) {
        ui.log.info(`Migrating from export at ${argv.pathToFile}${argv.subs ? ` and ${argv.subs}` : ``}`);
    }

    argv.comp = parseCompGift(argv.comp);
    argv.gift = parseCompGift(argv.gift);

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let migrate = substackMembers.getTaskRunner(argv, logger);

        // Run the migration
        await migrate.run(context);

        if (argv.verbose) {
            ui.log.info('Done', inspect(context.result.data, false, 2));
        }
    } catch (error) {
        ui.log.info('Done with errors', context.errors);
    }

    if (argv.verbose) {
        ui.log.info(`Cached files can be found at ${context.fileCache.cacheDir}`);

        if (context.logs) {
            ui.log.info(`Adjusted members due to passed in options:`);

            context.logs.forEach((log) => {
                ui.log.info(log.info);
            });
        }
    }

    if (context.result.skip) {
        context.result.skip.forEach((skipped) => {
            ui.log.warn(`Skipped import: ${skipped.info}`);
        });
    }

    showLogs(logger, startMigrationTime);
};

export default {
    id,
    group,
    flags,
    desc,
    setup,
    run,
    defaults
};

export {
    parseCompGift
};
