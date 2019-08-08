/**
 * Server-side Express application
 * - API methods
 * - entry-point to shared React App
 *
 */
import React from 'react';
import { StaticRouter } from 'react-router-dom';
import express from 'express';
import { renderToString } from 'react-dom/server';
import serialize from 'serialize-javascript';

import bodyParser from 'body-parser';
import session from 'express-session';
import pgConnect from 'connect-pg-simple';

import App from './frontend/app';
import db from './db';
import { authUser, createUser, getUserById, getNewUserAPIKey } from './api/user';
import {
    getBuildingById,
    getBuildingLikeById,
    getBuildingUPRNsById
} from './api/building';
import { queryLocation } from './api/search';
import tileserver from './tiles/tileserver';
import { parseBuildingURL } from './parse';

import buildingRouter from './routes/buildings';

// create server
const server = express();

// reference packed assets
const assets = require(process.env.RAZZLE_ASSETS_MANIFEST);

// disable header
server.disable('x-powered-by');

// serve static files
server.use(express.static(process.env.RAZZLE_PUBLIC_DIR));

// parse POSTed json body
server.use(bodyParser.json());

// handle user sessions
const pgSession = pgConnect(session);
const sess = {
    name: 'cl.session',
    store: new pgSession({
        pgPromise: db,
        tableName: 'user_sessions'
    }),
    secret: process.env.APP_COOKIE_SECRET,
    saveUninitialized: false,
    resave: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
};
if (server.get('env') === 'production') {
    // trust first proxy
    server.set('trust proxy', 1)
    // serve secure cookies
    sess.cookie.secure = true
}
server.use(session(sess));

// handle HTML routes (server-side rendered React)
server.get('/*.html', frontendRoute);
server.get('/', frontendRoute);

function frontendRoute(req, res) {
    const context = {};
    const data = {};
    context.status = 200;

    const userId = req.session.user_id;
    const buildingId = parseBuildingURL(req.url);
    const isBuilding = (typeof (buildingId) !== 'undefined');
    if (isBuilding && isNaN(buildingId)) {
        context.status = 404;
    }

    Promise.all([
        userId ? getUserById(userId) : undefined,
        isBuilding ? getBuildingById(buildingId) : undefined,
        isBuilding ? getBuildingUPRNsById(buildingId) : undefined,
        (isBuilding && userId) ? getBuildingLikeById(buildingId, userId) : false
    ]).then(function (values) {
        const user = values[0];
        const building = values[1];
        const uprns = values[2];
        const buildingLike = values[3];
        if (isBuilding && typeof (building) === 'undefined') {
            context.status = 404
        }
        data.user = user;
        data.building = building;
        data.building_like = buildingLike;
        if (data.building != null) {
            data.building.uprns = uprns;
        }
        renderHTML(context, data, req, res)
    }).catch(error => {
        console.error(error);
        data.user = undefined;
        data.building = undefined;
        data.building_like = undefined;
        context.status = 500;
        renderHTML(context, data, req, res);
    });
}

function renderHTML(context, data, req, res) {
    const markup = renderToString(
        <StaticRouter context={context} location={req.url}>
            <App user={data.user} building={data.building} building_like={data.building_like} />
        </StaticRouter>
    );

    if (context.url) {
        res.redirect(context.url);
    } else {
        res.status(context.status).send(
            `<!doctype html>
    <html lang="">
    <head>
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta charset="utf-8" />
        <title>Colouring London</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <style>
          @font-face {
            font-family: 'glacial_cl';
            src: url('/fonts/glacialindifference-regular-webfont.woff2') format('woff2'),
            url('/fonts/glacialindifference-regular-webfont.woff') format('woff');
            font-weight: normal;
            font-style: normal;
          }
        </style>
        ${
    assets.client.css
        ? `<link rel="stylesheet" href="${assets.client.css}">`
        : ''
}
        ${
    process.env.NODE_ENV === 'production'
        ? `<script src="${assets.client.js}" defer></script>`
        : `<script src="${assets.client.js}" defer crossorigin></script>`
}
    </head>
    <body>
        <div id="root">${markup}</div>
        <script>
          window.__PRELOADED_STATE__ = ${serialize(data)}
        </script>
    </body>
</html>`
        );
    }
}

// GET tiles
server.use('/tiles', tileserver);

server.use('/', buildingRouter);

// POST new user
server.post('/users', function (req, res) {
    const user = req.body;
    if (req.session.user_id) {
        res.send({ error: 'Already signed in' });
        return
    }

    if (user.email) {
        if (user.email != user.confirm_email) {
            res.send({ error: 'Email did not match confirmation.' });
            return
        }
    } else {
        user.email = null;
    }

    createUser(user).then(function (result) {
        if (result.user_id) {
            req.session.user_id = result.user_id;
            res.send({ user_id: result.user_id });
        } else {
            req.session.user_id = undefined;
            res.send({ error: result.error });
        }
    }).catch(function (err) {
        console.error(err);
        res.send(err)
    });
});

// POST user auth
server.post('/login', function (req, res) {
    authUser(req.body.username, req.body.password).then(function (user) {
        if (user.user_id) {
            req.session.user_id = user.user_id;
        } else {
            req.session.user_id = undefined;
        }
        res.send(user);
    }).catch(function (error) {
        res.send(error);
    })
});

// POST user logout
server.post('/logout', function (req, res) {
    req.session.user_id = undefined;
    req.session.destroy(function (err) {
        if (err) {
            console.error(err);
            res.send({ error: 'Failed to end session' })
        }
        res.send({ success: true });
    });
});

// GET own user info
server.get('/users/me', function (req, res) {
    if (!req.session.user_id) {
        res.send({ error: 'Must be logged in' });
        return
    }

    getUserById(req.session.user_id).then(function (user) {
        res.send(user);
    }).catch(function (error) {
        res.send(error);
    });
});

// POST generate API key
server.post('/api/key', function (req, res) {
    if (!req.session.user_id) {
        res.send({ error: 'Must be logged in' });
        return
    }

    getNewUserAPIKey(req.session.user_id).then(function (apiKey) {
        res.send(apiKey);
    }).catch(function (error) {
        res.send(error);
    });
})

// GET search
server.get('/search', function (req, res) {
    const searchTerm = req.query.q;
    if (!searchTerm) {
        res.send({
            error: 'Please provide a search term'
        })
        return
    }
    queryLocation(searchTerm).then((results) => {
        if (typeof (results) === 'undefined') {
            res.send({
                error: 'Database error'
            })
            return
        }
        res.send({
            results: results.map(item => {
                // map from DB results to GeoJSON Feature objects
                const geom = JSON.parse(item.st_asgeojson)
                return {
                    type: 'Feature',
                    attributes: {
                        label: item.search_str,
                        zoom: item.zoom || 9
                    },
                    geometry: geom
                }
            })
        })
    }).catch(function (error) {
        res.send(error);
    });
})

export default server;
