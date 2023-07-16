import fetch from 'node-fetch';

const LOG_REGION = process.env.LOG_REGION;

const INSIGHT_API_URL = `https://${LOG_REGION}.rest.logs.insight.rapid7.com`;

const defaultHeaders = {
    'x-api-key': process.env.API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
};

export const getLogsetExistForName = async (name) => {
    const logsets = await getUsersLogsets();

    return logsets.find(logset => logset.name.toLowerCase() === name.toLowerCase());
}

export const getLogForContainer = async (containerName) => {
    const logs = await getUsersLogs();

    return logs.find(log => log.name.toLowerCase() === containerName.toLowerCase());
};

export const createNewLogset = async (logsetName) => {
    const response = await fetch(`${INSIGHT_API_URL}/management/logsets`, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ logset: { name: logsetName } })
    });
    const json = await response.json();
    return json;
};

export const createNewLog = async (logName, parentLogsetName) => {
    const parentLogset = await getLogsetExistForName(parentLogsetName);
    
    const response = await fetch(`${INSIGHT_API_URL}/management/logs`, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({
            logs:{
                name: logName,
                logsets_info: [{
                    id: parentLogset.id,
                    name: parentLogset.name,
                }]
            } 
        })
    });
    const {log} = await response.json();
    return log;
};

export const getUsersLogsets = async () => {
    const response = await fetch(`${INSIGHT_API_URL}/management/logsets`, {
        headers: defaultHeaders
    });
    const {logsets} = await response.json();
    return logsets;
};

export const getUsersLogs = async () => {
    const response = await fetch(`${INSIGHT_API_URL}/management/logs`, {
        headers: defaultHeaders
    });
    const {logs} = await response.json();
    return logs;
};