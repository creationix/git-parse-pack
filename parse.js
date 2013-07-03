var sha1 = require('./sha1');

module.exports = decode;

function decode(emit) {
  var state = pack;
  var sha1sum = sha1();
  var data = {
    version: 0x4b434150, // PACK reversed
    num: 0,
    offset: 0,
    emit: emit,
    sha1sum: sha1sum
  };

  return function (err, chunk) {
    if (chunk === undefined) return emit(err);
    sha1sum(chunk);
    for (var i = 0, l = chunk.length; i < l; i++) {
      if (!state) return emit();
      state = state.call(data, chunk[i]);
    }
  };

}

////////////////////////////////////////////////////////////////////////////////
// State Machine Based Parser
////////////////////////////////////////////////////////////////////////////////

function pack(byte) {
  if ((this.version & 0xff) === byte) {
    this.version >>>= 8;
    return this.version ? pack : version;
  }
  this.emit(new Error("Invalid packfile header"));
}

function version(byte) {
  this.version = (this.version << 8) + byte;
  if (++this.offset < 4) return version;
  if (this.version >= 2 && this.version <= 3) {
    this.offset = 0;
    return num;
  }
  this.emit(new Error("Invalid version number " + this.num));
}

function num(byte) {
  this.num = (this.num << 8) + byte;
  if (++this.offset < 4) return num;
  this.emit(null, this);
}
