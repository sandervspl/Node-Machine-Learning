import express from 'express';
import kmeans from 'node-kmeans';
import * as api from './api';

export const getData = async () => {
    return await api.get({ path: '0832970/clustering/training' });
};

export const train = (data) => {
    console.log('Clustering...');
    kmeans.clusterize(
        data,
        { k: 5 },
        (err, result) => {
            if (err) {
                console.error(err);
            } else {
                console.log(JSON.stringify(result, null, 2));
            }
        },
    );
    console.log('Done!');
};

export const dressData = (array) => {
    return array.map((obj) => [
        obj.x[0],
        obj.x[1],
    ]);
};

export const start = async () => {
    let data = await getData();

    if (data) {
        data = dressData(data);
        train(data);
    }
};

if (process.env.NODE_ENV !== 'test') {
    const app = express();
    app.set('port', 3000);

    app.listen(app.get('port'), async () => {
        console.log(`Server started on port ${app.get('port')}`);
        await start();
    });
}
