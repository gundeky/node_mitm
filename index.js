const fs = require('fs');
const http = require('http');
const https = require('https');
const zlib = require('zlib');

const listenPort = 8081;
// const toAddr = { host: 'localhost', port: 8080, tls: false };
// const toAddr = { host: 'www.google.com', port: 443, tls: true };
// const toAddr = { host: 'www.google.com', port: 80, tls: false };
const toAddr = { host: 'localhost', port: 5232, tls: false };

const auth = 'Basic a2VuLmxlZToxMTEx';

const replaceHostEnabled = true;
const dumpDataEnabled = true;
const writeFileEnabled = true;

function getLogFileName() {
	function pad2(n) {
		return (n < 10 ? '0' : '') + n;
	}
	const date = new Date();
	const postfix = date.getFullYear().toString() + pad2(date.getMonth() + 1) + pad2(date.getDate()) + pad2(date.getHours()) + pad2(date.getMinutes()) + pad2(date.getSeconds());
	return `log_${postfix}`;
}

const logFileName = getLogFileName();

function print(str) {
	// console.log(str.toString('utf8'));
	console.log(str);
	if (writeFileEnabled) {
		// fs.appendFileSync(logFileName, str.toString('utf8'));
		fs.appendFileSync(logFileName, str);
	}
}

function callHTTP(cliPort, reqTls, reqHost, reqPort, reqPath, reqMethod, reqHeaders, reqBody, callback) {
	const reqOptions = {
		hostname: reqHost,
		port: reqPort,
		path: reqPath,
		method: reqMethod,
		headers: reqHeaders
	};

	const req = (reqTls ? https : http).request(reqOptions, (res) => {
		let resBody = [];
		res.on('data', (chunk) => {
			resBody.push(chunk);
		});
		res.on('end', () => {
			resBody = Buffer.concat(resBody);

			let resLog = `HTTP/${res.httpVersion} ${res.statusCode} ${res.statusMessage}\n`
			for (let i=0; i<res.rawHeaders.length; i+=2) {
				resLog += `${res.rawHeaders[i]}: ${res.rawHeaders[i+1]}\n`;
			}
			resLog += '\n';

			if (res.headers['content-encoding'] === 'br') {
				resLog += zlib.brotliDecompressSync(resBody);
			} else if (res.headers['content-encoding'] === 'gzip') {
				resLog += zlib.gunzipSync(resBody);
			} else if (res.headers['content-encoding'] === 'compress') {
				resLog += zlib.unzipSync(resBody);
			} else if (res.headers['content-encoding'] === 'deflate') {
				resLog += zlib.inflateSync(resBody);
			} else if (res.headers['content-encoding'] === 'identity') {
				resLog += resBody;
			} else {
				resLog += resBody;
			}

			if (dumpDataEnabled) {
				print('\n\n=====\n[data] svr->cli [' + cliPort + '][' + resLog.length + ']\n' + resLog.toString('utf8'));
			} else {
				print('\n\n=====\n[data] svr->cli [' + cliPort + '][' + resLog.length + ']');
			}
			callback(null, res.statusCode, res.statusMessage, res.headers, resBody);
			// console.log('No more data in response.');
		});
		res.on('error', (e) => {
			console.error('server response error:', e);
			callback(e);
		});
	});

	req.on('error', (e) => {
		console.error('server request error:', e);
		callback(e);
	});

	if (reqBody) {
		req.write(reqBody);
	}
	req.end();
}

http.createServer((req, res) => {

	let reqBody = [];
	req.on('data', (chunk) => {
		reqBody.push(chunk);
	});
	req.on('end', () => {
		reqBody = Buffer.concat(reqBody);

		const cliPort = req.socket.remotePort;
		let reqLog = `${req.method} ${req.url} HTTP/${req.httpVersion}\n`
		for (let i=0; i<req.rawHeaders.length; i+=2) {
			reqLog += `${req.rawHeaders[i]}: ${req.rawHeaders[i+1]}\n`;
		}
		reqLog += '\n';

		if (req.headers['content-encoding'] === 'br') {
			reqLog += zlib.brotliDecompreqsSync(reqBody);
		} else if (req.headers['content-encoding'] === 'gzip') {
			reqLog += zlib.gunzipSync(reqBody);
		} else if (req.headers['content-encoding'] === 'compreqs') {
			reqLog += zlib.unzipSync(reqBody);
		} else if (req.headers['content-encoding'] === 'deflate') {
			reqLog += zlib.inflateSync(reqBody);
		} else if (req.headers['content-encoding'] === 'identity') {
			reqLog += reqBody;
		} else {
			reqLog += reqBody;
		}

		if (dumpDataEnabled) {
			print('\n\n=====\n[data] cli->svr [' + cliPort + '][' + reqLog.length + ']\n' + reqLog.toString('utf8'));
		} else {
			print('\n\n=====\n[data] cli->svr [' + cliPort + '][' + reqLog.length + ']');
		}

		const tempReqHeaders = JSON.parse(JSON.stringify(req.headers));
		delete tempReqHeaders['content-length'];
		delete tempReqHeaders['transfer-encoding'];
		if (replaceHostEnabled && tempReqHeaders['host']) {
			const hostString = toAddr.host + (toAddr.port === 80 ? '' : ':' + toAddr.port);
			tempReqHeaders['host'] = hostString;
		}
		if (auth) {
			tempReqHeaders['authorization'] = auth;
		}

		callHTTP(cliPort, toAddr.tls, toAddr.host, toAddr.port, req.url, req.method, tempReqHeaders, reqBody, (e, resStatusCode, resStatusMessage, resHeaders, resBody) => {
			if (e) {
				console.error('callHTTP error:', e);
				return;
			}
			const tempResHeaders = JSON.parse(JSON.stringify(resHeaders));
			delete tempResHeaders['content-length'];
			delete tempResHeaders['transfer-encoding'];
			res.writeHead(resStatusCode, resStatusMessage, tempResHeaders);
			res.end(resBody);
		});
	});
	req.on('error', (e) => {
		console.error('client request error:', e);
	});
}).listen(listenPort);

