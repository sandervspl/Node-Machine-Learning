import express from 'express';
import bodyParser from 'body-parser';
import _ from 'lodash';

import kmeans from 'node-kmeans';
import Matrix from 'ml-matrix';
import LogisticRegression from 'ml-logistic-regression';
import { DecisionTreeRegression } from 'ml-cart';
import euclideanDistance from 'euclidean-distance';

import randomColor from 'randomcolor';
import * as api from '../helpers/api';

let clusterData = [];
let classificationData = {
    training: [],
    test: [],
};

export const getClusterData = async () => {
    clusterData = await api.get({ path: 'clustering/training', server: true })
        .then(dressData);
};

export const getClassificationData = async (type) => {
    const data = await api.get({ path: `classification/${type}`, server: true });
    classificationData[type] = dressClassData(data);
};

export const clustering = async (data, k = 7) => {
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

export const calculateElbowMethod = async () => {
    const maxK = 50;
    const color = randomColor();
    const data = {
        backgroundColor: color,
        borderColor: color,
        points: [],
    };

    for (let k = 2; k <= maxK; k += 1) {
        const clusters = await clustering(clusterData, k);

        // calculate average distance of all datapoints to its centroid for entire cluster
        const avgDistance = clusters.reduce((sum, { centroid, cluster }) => {
            // calculate total distance of all datapoints to its centroid
            const totalDistance = cluster.reduce((sum2, datapoint) => {
                return sum2 + Math.abs(euclideanDistance(datapoint, centroid)) ** 2;
            }, 0);

            return sum + totalDistance / cluster.length;
        }, 0);

        // average error per k (groups)
        const sse = avgDistance / k;

        data.points.push({
            x: k,
            y: sse,
        });
    }

    return data;
};

export const dressData = (array) => {
    return array.map(({ x }) => [...x]);
};

export const dressClassData = (array) => {
    return array.reduce((obj, { x, y }) => {
        return {
            x: [...obj.x, x],
            y: [...obj.y, (!isNaN(y) ? y : null)],
        };
    }, { x: [], y: [] });
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

export const logisticRegression = async () => {
    console.log('Calculating Logistic Regression...');
    console.time('Logistic Regression');

    const x = new Matrix(classificationData.training.x);
    const y = Matrix.columnVector(classificationData.training.y);

    const xTest = new Matrix(classificationData.test.x);

    const logreg = new LogisticRegression({
        numSteps: 1000,
        // One way to resolve this problem is to divide the λ with 1/N, where N is the size of the training data.
        // http://blog.datumbox.com/tuning-the-learning-rate-in-gradient-descent/
        learningRate: 1 / classificationData.training.x.length,
    });

    logreg.train(x, y);

    const prediction = logreg.predict(xTest);

    console.timeEnd('Logistic Regression');

    await api.post({
        path: 'classification/test',
        server: true,
        body: JSON.stringify(_.flatten(prediction)),
    })
        .then(res => console.log('Score:', res));
};

export const decisionTree = async () => {
    console.log('Creating Decision Tree...');
    console.time('Decision tree');

    const dt = new DecisionTreeRegression();
    dt.train(classificationData.training.x, classificationData.training.y);

    const prediction = dt.predict(classificationData.test.x);

    console.timeEnd('Decision tree');

    await api.post({
        path: 'classification/test',
        server: true,
        body: JSON.stringify(_.flatten(prediction)),
    })
        .then(res => console.log('Score:', res));
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
        res.status(200).json(data);
    });

    app.get('/clustering/training/elbow', async (req, res) => {
        const data = await calculateElbowMethod();
        res.status(200).json(data);
    });

    app.use((req, res) => {
        res.status(404).send('404');
    });

    // open connection
    app.listen(app.get('port'), async () => {
        await getClusterData();

        await getClassificationData('training');
        await getClassificationData('test');

        await logisticRegression();
        await decisionTree();

        console.log(`Server ready on port ${app.get('port')}`);
    });
}