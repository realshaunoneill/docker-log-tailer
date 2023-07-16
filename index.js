const Docker = require('dockerode');
const Logger = require('r7insight_node');

const SEND_LOGS = process.env.SEND_LOGS;
const LOG_TOKEN = process.env.LOG_TOKEN;
const LOG_REGION = process.env.LOG_REGION;
const SILENT_MODE = process.env.SILENT_MODE;

let log;

if (!LOG_TOKEN) {
    console.error('LOG_TOKEN is not defined, logs will not be sent to Rapid7 Insight Platform');
} else {
    log = new Logger({
        token: LOG_TOKEN,
        region: LOG_REGION
    });
}

const docker = new Docker({socketPath: '/var/run/docker.sock'});

if (!docker) {
    throw new Error('Docker is not defined, is the path correct? Exiting...');
}

const handleLogs = ({names, log, image}) => {
    if (!SEND_LOGS || !LOG_TOKEN || !log) {
        return  console.log(`Container: ${names} - Log: ${log}`);
    }

    log.info({image, names, log});
};

const run = async () => {
    const containers = await docker.listContainers();
    if (!SILENT_MODE) {
        console.log('Watching containers for logs: ', containers.length);
    }
    console.log(containers);
    containers.forEach(async ({Id, Names, Image}) => {
        const dockerContainerInstance = docker.getContainer(Id);

        const logStream = await dockerContainerInstance.logs({
            stdout: true,
            stderr: true,
            tail: '0',
            follow: true,
          });
        
          logStream.on('data', (chunk) => {
            const logLine = chunk.toString('utf8');
            handleLogs({names: Names, log: logLine, image: Image});
          });
    });
    
};

run();