var sha1 = require('./sha1.js');
var inflate = require('./inflate.js');
var subarray = require('bops/subarray.js');

module.exports = decode;

function decode(emit) {
  var state = $pack;
  var sha1sum = sha1();
  var inf = inflate();

  var offset = 0;
  var position = 0;
  var version = 0x4b434150; // PACK reversed
  var num = 0;
  var type = 0;
  var length = 0;
  var ref = null;
  var checksum = "";

  return function (err, chunk) {
    if (chunk === undefined) return emit(err);

    for (var i = 0, l = chunk.length; state && i < l; i++) {
      // console.log([state, i, chunk[i].toString(16)]);
      state = state(chunk[i], i, chunk);
      position++;
    }
    if (!state) return emit();
    if (state !== $checksum) sha1sum(chunk);
    var buff = inf.flush();
    if (buff.length) emit(null, buff);
  };

  // The first four bytes in a packfile are the bytes 'PACK'
  function $pack(byte) {
    if ((version & 0xff) === byte) {
      version >>>= 8;
      return version ? $pack : $version;
    }
    emit(new Error("Invalid packfile header"));
  }

  // The version is stored as an unsigned 32 integer in network byte order.
  // It must be version 2 or 3.
  function $version(byte) {
    version = (version << 8) | byte;
    if (++offset < 4) return $version;
    if (version >= 2 && version <= 3) {
      offset = 0;
      return $num;
    }
    emit(new Error("Invalid version number " + num));
  }

  // The number of objects in this packfile is also stored as an unsigned 32 bit int.
  function $num(byte) {
    num = (num << 8) | byte;
    if (++offset < 4) return $num;
    offset = 0;
    emit(null, {version: version, num: num});
    return $header;
  }

  // n-byte type and length (3-bit type, (n-1)*7+4-bit length)
  // CTTTSSSS
  // C is continue bit, TTT is type, S+ is length
  function $header(byte) {
    type = byte >> 4 & 0x07;
    length = byte & 0x0f;
    if (byte & 0x80) {
      offset = 4;
      return $header2;
    }
    return afterHeader();
  }

  // Second state in the same header parsing.
  // CSSSSSSS*
  function $header2(byte) {
    length |= (byte & 0x7f) << offset;
    if (byte & 0x80) {
      offset += 7;
      return $header2;
    }
    return afterHeader();
  }

  function afterHeader() {
    offset = 0;
    if (type === 6) {
      ref = 0;
      return $ofsDelta;
    }
    if (type === 7) {
      ref = "";
      return $refDelta;
    }
    emitObject();
    return $body;
  }

  function $ofsDelta(byte) {
    ref = ((ref + 1) << 7) | (byte & 0x7f);
    if (byte & 0x80) return $ofsDelta;
    emitObject();
    return $body;
  }

  function $refDelta(byte) {
    if (byte < 0x10) ref += "0" + byte.toString(16);
    else ref += byte.toString(16);
    if (++offset < 20) return $refDelta;
    emitObject();
    return $body;
  }

  function emitObject() {
    var item = {offset: position, type: type, length: length, ref: ref};
    offset = 0;
    type = 0;
    length = 0;
    ref = null;
    emit(null, item);
  }

  function $body(byte, i, chunk) {
    if (inf.write(byte)) return $body;
    var buf = inf.flush();
    inf.recycle();
    if (buf.length) emit(null, buf);
    if (--num) return $header;
    sha1sum(subarray(chunk, 0, i + 1));
    return $checksum;
  }

  function $checksum(byte) {
    if (byte < 0x10) checksum += "0" + byte.toString(16);
    else checksum += byte.toString(16);
    if (++offset < 20) return $checksum;
    var actual = sha1sum();
    if (checksum !== actual) return emit(new Error("Checksum mismatch: " + actual + " != " + checksum));
  }

}
