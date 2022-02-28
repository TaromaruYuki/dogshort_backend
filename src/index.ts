// Imports and constants
import { fastify } from 'fastify';
import pino from 'pino';
import { createPool, RowDataPacket } from 'mysql2';
import 'dotenv/config';
const port = process.env.PORT || 3000;

const server = fastify({
    logger: pino({ level: 'info' })
});

const s_pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATA
});

const pool = s_pool.promise();

// End of imports and constants

// Functions

const validURL = (url: string): boolean => {
    const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))'+ // ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ //port
            '(\\?[;&amp;a-z\\d%_.~+=-]*)?'+ // query string
            '(\\#[-a-z\\d_]*)?$','i');

    return pattern.test(url);
}

// End of functions

// Interfaces

interface IURL {
    url: string;
}

// End of interfaces

// Methods

server.post<{
    Body: IURL
}>("/", {
    preValidation: (request, reply, done) => {
        if(request.body !== null) {
            if(request.body.url !== undefined) {
                done();
            } else {
                reply.code(400).send({
                    error: "URL is required"
                });
            }
        } else {
            reply.code(400).send({
                error: "Body is required"
            });
        }
    }
}, async (request, reply) => {
    const { url } = request.body;

    if(!validURL(url)) {
        reply.code(400);
        return {
            error: "URL is not valid"
        };
    }

    const [rows_t] = await pool.query("SELECT * FROM urls WHERE url = ?", [url]);
    const rows = rows_t as RowDataPacket[];

    if(rows.length != 0) {

    }

    return {}
});

// End of methods

// Start

const start = async () => {
    try {
        await server.listen(port);
        server.log.info("Server started successfully");
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();

// End of start