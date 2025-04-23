#!/usr/bin/env node

/**
 * Module dependencies.
 */

import app from '../app'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()
const debug = require('debug')('core-competencies-skill-development:server')
import selfsigned from 'selfsigned'
import http from 'http'
import https from "https"

/**
 * Get port from environment and store in Express.
 */

const port = process.env.PORT
app.set('port', port)

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: { syscall: string; code: any; }) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    let bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    let addr = server.address();
    let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr!.port;
    debug('Listening on ' + bind);
}
