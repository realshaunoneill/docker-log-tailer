const Docker = require('dockerode');
const Logger = require('r7insight_node');

const LOG_TOKEN = process.env.LOG_TOKEN;
const LOG_REGION = process.env.LOG_REGION;

const LOG_STREAM_OPTIONS = {
    stdout: true,
    stderr: true,
    tail: '0',
    follow: true,
}

const docker = new Docker({socketPath: '/var/run/docker.sock'});
if (!docker) {
    throw new Error('Docker is not defined, is the path correct? Exiting...');
}

let log;
if (!LOG_TOKEN) {
    console.error('LOG_TOKEN is not defined, logs will not be sent to Rapid7 Insight Platform');
} else {
    console.log('LOG_TOKEN is defined, logs will be sent to Rapid7 Insight Platform');
    log = new Logger({
        token: LOG_TOKEN,
        region: LOG_REGION
    });
}

const handleLogs = ({names, log, image, id, labels}) => {
    // Map through the names and remove any / from the start
    const filteredNames = names.map(name => name.replace('/', ''));
    
    console.log(`Container: ${filteredNames} - Log: ${log}`);

    if (LOG_TOKEN && LOG_REGION) {
        log.info({image, names: filteredNames, log, id, labels});
    }
};

const run = async () => {
    const containers = await docker.listContainers();
    console.log(`Watching containers for logs: `, containers.length);

    containers.forEach(async ({Id, Names, Image, Labels}) => {
        const dockerContainerInstance = docker.getContainer(Id);
        const logStream = await dockerContainerInstance.logs(LOG_STREAM_OPTIONS);
        
        logStream.on('data', chunk => {
            const logLine = chunk.toString('utf8').replace(/[^\x00-\x7F]/g, "");
            if (!Labels['disablePostLogging']) {
                handleLogs({names: Names, log: logLine, image: Image, id: Id, labels: Labels});
            }
        });
    });
};

run();