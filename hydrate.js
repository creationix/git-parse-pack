var sha1 = require('sha1-digest');
var subStream = require('sub-stream');
var bops = require('bops');

// A pull-filter that accepts a flat stream of objects and bodies
// Also accepts an implementation of find(item, callback(err, item, target) {} )
// find accepts an item with nested body stream and returns (in callback) same
// item and what it references.
// Output is a new nested stream of all objects with deltas applied.
// The items will initially have null for their hash property.
// But after consuming the stream, hash will be set properly.
// (stream<header|body>, temp) -> stream<header_with_body>
module.exports = function (stream, find) {

  // Nest the bodies
  stream = subStream(stream, function (item) {
    return !bops.is(item);
  }, "body");

  var reading = false;
  var dataQueue = [];
  var readQueue = [];
  // Number of pending delta objects waiting on their target to be found.
  var pending = 0;
  // offset to hash mapping
  var hashes = {};

  return { read: read, abort: stream.abort };

  function read(callback) {
    readQueue.push(callback);
    check();
  }

  function check() {
    // Flush the queues.
    while (dataQueue.length && readQueue.length) {
      readQueue.shift().apply(null, dataQueue.shift());
    }
    // If we want for data, try to get more.
    if (!reading && readQueue.length) {
      reading = true;
      stream.read(onRead);
    }
  }

  function onRead(err, item) {
    reading = false;

    // Check for leftover deltas when forwarding end of stream information.
    if (item === undefined) {
      if (!err && pending) {
        err = new Error(pending + " delta targets were never found before end");
      }
      dataQueue.push([err]);
    }

    // If the item is a delta, try to resolve it.
    else if (item && item.ref) {
      // Convert offset refs into normal hash based refs
      if (typeof item.ref === "number") {
        item.ref = hashes[item.offset - item.ref];
      }
      pending++;
      find(item, onFind);
    }

    // Otherwise, forward all other traffic through.
    else {
      tap(item);
      dataQueue.push([null, item]);
    }
    check();
  }

  function onFind(err, item, target) {
    if (err) {
      dataQueue.push([err]);
    }
    else {
      pending--;
      console.log({item:item,target:target});
      throw new Error("TODO: merge")
      // TODO: tap this object's output as well when outputting.
    }
    check();
  }

  // Tap an object's substream calculating the sha1sum along the way
  // When done, store hash on item and save the offset -> hash mapping.
  function tap(item) {
    var sha1sum = sha1();
    var stream = item.body;

    item.body = { read: tappedRead, abort: stream.abort };
    item.hash = null;

    function tappedRead(callback) {
      stream.read(function (err, chunk) {
        if (err) return callback(err);
        if (chunk === undefined) {
          hashes[item.offset] = item.hash = sha1sum.digest();
          return callback();
        }
        sha1sum.update(chunk);
        callback(null, chunk);
      });
    }
  }

};

