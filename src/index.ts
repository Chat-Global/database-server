
const { io } = require('socket.io-client');
require('dotenv').config();

const uri = process.env.DB_URI;
const authorization = process.env.DB_AUTH;

const WSClient = io(uri, {
	query: {
		authorization: authorization
	}
});

console.log('[WS DB] Trying to connect to the DataBase WebSocket...');

WSClient.on('connect_error', (error: string) => {
	console.log(
		`[WS DB] Error while trying to connect to the DataBase Websocket! (${error})`
	);
});

WSClient.on('connect', () => {
	console.log(
		`[WS DB] Connected to the DataBase WebSocket! (${WSClient.id})`
	);
});

WSClient.on('disconnect', (reason) => {
	console.log(
		`[WS DB] Disconnected from the DataBase Websocket. (${reason})`
	);
});

function dbRequest(table: any, method: string, key?: any, value?: any) {
	if (
		method === 'add' ||
		method === 'set' ||
		method === 'push' ||
		method === 'subtract'
	) {
		return new Promise((resolve, reject) => {
			WSClient.emit(method, table, key, value, (resp) => {
				resolveResponse(resp, resolve, reject);
			});
		});
	}
	if (method === 'all') {
		return new Promise((resolve, reject) => {
			WSClient.emit(method, table, (resp) => {
				resolveResponse(resp, resolve, reject);
			});
		});
	}
	if (method === 'delete' || method === 'get' || method === 'has') {
		return new Promise((resolve, reject) => {
			WSClient.emit(method, table, key, (resp) => {
				resolveResponse(resp, resolve, reject);
			});
		});
	}
	if (method === 'queries') {
		return new Promise((resolve, reject) => {
			WSClient.emit(method, table, key, (resp) => {
				resolve(
					resp.map((response) => {
						if (!response.status || response.status !== 'success') {
							return reject(new Error(response.text));
						}

						return response.response;
					})
				);
			});
		});
	}

	return false;
}

function resolveResponse(resp, resolve, reject) {
	if (resp.status && resp.status === 'success') {
		resolve(resp.response);
	} else {
		reject(new Error(resp.text));
	}
}

module.exports = {
	add: (table, key, value) => {
		return dbRequest(table, 'add', key, value);
	},
	all: (table) => {
		return dbRequest(table, 'all');
	},
	delete: (table, key) => {
		return dbRequest(table, 'delete', key);
	},
	get: (table, key) => {
		return dbRequest(table, 'get', key);
	},
	has: (table, key) => {
		return dbRequest(table, 'has', key);
	},
	push: (table, key, value) => {
		return dbRequest(table, 'push', key, value);
	},
	set: (table, key, value) => {
		return dbRequest(table, 'set', key, value);
	},
	subtract: (table, key, value) => {
		return dbRequest(table, 'subtract', key, value);
	},
	queries: (queriesArray) => {
		return dbRequest('queries', 'queries', queriesArray);
	},
	ping: () => {
		const startTime = new Date();
		return new Promise((resolve, reject) => {
			WSClient.emit('ping', () => {
				const endTime = new Date();
				resolve(endTime.getTime() - startTime.getTime());
			});
		});
	}
};
