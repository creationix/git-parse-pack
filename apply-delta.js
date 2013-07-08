var pushToPull = require('push-to-pull');
var parseDelta = pushToPull(require('./parse-delta.js'));
var bops = require('bops');


function seekable(stream) {
  var position = 0;
  var buffers = [];
  // Read to position in a stream and read some bytes
  return seek;
  
  function seek(offset, bytes, callback) {
    throw new Error("TODO: Implement seek")
  }
}

module.exports = function (patch, base) {
  console.log("applyDelta", {patch: patch, base: base});
  var instructions = parseDelta(patch.body);
  var seek = seekable(base.body);
  var info = null;
  var emit = null;
  var output = {
    type: base.type,
    length: null,
    body: { read: read, abort: abort }
  };

  return output;
  
  function read(callback) {
    if (emit) return callback(new Error("Only one read at a time"));
    emit = callback;
    instructions.read(info ? onInstruction : onInfo);
  }
  
  function onInfo(err, item) {
    if (err) {
      var callback = emit;
      emit = null;
      return callback(err);
    }
    info = item;
    output.length = info.targetLen;
    return instructions.read(onInstruction);
  }
  
  function onInstruction(err, item) {
    if (err || bops.is(item)) {
      var callback = emit;
      emit = null;
      return callback(err, item);
    }
    seek(item.offset, item.size, onSeek);
  }
  
  function onSeek(err, item) {
    var callback = emit;
    emit = null;
    callback(err, item);
  }
  
  function abort(callback) {
    var left = 2;
    var done = false;

    patch.body.abort(onAbort);
    base.body.abort(onAbort);
    
    function onAbort(err) {
      if (done || (--left && !err)) return;
      done = true;
      return callback(err);
    }
  }
};