var pushToPull = require('push-to-pull');
var readStream = require('./fs.js').readStream;
var parse = pushToPull(require('../parse.js'));
var hydrate = require('../hydrate.js');
var fs = require('simple-fs')(__dirname + "/test.git");
require('git-fs-db')(fs, { bare: true, init: true }, function (err, db) {
  if (err) throw err;
  // Stream is raw pack file as seen on disk
  var stream = readStream(process.argv[2] || __dirname + "/sample.pack");

  hydrate(parse(stream), db)(function (err, report) {
    if (err) throw err;
    console.log("report", report);
  });

});


