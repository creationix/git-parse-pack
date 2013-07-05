var pushToPull = require('push-to-pull');
var parse = pushToPull(require('../parse.js'));
var hydrate = require('../hydrate.js');
var consume = require('./helpers.js').consume;
var readStream = require('./helpers.js').readStream;
var bops = require('bops');


// Stream is raw pack file as seen on disk
var stream = readStream(process.argv[2] || __dirname + "/sample.pack");

// stream is now flat stream of interpolated headers and bodies
stream = parse(stream, false);

// Stream is now nested streams with fully hydrated bodies.
stream = hydrate(stream, find);

// objects and bodies are cached in ram for easy retrieval
var objects = {};

// Pending finds
var pending = {};

consume(stream, function (object) {
  var chunks = [];
  consume(object.body, function (chunk) {
    chunks.push(chunk);
  })(function (err) {
    if (err) throw err;
    var hash = object.hash;
    objects[hash] = [object, chunks];
    console.log({hash:object.hash,type:object.type});
  });
})(function (err) {
  if (err) throw err;
  console.log("END");
});

// consume(hydrate(parse(stream), find), console.log)(function (err) {
//   if (err) throw err;
//   console.log("END");
// });

function find(item, callback) {
  var hash = item.ref;
  console.log("Looking for", hash);
  var cached = objects[hash];
  if (cached) {
    var target = cached[0];
    target.body = arrayToStream(cached[1]);
    return callback(null, item, target);
  }
  throw new Error("TODO: Implement lazy find");
}

function arrayToStream(array) {
  return { read: read, abort: abort };

  function read(callback) {
    callback(null, array.shift());
  }

  function abort(callback) {
    array.length = 0;
    callback();
  }
}