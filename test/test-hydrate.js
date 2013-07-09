var pushToPull = require('push-to-pull');
var parse = pushToPull(require('../parse.js'));
var hydrate = require('../hydrate.js');
var consume = require('./helpers.js').consume;
var readStream = require('./helpers.js').readStream;

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

consume(stream, function (object) {
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
  var body = [];
  consume(object.body, function (item) {
    body.push(item);
  })(function (err) {
    if (err) return callback(err);
    copy.body = body;
    copy.hash = object.hash;
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

  var body = copy.body;
  object.body = {
    read: function read(callback) {
      callback(null, body.shift());
    },
    abort: function abort(callback) {
      body.length = 0;
      callback();
    }
  };

  return object;
}
