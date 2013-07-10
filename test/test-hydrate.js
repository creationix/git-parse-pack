var pushToPull = require('push-to-pull');
var readStream = require('./fs.js').readStream;
var parse = pushToPull(require('../parse.js'));
var db = require('./db.js')();
var hydrate = require('../hydrate.js');

// Stream is raw pack file as seen on disk
var stream = readStream(process.argv[2] || __dirname + "/sample.pack");

hydrate(parse(stream), db)(function (err, report) {
  console.log(arguments);
  console.log((new Error).stack);
  if (err) throw err;
  console.log("report", report);
});
