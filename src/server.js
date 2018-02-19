import express from 'express';
import bodyParser from 'body-parser';
import * as api from './api';
import kmeans from 'node-kmeans';
import randomColor from 'randomcolor';

export const getData = async () => {
    return await api.get({ path: '0832970/clustering/training' });
};

export const train = (data) => {
    console.log('Clustering...');
    return new Promise((resolve, reject) => kmeans.clusterize(
        data,
        { k: 20 },
        (err, result) => {
            console.log('Done!');

            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(result);
            }
        },
    ))
        .then((result) => {
            return result.map((collection, i) => ({
                label: `Cluster ${i + 1}`,
                backgroundColor: randomColor({ format: 'rgba' }),
                data: collection.cluster.map(([x, y]) => ({ x, y })), // return array of objects with x and y data
            }));
        });
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
        return train(data);
    }
};

if (process.env.NODE_ENV !== 'test') {
    const app = express();
    app.set('port', 3000);

    // block the header from containing information about the server
    app.disable('x-powered-by');

    // body parser — to be able to read body content
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    app.get('/clustering/training', async (req, res) => {
        console.log('get data...');

        const data = await start();
        // console.log(JSON.stringify(data, null, 2));
        res.status(200).json(data);
    });

    app.use((req, res) => {
        res.status(404).send('404');
    });

    // open connection
    app.listen(app.get('port'), () => {
        console.log(`Server started on port ${app.get('port')}`);
    });
}