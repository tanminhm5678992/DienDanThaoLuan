import express from 'express';
import expressEjsLayouts from 'express-ejs-layouts';

/**
 * @param {*} app: express.Application
 */
const configViewEngine = (app) => {
    app.use(express.static('./src/public'));
    app.use(expressEjsLayouts);
    app.set('layout', 'Shared/layout');
    app.set('view engine', 'ejs');
    app.set('views', './src/views');
};

export default configViewEngine;