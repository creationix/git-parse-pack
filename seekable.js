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
      var output, next, diff;
      if (err) return callback(err);

      // Skip bytes till we're where we want to be.
      while (position < offset) {
        diff = offset - position;
        next = buffers[0];

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
      console.log(bytes, buffers.map(function (buffer) {
        return buffer.length;
      }));
      output = bops.create(bytes);
      var i = 0;
      while (i < bytes) {
        diff = bytes - i;
        next = buffers[0];
        if (next.length <= diff) {
          buffers.shift();
          bops.copy(next, output, i);
          i += next.length;
        }
        else {
          bops.copy(bops.subarray(next, 0, diff), output, i);
          buffers[0] = bops.subarray(next, diff);
          i += diff;
        }
      }
      return callback(null, output);
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

