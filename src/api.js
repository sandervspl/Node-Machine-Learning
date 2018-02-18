import fetch from 'node-fetch';
import { API_HOST } from './secret';

const request = async (options) => {
    return await fetch(`${API_HOST}/${options.path}`, options)
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
