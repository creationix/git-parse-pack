var pushToPull = require('push-to-pull');
var parse = pushToPull(require('../parse.js'));
var hydrate = require('../hydrate.js');
var readStream = require('./fs.js').readStream;
var binarySource = require('simple-stream-helpers/binary-source.js');
var each = require('simple-stream-helpers/each.js');
var consume = require('simple-stream-helpers/consume.js');
var slow = require('simple-stream-helpers/slow.js');
var bops = require('bops');

// Stream is raw pack file as seen on disk
var stream = readStream(process.argv[2] || __dirname + "/sample.pack");

// stream is now flat stream of interpolated headers and bodies
stream = parse(stream, false);

// Stream is now nested streams with fully hydrated bodies.
stream = hydrate(stream, find);

// objects and bodies are cached in ram for easy retrieval
var objects = {};

// Pending finds.  Key is hash of target, value is array of patches with callbacks.
var pending = {};

each(stream, function (object) {
  store(object, function (err, copy) {
    if (err) throw err;
    objects[copy.hash] = copy;
    flush(copy);
    console.log(object.hash, object.type, object.length, object.merged ? "merged": "");
  });
})(function (err) {
  console.log(pending);
  if (err) throw err;
  console.log("END");
});

function find(item, callback) {
  var hash = item.ref;
  console.log(hash, "SEARCHING...");

  // If the target is here, send it out.
  var cached = objects[hash];
  if (cached) {
    return callback(null, item, load(cached));
  }

  // Store the callback and delta object for later
  store(item, function (err, copy) {
    if (err) return callback(err);
    var action = { callback: callback, copy: copy };
    if (!pending[hash]) pending[hash] = [action];
    else pending[hash].push(action);
  });
}

// Flush any pending finds
function flush(cached) {
  var actions = pending[cached.hash];
  if (!actions) return;
  delete pending[cached.hash];
  actions.forEach(function (action) {
    action.callback(null, load(action.copy), load(cached));
  });
}

// Store an object in memory with it's body buffered as an array.
function store(object, callback) {
  var copy = {};
  for (var key in object) {
    if (key === "body") continue;
    copy[key] = object[key];
  }
  consume(object.body)(function (err, items) {
    if (err) return callback(err);
    copy.hash = object.hash;
    copy.body = bops.join(items);
    callback(null, copy);
  });
}

// Convert a saved object to a live streamable object.
function load(copy) {
  var object = {};
  for (var key in copy) {
    if (key === "body") continue;
    object[key] = copy[key];
  }
  object.body = binarySource(copy.body, 0x100);

  return object;
}
