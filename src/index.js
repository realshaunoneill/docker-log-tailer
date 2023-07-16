import 'dotenv/config'
import os from 'os';
import Docker from 'dockerode';
import Logger from 'r7insight_node';

import {
    getLogsetForName,
    getLogForContainer,
    createNewLogset,
    createNewLog,
} from './apiUtils.js';

const HOSTNAME = process.env.HOSTNAME || os.hostname();
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

/**
 * Verify that we get all the environment variables we need
 */
if (!process.env.API_KEY) {
    throw new Error('API_KEY is not defined, exiting...');
}

if (!process.env.LOG_REGION) {
    throw new Error('LOG_REGION is not defined, exiting...');
}

if (!process.env.HOSTNAME) {
    console.warn(`HOSTNAME is not defined, using os.hostname() which is ${os.hostname()}}`);
}

/**
 * Get the current containers that are running
 * @returns 
 */
const getCurrentContainers = async () => {
    const containers = await docker.listContainers();
    return containers;
};

const submitLogs = async ({ names, log, image, id, labels }) => {
    // Map through the names and remove any / from the start
    const filteredNames = names.map(name => name.replace('/', ''));

    // Check if the log exists in the logset
    const containerLog = await getLogForContainer(filteredNames[0], HOSTNAME);

    const logData = JSON.stringify({ image, names: filteredNames, log, id, labels });
    if (!containerLog) {
        // Create the log
        console.log(`Log for ${filteredNames[0]} does not exist, creating...`);
        const newLog = await createNewLog(filteredNames[0], HOSTNAME);

        const r7Logger = new Logger({
            token: newLog.tokens[0],
            region: LOG_REGION
        });
        r7Logger.log(logData);
    } else {
        console.log(`Log for ${filteredNames[0]} exists, sending logs...`);
        const r7Logger = new Logger({
            token: containerLog.tokens[0],
            region: LOG_REGION
        });
        r7Logger.log(logData);
    }
};

const searchForLogsFromContainer = async ({ Id, Names, Image, Labels }) => {
    const dockerContainerInstance = docker.getContainer(Id);
    const logStream = await dockerContainerInstance.logs(LOG_STREAM_OPTIONS);

    logStream.on('data', chunk => {
        const logLine = chunk.toString('utf8').replace(/[^\x00-\x7F]/g, "");
        if (logLine && !Labels['disableLogging'] || names.includes('log-tailer')) {
            submitLogs({ names: Names, log: logLine, image: Image, id: Id, labels: Labels });
        }
    });
};

const run = async () => {
    // Get the initial containers and listen for logs
    const containers = await getCurrentContainers();

    // Get the current logsets in ops and verify that the container is in the list
    const doesHostnameLogsetExist = await getLogsetForName(HOSTNAME);
    if (!doesHostnameLogsetExist) {
        console.log(`Logset for ${HOSTNAME} does not exist, creating...`);
        const res = await createNewLogset(HOSTNAME);
        if (res.ok) {
            console.log(`Logset for ${HOSTNAME} created successfully`);
        }
    }

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
                const newContainers = await getCurrentContainers();
                const newInstance = newContainers.find(container => container.Id === id)
                if (newInstance) {
                    console.log(`New container found: ${newInstance.Names}, listening for logs...`);
                    containers.push(newInstance);
                    searchForLogsFromContainer(newInstance);
                }
            }
        });
    });
};

run();