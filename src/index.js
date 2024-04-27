import express from 'express';
require('dotenv').config();
import bodyParser from 'body-parser';
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const cookieParser = require('cookie-parser');
const { ApolloServer } = require('apollo-server-express');
const createError = require('http-errors');
const logEvents = require('./helpers/logEvents');

import configViewEngine from './config/viewEngine';
// import initAppRoute from './route/appRoute';
import initUserRoute from './route/userRoute';
// import initAdminRoute from './route/adminRoute';
const typeDefs = require('./GraphQL/schema/schema');
const resolvers = require('./GraphQL/resolver/resolver');

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [process.env.LINK_FONTEND, process.env.LINK_ADMIN, "https://noitu.pro"],
        methods: ['GET', 'POST'],
    },
});

//View engine
configViewEngine(app);

app.use(
    cors({
        // exposedHeaders: ['authorization'],
        credentials: true,
        origin: [process.env.LINK_FONTEND, process.env.LINK_ADMIN, "https://noitu.pro"],
    })
);

app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));

app.use(cookieParser());

// initAppRoute(app);
initUserRoute(app);
// initAdminRoute(app);

app.get('/error', (req, res, next) => {
    next(createError.InternalServerError('This is error.'));
});

// app.use((req, res, next) => {
//     next(createError.NotFound('This route is not exits.'))
// })

app.use((err, req, res, next) => {
    if (err.status && err.status >= 500)
        logEvents(
            `${req.url} -- ${req.method} -- ${err.status || 500} -- ${err.message
            }`
        );

    console.log({
        status: err.status || 500,
        errCode: -1,
        errMessage: err.message,
    });
    res.status(200).json({
        status: err.status || 500,
        errCode: -1,
        errMessage: err.message,
    });
});

//web socket
io.on('connection', (socket) => {
    console.log('user connected', Math.floor(Math.random() * 10));

    socket.on('send-email-verify', function (from, msg) {
        console.log('MSG', from, ' saying ', msg);

        io.emit(`email-verify-${from}`, {
            message: 'success',
            linkFe: process.env.LINK_FONTEND,
        });
    });

    socket.on('login-desktop-success', function (key, accessToken) {

        io.emit(`login-desktop-${key}`, {
            message: 'success',
            accessToken
        });
    });

    socket.on('next-music-desktop', function (key) {
        console.log('next-music-desktop', key);

        io.emit(`'next-music-desktop-${key}`, {
            message: 'success',
        });
    });

    socket.on('demo_event', (data) => {
        console.log('demo_event', data);

        io.emit('server_res', 'noi dung gui ve');
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('room-close', (idRoom) => {
        io.emit(`room-close-${idRoom}`);
    });

    socket.on('new-cmt-live', (idRoom, noiDung, nameUser, avatar) => {
        console.log('new-cmt');
        io.emit(`new-cmt-live-${idRoom}`, { noiDung, nameUser, avatar });
    });

    socket.on('next-music-mobile', (id) => {
        console.log('next-music-mobile', id);
        io.emit(`next-music-mobile--${id}`);
    });

    socket.on('prev-music-mobile', (id) => {
        io.emit(`prev-music-mobile--${id}`);
        console.log('prev-music-mobile', id);
    });

    socket.on('pause-music-mobile', (id) => {
        io.emit(`pause-music-mobile--${id}`);
        console.log('pause-music-mobile', id);
    });

    socket.on('resume-music-mobile', (id) => {
        io.emit(`resume-music-mobile--${id}`);
        console.log('resume-music-mobile', id);
    });


});
export const handleEmit = (nameEmit, contentEmit) => {
    io.emit(nameEmit, contentEmit);
};

//graphql
const serverQL = new ApolloServer({
    typeDefs,
    resolvers,
    persistedQueries: false
});

module.exports = {
    server,
    serverQL,
    app
}

//run server
// serverQL.start().then((res) => {
//     serverQL.applyMiddleware({ app });

//     const port = process.env.PORT;
//     server.listen(port, () => {
//         console.log('Runing server succeed!');
//         console.log(`Server RestFull API at http://localhost:${port}/api`);
//         console.log(
//             `Server GraphQL at http://localhost:${port}${serverQL.graphqlPath}`
//         );
//     });
// });
