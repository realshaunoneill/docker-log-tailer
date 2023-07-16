import 'dotenv/config'
import os from 'os';
import Docker from 'dockerode';
import fetch from 'node-fetch';

import {
    getLogsetForName,
    getLogForContainer,
    createNewLogset,
    createNewLog,
} from './apiUtils.js';

const HOSTNAME = process.env.HOSTNAME || os.hostname();
const LOG_REGION = process.env.LOG_REGION;

const WEBHOOK_URL = `https://${LOG_REGION.toLowerCase()}.webhook.logs.insight.rapid7.com/v1/noformat/`;

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
    try {
        // Map through the names and remove any / from the start
        const filteredNames = names.map(name => name.replace('/', ''));

        // Check if the log exists in the logset
        const containerLog = await getLogForContainer(filteredNames[0], HOSTNAME);

        const logData = JSON.stringify({ image, names: filteredNames, log, id, labels });
        if (!containerLog) {
            // Create the log
            console.log(`Log for ${filteredNames[0]} does not exist, creating...`);
            const newLog = await createNewLog(filteredNames[0], HOSTNAME);

            await fetch(WEBHOOK_URL + newLog.tokens[0], {
                method: 'POST',
                body: logData
            });
        } else {
            await fetch(WEBHOOK_URL + containerLog.tokens[0], {
                method: 'POST',
                body: logData
            });
        }
    } catch (error) {
        console.error(error);
    }
};

const searchForLogsFromContainer = async ({ id, names, image, labels }) => {
    const dockerContainerInstance = docker.getContainer(id);
    const logStream = await dockerContainerInstance.logs(LOG_STREAM_OPTIONS);

    logStream.on('data', chunk => {
        const logLine = chunk.toString('utf8').replace(/[^\x20-\x7E]/g, "");
        if (logLine && !labels['disableLogging'] || (names && names.includes('log-tailer'))) {
            submitLogs({ names, log: logLine, image, id, labels });
        }
    });
};

const run = async () => {
    // Get the initial containers and listen for logs
    const containers = await getCurrentContainers();

    // Get the current logsets in ops and verify that the container is in the list
    const doesHostnameLogsetExist = await getLogsetForName(HOSTNAME);
    if (!doesHostnameLogsetExist) {
        console.log(`Logset for host ${HOSTNAME} does not exist, creating...`);
        const res = await createNewLogset(HOSTNAME);
        if (res.ok) {
            console.log(`Logset for ${HOSTNAME} created successfully`);
        }
    }

    containers.forEach(({ Id, Names, Image, Labels }) => {
        searchForLogsFromContainer({ id: Id, names: Names, image: Image, labels: Labels });
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