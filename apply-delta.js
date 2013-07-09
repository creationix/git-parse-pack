var pushToPull = require('push-to-pull');
var parseDelta = pushToPull(require('./parse-delta.js'));
var seekable = require('./seekable.js');
var bops = require('bops');

// Input is two streams, output (in callback) is new stream and expected length
module.exports = function (patch, base) {
  var instructions = parseDelta(patch);
  var getBytes = seekable(base);
  var emit = null;

  // Return a continuable so we can wait for the target length
  return function (callback) {
    instructions.read(function (err, info) {
      callback(null, info && {
        read: read, abort: abort,
        baseLen: info.baseLen, targetLen: info.targetLen
      });
    });
  };

  function read(callback) {
    if (emit) return callback(new Error("Only one read at a time"));
    emit = callback;
    instructions.read(onInstruction);
  }

  function onInstruction(err, item) {
    if (err || bops.is(item) || item === undefined) {
      var callback = emit;
      emit = null;
      return callback(err, item);
    }
    getBytes(item.offset, item.size, onSeek);
  }

  function onSeek(err, item) {
    var callback = emit;
    emit = null;
    callback(err, item);
  }

  function abort(callback) {
    var left = 2;
    var done = false;

    patch.abort(onAbort);
    base.abort(onAbort);

    function onAbort(err) {
      if (done || (--left && !err)) return;
      done = true;
      return callback(err);
    }
  }
};

