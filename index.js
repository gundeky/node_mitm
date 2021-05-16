const http = require('http');
const https = require('https');

const listenPort = 8081;
// const toAddr = { host: 'localhost', port: 8080, tls: false };
const toAddr = { host: 'www.google.com', port: 443, tls: true };
// const toAddr = { host: 'www.google.com', port: 80, tls: false };

const replaceHost = true;
const printData = true;

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
			resBody = Buffer.concat(resBody).toString('utf8');

			let resLog = `HTTP/${res.httpVersion} ${res.statusCode} ${res.statusMessage}\n`
			for (let i=0; i<res.rawHeaders.length; i+=2) {
				resLog += `${res.rawHeaders[i]}: ${res.rawHeaders[i+1]}\n`;
			}
			resLog += '\n';
			resLog += resBody;
			if (printData) {
				console.log('=====\n[data] svr->cli [' + cliPort + '][' + resLog.length + ']\n' + resLog.toString('utf8'));
			} else {
				console.log('=====\n[data] svr->cli [' + cliPort + '][' + resLog.length + ']');
			}
			callback(null, res.statusCode, res.statusMessage, res.headers, resBody);
			// console.log('No more data in response.');
		});
	});

	req.on('error', (e) => {
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
		reqBody = Buffer.concat(reqBody).toString('utf8');

		const cliPort = req.socket.remotePort;
		let reqLog = `${req.method} ${req.url} HTTP/${req.httpVersion}\n`
		for (let i=0; i<req.rawHeaders.length; i+=2) {
			reqLog += `${req.rawHeaders[i]}: ${req.rawHeaders[i+1]}\n`;
		}
		reqLog += '\n';
		reqLog += reqBody;
		if (printData) {
			console.log('=====\n[data] cli->svr [' + cliPort + '][' + reqLog.length + ']\n' + reqLog.toString('utf8'));
		} else {
			console.log('=====\n[data] cli->svr [' + cliPort + '][' + reqLog.length + ']');
		}

		const tempReqHeaders = JSON.parse(JSON.stringify(req.headers));
		delete tempReqHeaders['content-length'];
		delete tempReqHeaders['transfer-encoding'];
		if (tempReqHeaders['host']) {
			const hostString = toAddr.host + (toAddr.port === 80 ? '' : ':' + toAddr.port);
			tempReqHeaders['host'] = hostString;
		}

		callHTTP(cliPort, toAddr.tls, toAddr.host, toAddr.port, req.url, req.method, tempReqHeaders, reqBody,
				(e, resStatusCode, resStatusMessage, resHeaders, resBody) => {
			const tempResHeaders = JSON.parse(JSON.stringify(resHeaders));
			delete tempResHeaders['content-length'];
			delete tempResHeaders['transfer-encoding'];
			res.writeHead(resStatusCode, resStatusMessage, tempResHeaders);
			res.end(resBody);
		});
	});

	// if (req.method == 'POST' || req.method == 'PUT') {
	// 	// let body = [];
	// 	// request.on('data', (chunk) => {
	// 	// 	body.push(chunk);
	// 	// }).on('end', () => {
	// 	// 	body = Buffer.concat(body).toString();
	// 	// 	// 여기서 `body`에 전체 요청 바디가 문자열로 담겨있습니다.
	// 	// });
	// }
	// else {
	// 	let data = `${req.method} ${req.url} HTTP/${req.httpVersion}\n`
	// 	for (let i=0; i<req.rawHeaders.length; i+=2) {
	// 		data += `${req.rawHeaders[i]}: ${req.rawHeaders[i+1]}\n`;
	// 	}
    //
	// 	// if (printData) {
	// 	// 	console.log('=====\n[data] cli->svr [' + cliPort + '][' + data.length + ']\n' + data.toString('utf8'));
	// 	// } else {
	// 	// 	console.log('=====\n[data] cli->svr [' + cliPort + '][' + data.length + ']');
	// 	// }
    //
	// 	// console.log('req.url:', req.url);
	// 	// console.log('req.method:',   req.method);
	// 	// console.log('req.headers', JSON.stringify(req.headers, null, 2));
    //
	// 	res.write('Hello World!');
	// 	res.end();
	// }
}).listen(listenPort);

