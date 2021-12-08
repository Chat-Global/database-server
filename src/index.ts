require('dotenv').config();

const { createServer } = require('http');
const { Server } = require('socket.io');

const express = require('express');
const db = require('quick.db');

const app = express();

const port = process.env.PORT || 4000;
const server = createServer(app);
const io = new Server(server);

// Settings

app.set('port', port);
app.set('json spaces', 2);

// Middlewares

app.use(express.json());
app.use(
	express.urlencoded({
		extended: false
	})
);

let connections = 0;

app.get('/', (req: any, res: any) => {
    res.status(200).json({ connections: connections });
})

io.use((socket: any, next: any) => {
	if (socket.handshake.query && socket.handshake.query.authorization) {
		if (socket.handshake.query.authorization !== process.env.DB_AUTH) {
			return next(new Error('Authentication error'));
		} else {
			next();
		}
	} else {
		next(new Error('Authentication error'));
	}
}).on('connection', (socket: any) => {
    try {
        connections = socket.adapter.sids.size;
        console.log(`[WebSocket] A connection has been made. (${socket.id}) ${socket.adapter.sids.size} connected clients.`);

        socket.on('error', (err?: any) => {
            console.log('Socket error')
            if (err) {
                socket.disconnect();
            }
        });

        socket.on('ping', (callback: any) => {
            callback();  
        });

        socket.on('add', (table: string, key: string, value: any, callback: any) => {
            callback(dbRequest(table, 'add', key, value));  
        });

        socket.on('all', (table: string, callback: any) => {
            callback(dbRequest(table, 'all'));  
        });

        socket.on('delete', (table: string, key: string, callback: any) => {
            callback(dbRequest(table, 'delete', key));   
        });

        socket.on('get', (table: string, key: string, callback: any) => {
            callback(dbRequest(table, 'get', key));   
        });

        socket.on('has', (table: string, key: string, callback: any) => {
            callback(dbRequest(table, 'has', key));   
        });

        socket.on('push', (table: string, key: string, value: any, callback: any) => {
            callback(dbRequest(table, 'push', key, value));   
        });

        socket.on('set', (table: string, key: string, value: any, callback: any) => {
            callback(dbRequest(table, 'set', key, value));   
        });

        socket.on('subtract', (table: string, key: string, value: any, callback: any) => {
            callback(dbRequest(table, 'subtract', key, value));  
        });

        socket.on('queries', (table: string, queriesArray: any, callback: any) => {
            callback(dbRequest(table, 'queries', queriesArray));  
        });

        socket.on('disconnect', (reason: string) => {
            connections = socket.adapter.sids.size;
            console.log(`[WebSocket] Socket ${socket.id} disconnected. (${reason}) ${socket.adapter.sids.size} connected clients.`);
        });

    } catch (e) {
        console.log(e.toString())
    }
});

function dbRequest(reqTable: string, method: string, key?: any, value?: any) {

    try {
        if (method != 'queries') {
            let table;

            if (reqTable && reqTable != 'db') {
                table = new db.table(reqTable);
            } else {
                table = db;
            }

            if (method == 'add') {
                return { status: 'success', response: table.add(key, value) };
            }
            if (method == 'all') {
                return { status: 'success', response: table.all() };
            }
            if (method == 'delete') {
                return { status: 'success', response: table.delete(key) };
            }
            if (method == 'get') {
                return { status: 'success', response: table.get(key) };
            }
            if (method == 'has') {
                return { status: 'success', response: table.has(key) };
            }
            if (method == 'push') {
                return { status: 'success', response: table.push(key, value) };
            }
            if (method == 'set') {
                return { status: 'success', response: table.set(key, value) };
            }
            if (method == 'subtract') {
                return { status: 'success', response: table.subtract(key, value) };
            }

            return false;
        } else {
            const results = [];

            for (const { table: queryTable, method: queryMethod, key: queryKey, value: queryValue } of key) {
                results.push(
                    dbRequest(queryTable, queryMethod, queryKey, queryValue)
                );
            }

            return results;
        }
    } catch (error) {
        return { status: 'error', text: error.toString() };
    }
}

server.listen(app.get('port'), () => {
	console.log(`[WebServer] App listening on port ${app.get('port')}`);
});
