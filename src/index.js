import 'regenerator-runtime/runtime';
import Chart from 'chart.js';

document.addEventListener('DOMContentLoaded', async () => {
    const data = await fetch('http://localhost:3000/clustering/training').then(result => result.json());
    const ctx = document.getElementById('chart').getContext('2d');

    console.log(Chart.defaults.global);

    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: data,
        },
        options: {
            maintainAspectRatio: false,
            title: {
                display: true,
                text: 'K-Means Unsupervised Clustering',
            },
        },
    });
});
