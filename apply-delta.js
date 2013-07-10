var pushToPull = require('push-to-pull');
var parseDelta = pushToPull(require('./parse-delta.js'));
var seekable = require('seekable');
var bops = require('bops');

// Input is two streams, output (in callback) is new stream and expected length
// applyDelta(deltaBody, targetBody) -> continuable<outputBody>
module.exports = applyDelta;
function applyDelta(patch, getBase, callback) {
  if (!callback) return applyDelta.call(this, patch, getBase);

  var instructions = parseDelta(patch);
  var seek = seekable(getBase);
  var emit = null;

  instructions.read(function (err, info) {
    callback(err, info && {
      read: read, abort: abort,
      baseLen: info.baseLen, targetLen: info.targetLen
    });
  });

  function read(callback) {
    if (emit) return callback(new Error("Only one read at a time"));
    emit = callback;
    instructions.read(onInstruction);
  }

  function onInstruction(err, item) {
    console.log("instruction", item);
    if (err || bops.is(item) || item === undefined) {
      var callback = emit;
      emit = null;
      return callback(err, item);
    }
    seek(item.offset, item.size)(onSeek);
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
    // TODO: should be abort the base streams?

    function onAbort(err) {
      if (done || (--left && !err)) return;
      done = true;
      return callback(err);
    }
  }
};

