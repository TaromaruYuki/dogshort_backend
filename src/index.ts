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

const generatePath = (): string => {
    let outString = '';
    let inOptions = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKMNOPQRSTUVWXYZ123456789';

    for (let i = 0; i < 7; i++) {
      outString += inOptions.charAt(Math.floor(Math.random() * inOptions.length));
    }

    return outString;
}

// End of functions

// Interfaces

interface IURL {
    url: string;
}

interface IURLParams {
    url_path: string
}

interface IRes {
    id: number,
    url: string,
    path: string
}

// End of interfaces

// Methods

server.get("/", async (request, reply) => {
    return {
        routes: {
            get: ["/", "/:url_path"],
            post: ["/"]
        }
    }
});

server.get<{
    Params: IURLParams
}>("/:url_path", {
    preValidation: (request, reply, done) => {
        if(request.params !== null) {
            if(request.params.url_path !== undefined) {
                if(request.params.url_path.length == 7) {
                    done();
                } else {
                    reply.code(400).send({
                        error: `Path ${request.params.url_path} is too long or too short. Needs 7 characters.`
                    });
                }
            } else {
                reply.code(400).send({
                    error: "No url param given."
                });
            }
        } else {
            reply.code(400).send({
                error: "No url param given."
            });
        }
    }
}, async (request, reply) => {
    const { url_path } = request.params;

    const [rows_t] = await pool.query("SELECT * from urls WHERE path = ?", [url_path]);
    const row = rows_t as RowDataPacket[];

    if(row.length <= 0) {
        reply.code(404);

        return {
            error: `Path ${url_path} not found.`
        };
    }

    // It should be safe to take the first index
    // since there can't be any duplicated paths

    const url_info = row[0] as IRes;
    reply.redirect(301, url_info.url);
});

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
    const body_url = request.body.url;
    const url = new URL(body_url);
    console.log(url);

    const [rows_t] = await pool.query("SELECT * FROM urls WHERE url = ?", [url.href]);
    const rows = rows_t as RowDataPacket[];

    if(rows.length != 0) {
        // There should only be 1 row, so it should be the first index
        const url_row = rows[0] as IRes;
        return {
            url: `https://${process.env.DOMAIN}/${url_row.path}`
        }
    } else {
        const path = generatePath();

        const [rows_t] = await pool.execute(`INSERT INTO urls (\`url\`, \`path\`) VALUES ('${url.href}', '${path}')`);

        return {
            url: `https://${process.env.DOMAIN}/${path}`
        }
    }
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