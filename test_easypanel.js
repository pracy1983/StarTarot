const fetch = require('node-fetch'); // Wait, node-fetch might not be installed, we can use global fetch in newer Node or use dynamic import/https module. Let's use the built-in 'https' module to ensure zero external dependency.

const https = require('https');

function request(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        req.on('error', reject);
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function run() {
    const email = 'paularacy@gmail.com';
    const password = 'Af23123011!,'; // Password with trailing comma

    // Let's try standard tRPC formats for auth.login
    const payloads = [
        JSON.stringify({ email, password }),
        JSON.stringify({ json: { email, password } }),
        JSON.stringify({ 0: { json: { email, password } } }),
        JSON.stringify({ 0: { email, password } })
    ];

    for (const payload of payloads) {
        console.log('Trying payload:', payload);
        try {
            const res = await request('https://vrdrcy.easypanel.host/api/trpc/auth.login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: payload
            });
            console.log('Status:', res.status);
            console.log('Headers:', res.headers);
            console.log('Body:', res.body.substring(0, 500));
            console.log('-------------------------------------------');
        } catch (e) {
            console.error('Request failed:', e);
        }
    }
}

run();
