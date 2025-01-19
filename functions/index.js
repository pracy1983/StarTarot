const functions = require('firebase-functions');
const { default: next } = require('next');
const path = require('path');

const nextjsDistDir = path.join('src', '.next');

const nextjsServer = next({
  dev: false,
  conf: {
    distDir: nextjsDistDir,
  },
});
const nextjsHandle = nextjsServer.getRequestHandler();

exports.nextjsFunc = functions.https.onRequest((req, res) => {
  return nextjsServer.prepare()
    .then(() => nextjsHandle(req, res))
    .catch(error => {
      console.error(error);
      return res.status(500).json({
        error: `Error starting Next.js server: ${error}`,
      });
    });
});
