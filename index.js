const Docker = require('dockerode');
const Logger = require('r7insight_node');

const SEND_LOGS = process.env.SEND_LOGS;
const LOG_TOKEN = process.env.LOG_TOKEN;
const LOG_REGION = process.env.LOG_REGION;

if (!LOG_TOKEN) {
    console.error('LOG_TOKEN is not defined, logs will not be sent to Rapid7 Insight Platform');
}

const log = new Logger({
    token: LOG_TOKEN,
    region: LOG_REGION
});

const docker = new Docker({socketPath: '/var/run/docker.sock'});

if (!docker) {
    throw new Error('Docker is not defined, is the path correct?');
}

const getContainers = async () => {
    const containers = await docker.listContainers();
    return containers;
};

const handleLogs = (containerName, log) => {
    if (!SEND_LOGS || !LOG_TOKEN) {
        return  console.log(`Container: ${containerName} - Log: ${log}`);
    }

    // Send logs to Rapid7 Insight Platform
    log.info({name: containerName, log});
};

const run = async () => {
    const containers = await getContainers();
    console.log('Watching containers for logs: ', containers.length);
    containers.forEach(async containerInfo => {
        const dockerContainer = docker.getContainer(containerInfo.Id);

        const logStream = await dockerContainer.logs({
            stdout: true,
            stderr: true,
            tail: '0',
            follow: true,
          });
        
          logStream.on('data', (chunk) => {
            const logLine = chunk.toString('utf8');
            handleLogs(containerInfo.Names, logLine);
          });
    });
    
};

run();