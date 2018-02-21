import express from 'express';
import bodyParser from 'body-parser';
import _ from 'lodash';
import kmeans from 'node-kmeans';
import ml from 'machine_learning';
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

export const getKMean = async () => {
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
            y: [...obj.y, [(!isNaN(y) ? y : null)]],
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

    // initialize logistic regression classifier
    const classifier = new ml.LogisticRegression({
        input: classificationData.training.x,
        label: classificationData.training.y,
        // lengths of input and label vectors
        n_in: 2,
        n_out: 1,
    });

    classifier.set('log level', 0);

    // train the classifier
    // TODO: kijk naar deze values
    classifier.train({
        lr: 1.0,
        epochs: 10000,
    });

    const prediction = classifier.predict(classificationData.test.x);
    // console.log(prediction);
    console.timeEnd('Logistic Regression');

    // console.log(prediction);

    // console.log('Entropy:', classifier.getReconstructionCrossEntropy());
    // console.log('W:', classifier.W);
    // console.log('b:', classifier.b);

    await api.post({ path: 'classification/test', server: true, body: JSON.stringify(_.flatten(prediction)) })
        .then(res => console.log('Score:', res));
};

export const decisionTree = async () => {
    console.log('Creating Decision Tree...');
    console.time('Decision tree');
    const dt = new ml.DecisionTree({
        data: classificationData.training.x,
        result: classificationData.training.y,
    });

    // build tree
    dt.build();
    console.timeEnd('Decision tree');

    // avoid overfitting
    dt.prune(1.0);

    // console.log('Classify:', dt.classify(classificationData.test));

    const prediction = JSON.stringify(dt.predict(classificationData.test), null, 2);

    console.log(prediction);

    await api.post({ path: 'classification/test', server: true, body: JSON.stringify(_.flatten(prediction)) })
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
        const data = await getKMean();
        res.status(200).json(data);
    });

    app.get('/classification/training', async (req, res) => {
        res.status(200).json(classificationData.training);
    });

    app.get('/classification/training/tree', async (req, res) => {
        res.status(200).json(classificationData.training);
    });

    app.use((req, res) => {
        res.status(404).send('404');
    });

    // open connection
    app.listen(app.get('port'), async () => {
        await getClusterData();

        await getKMean();

        await getClassificationData('training');
        await getClassificationData('test');

        // await logisticRegression();
        // await decisionTree();

        console.log(`Server ready on port ${app.get('port')}`);
    });
}