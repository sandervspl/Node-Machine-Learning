import express from 'express';

if (process.env.NODE_ENV !== 'test') {
    const app = express();
    app.set('port', 3000);

    app.listen(app.get('port'), async () => {
        console.log(`Server started on port ${app.get('port')}`);
    })
}
