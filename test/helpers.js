var fs = require('fs');

// Given a path and options return a stream source of the file.
// options.start the start offset in bytes
// options.end the offset of the last byte to read
exports.readStream = readStream;
function readStream(path, options) {
  options = options || {};
  var position = options.start;
  var fd, locked;
  var dataQueue = [];
  var readQueue = [];

  function finish(err, callback) {
    locked = true;
    if (fd) {
      fs.close(fd, function () {
        callback(err);
      });
    }
    else callback(err);
  }


  function start() {
    locked = true;
    fs.open(path, "r", function (err, result) {
      locked = false;
      if (err) dataQueue.push([err]);
      fd = result;
      check();
    });
  }

  function check() {
    while (dataQueue.length && readQueue.length) {
      var item = dataQueue.shift();
      if (item[1] === undefined) {
        return finish(item[0], readQueue.shift());
      }
      readQueue.shift().apply(null, item);
    }
    if (locked || !readQueue.length) return;
    if (!fd) {
      return start();
    }
    var length = 8192;
    if (typeof position === 'number' && typeof options.end === 'number') {
      length = Math.min(length, options.end - position);
      if (!length) {
        dataQueue.push([]);
        return check();
      }
    }
    var buffer = new Buffer(length);
    locked = true;
    fs.read(fd, buffer, 0, length, position, onRead);
  }

  function onRead(err, bytesRead, buffer) {
    locked = false;
    if (err) {
      dataQueue.push([err]);
      return check();
    }
    if (!bytesRead) {
      dataQueue.push([]);
      return check();
    }
    if (typeof position === 'number') position += bytesRead;
    if (bytesRead < buffer.length) {
      dataQueue.push([null, buffer.slice(0, bytesRead)]);
    }
    else {
      dataQueue.push([null, buffer]);
    }
    check();
  }

  return { read: read, abort: abort };
  
  function read(callback) {
    readQueue.push(callback);
    check();
  }
  
  function abort(callback) {
    finish(null, callback);
  }

}


// Consume a stream storing events in an array.
exports.consume = consume;
function consume(stream, onItem) {
  var callback;
  var sync;

  return function (cb) {
    callback = cb;
    start();
  };
  
  function start() {
    do {
      sync = undefined;
      stream.read(onRead);
      if (sync === undefined) sync = false;
    } while (sync);
  }
  
  function onRead(err, item) {
    if (item === undefined) return callback(err);
    if (onItem) onItem(item);
    if (sync === undefined) sync = true;
    else start();
  }
}
