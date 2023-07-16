const os = require('os');
const Docker = require('dockerode');
const Logger = require('r7insight_node');

const HOSTNAME = process.env.HOSTNAME;
const LOG_TOKEN = process.env.LOG_TOKEN;
const LOG_REGION = process.env.LOG_REGION;

const LOG_STREAM_OPTIONS = {
    stdout: true,
    stderr: true,
    tail: '0',
    follow: true,
}

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
if (!docker) {
    throw new Error('Docker is not defined, is the path correct? Exiting...');
}

let logger;
if (!LOG_TOKEN || !LOG_REGION) {
    console.error('LOG_TOKEN is not defined, logs will not be sent to Rapid7 Insight Platform');
} else {
    console.log('LOG_TOKEN is defined, logs will be sent to Rapid7 Insight Platform');
    logger = new Logger({
        token: LOG_TOKEN,
        region: LOG_REGION
    });
}

const handleLogs = ({ names, log, image, id, labels }) => {
    // Map through the names and remove any / from the start
    const filteredNames = names.map(name => name.replace('/', ''));

    console.log(`\nContainer: ${filteredNames} - Log: ${log}`);

    if (LOG_TOKEN && LOG_REGION) {
        logger.info({ image, names: filteredNames, log, id, labels });
    }
};

/**
 * Get the current containers that are running
 * @returns 
 */
const getCurrentContainers = async () => {
    const containers = await docker.listContainers();
    return containers;
};

const searchForLogsFromContainer = async ({ Id, Names, Image, Labels }) => {
    const dockerContainerInstance = docker.getContainer(Id);
    const logStream = await dockerContainerInstance.logs(LOG_STREAM_OPTIONS);

    logStream.on('data', chunk => {
        const logLine = chunk.toString('utf8').replace(/[^\x00-\x7F]/g, "");
        if (logLine && !Labels['disablePostLogging']) {
            handleLogs({ names: Names, log: logLine, image: Image, id: Id, labels: Labels });
        }
    });
};

const run = async () => {
    console.log(`Starting docker-logs-to-rapid7-insight-platform on ${HOSTNAME || os.hostname()}`);

    // Get the initial containers and listen for logs
    const containers = await getCurrentContainers();

    containers.forEach(container => {
        searchForLogsFromContainer(container);
    });

    // if a docker event occurs from a container not in the above list, then re-get the containers
    docker.getEvents((err, stream) => {
        if (err) {
            console.error(err);
            return;
        }
        stream.on('data', async data => {
            const { id } = JSON.parse(data.toString('utf8'));

            // If we are not currently listening for logs from the container, then start listening
            if (!containers.find(container => container.Id === id)) {
                // Then the container is not in the list, so re-get the containers
                const newContainers = await getCurrentContainers();
                const newInstance = newContainers.find(container => container.Id === id)
                if (newInstance) {
                    console.log(`New container found: ${newInstance.Names}, listening for logs...`);
                    searchForLogsFromContainer(newInstance);
                }
            }
        });
    });
};

run();