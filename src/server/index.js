import express from 'express';
import bodyParser from 'body-parser';
import * as api from '../helpers/api';
import kmeans from 'node-kmeans';
import randomColor from 'randomcolor';
import euclidianDistance from 'euclidean-distance';

let clusterData = [];

export const getData = async () => {
    return await api.get({ path: '0832970/clustering/training', server: true });
};

export const clustering = async (data, k = 5) => {
    return new Promise((resolve, reject) => kmeans.clusterize(
        data,
        { k },
        (err, result) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(result);
            }
        },
    ));
};

export const getKMean = async () => {
    const maxK = 20;
    const color = randomColor();
    const data = {
        backgroundColor: color,
        borderColor: color,
        points: [],
    };

    for (let k = 2; k <= maxK; k += 1) {
        const clusters = await clustering(clusterData, k);

        const { x, y } = clusters.reduce((obj, _clusterData) => ({
            x: [...obj.x, _clusterData.centroid[0]],
            y: [...obj.y, _clusterData.centroid[1]],
        }), { x: [], y: [] });

        data.points.push({
            x: k,
            y: euclidianDistance(x, y),
        });
    }

    return data;
};

export const dressData = (array) => {
    return array.map((obj) => [
        obj.x[0],
        obj.x[1],
    ]);
};

export const clusteringTraining = async () => {
    return clustering(clusterData)
        .then((clusters) => {
            return clusters.map((clusterData, i) => {
                const color = randomColor();
                return {
                    label: `Cluster ${i + 1}`,
                    backgroundColor: color,
                    borderColor: color,
                    data: clusterData.cluster.map(([x, y]) => ({ x, y })), // return array of objects with x and y data
                };
            });
        });
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
        const data = await clusteringTraining();
        // console.log(JSON.stringify(data, null, 2));
        res.status(200).json(data);
    });

    app.get('/clustering/training/elbow', async (req, res) => {
        const data = await getKMean();
        res.status(200).json(data);
    });

    app.use((req, res) => {
        res.status(404).send('404');
    });

    // open connection
    app.listen(app.get('port'), async () => {
        console.log(`Server started on port ${app.get('port')}`);
        clusterData = await getData();
        clusterData = dressData(clusterData);
    });
}