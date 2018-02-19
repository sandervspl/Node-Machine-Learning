import nodeFetch from 'node-fetch';
import _ from 'lodash';
import { API_HOST, SERVER_HOST } from './secret';

const request = async (options) => {
    const f = options.server ? nodeFetch : fetch;
    const h = options.server ? API_HOST : SERVER_HOST;

    return await f(`${h}/${options.path}`, _.omit(options, 'server'))
        .then(response => response.json())
        .catch(err => console.error('Error!', err));
};

const createRequest = (options) => {
    return (otherOptions) => {
        return request({
            ...options,
            ...otherOptions,
        });
    };
};

export const get = createRequest({
    headers: { 'Accept': 'application/json' }
});
export const post = createRequest({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
});
