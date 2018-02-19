import express from 'express';
import bodyParser from 'body-parser';
import _ from 'lodash';
import kmeans from 'node-kmeans';
import ml from 'machine_learning';
import euclidianDistance from 'euclidean-distance';
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
    return array.map(({ x }) => [...x]);
};

export const dressClassData = (array) => {
    return array.reduce((obj, { x, y }) => ({
        x: [...obj.x, x],
        y: [...obj.y, [(!isNaN(y) ? y : null)]],
    }), { x: [], y: [] });
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
    classifier.train({
        lr: .06,
        epochs: 3000,
    });

    const prediction = classifier.predict(classificationData.test.x);
    // console.log(prediction);

    console.log('Entropy:', classifier.getReconstructionCrossEntropy());
    console.log('W:', classifier.W);
    console.log('b:', classifier.b);

    await api.post({ path: 'classification/test', server: true, body: JSON.stringify(_.flatten(prediction)) })
        .then(res => console.log('Score:', res));
};

export const decisionTree = async () => {
    const dt = new ml.DecisionTree({
        data: classificationData.training.x,
        result: classificationData.training.y,
    });

    // build tree
    dt.build();

    // avoid overfitting
    dt.prune(1.0);

    // print tree
    // dt.print();

    console.log('Classify:', dt.classify([1, 0]));

    // root node of tree
    // const tree = dt.getTree();

    // console.log('True branch of this node', tree.tb);
    // console.log('False branch of this node', tree.fb);
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