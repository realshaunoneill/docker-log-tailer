import fetch from 'node-fetch';

const LOG_REGION = process.env.LOG_REGION;

const INSIGHT_API_URL = `https://${LOG_REGION}.rest.logs.insight.rapid7.com`;

const defaultHeaders = {
    'x-api-key': process.env.API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
};

export const doesLogsetExistForHost = async (hostname) => {
    const logsets = await getUsersLogsets();

    console.log('logsets', Object.keys(logsets));

    return logsets.some(logset => logset.name.toLowerCase() === hostname.toLowerCase());
}

export const createNewLogset = async (logsetName) => {
    const response = await fetch(`${INSIGHT_API_URL}/management/logsets`, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ logset: { name: logsetName } })
    });
    const json = await response.json();
    return json;
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
    const json = await response.json();
    return json;
};