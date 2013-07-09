var bops = require('bops');
module.exports = seekable;

function seekable(stream) {
  var consumed = 0;
  var position = 0;
  var buffers = [];
  // Read to position in a stream and read some bytes
  return function (offset, bytes, callback) {
    seek(offset + bytes, onSeek);

    function onSeek(err) {
      if (err) return callback(err);

      // Skip bytes till we're where we want to be.
      while (position < offset) {
        var diff = offset - position;
        var next = buffers[0];

        // If entire chunks are to be ignored, throw them away.
        if (next.length <= diff) {
          buffers.shift();
          position += next.length;
          continue;
        }

        // Otherwise, skip the front part of the next buffer;
        buffers[0] = bops.subarray(next, diff);
        position += diff;
      }


      var output;
      // If the next buffer is the exact size we want, send it up!
      if (buffers[0].length === bytes) {
        output = buffers.shift();
        position += output.length;
        return callback(null, output);
      }

      // If it's bigger than we want, consume the front of it.
      if (buffers[0].length >= bytes) {
        output = bops.subarray(buffers[0], 0, bytes);
        buffers[0] = bops.subarray(buffers[0], bytes);
        position += output.length;
        return callback(null, output);
      }

      // Otherwise, piece smaller pieces together till we've got enough.
      throw new Error("TODO: Implement chopped bits");
      // var output = bops.create(bytes);
      // var i = 0;
      // while (i < bytes) {
      //   var diff = bytes - i;
      //   var next = buffers[0];
      //   if (next.length < diff) {
      //     bops.copy()
      //   }
      // }
      // console.log(buffers);
    }
  };

  function seek(position, callback) {
    if (position < consumed) return callback();
    stream.read(function (err, item) {
      if (item === undefined) return callback(err);
      buffers.push(item);
      consumed += item.length;
      return seek(position, callback);
    });
  }
}

