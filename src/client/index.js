import 'regenerator-runtime/runtime';
import Chart from 'chart.js';
import * as api from '../helpers/api'

document.addEventListener('DOMContentLoaded', async () => {
    const clusteringData = await api.get({ path: 'clustering/training' });
    const elbowData = await api.get({ path: 'clustering/training/elbow' });

    // debug
    window.clusteringData = clusteringData;
    window.elbowData = elbowData;

    Chart.defaults.global.maintainAspectRatio = false;
    Chart.defaults.global.responsive = false;

    new Chart('chartClustering', {
        type: 'scatter',
        data: {
            datasets: clusteringData,
        },
        options: {
            title: {
                display: true,
                text: 'K-Means Unsupervised Clustering',
            },
        },
    });

    new Chart('chartKmeans', {
        type: 'line',
        data: {
            labels: elbowData.points.map(point => point.x),
            datasets: [{
                label: 'Aggregate Distance',
                data: elbowData.points,
                backgroundColor: elbowData.backgroundColor,
                borderColor: elbowData.borderColor,
                fill: false,
            }],
        },
        options: {
            title: {
                display: true,
                text: 'Clusters vs Aggregate Distance',
            },
            scales: {
                xAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Clusters',
                    },
                }],
                yAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Aggregate Distance',
                    },
                }],
            },
        },
    });
});
