module.exports = function (emit) {
  var state = $baseLen;
  var baseLen = 0;
  var targetLen = 0;
  var x = 0;
  var cmd = 0;
  var copyOffset = 0;
  var copySize = 0;

  return function (chunk) {
    
    if (chunk === undefined) return emit();

    for (var i = 0, l = chunk.length; i < l; i++) {
      console.log(state.name, chunk[i].toString(16));
      state = state(chunk[i]);
    }
  };

  // Base Length is encoded in a var-int
  function $baseLen(byte) {
    baseLen |= (byte & 0x7f) << (x++ * 7);
    if (byte & 0x80) return $baseLen;
    x = 0;
    return $targetLen;
  }

  // Target Length is encoded in a var-int
  function $targetLen(byte) {
    targetLen |= (byte & 0x7f) << (x++ * 7);
    if (byte & 0x80) return $targetLen;
    emit({baseLen: baseLen, targetLen: targetLen});
    x = 0;
    return $command;
  }

  function $command(byte) {
    cmd = byte;
    if (byte & 0x80) return $copyOffset;
    if (byte) return $insert;
    throw new Error("Unexpected delta opcode 0");
  }

  function $copyOffset(byte) {
    while (x < 4) {
      if (cmd & (1 << x)) {
        copyOffset |= byte << (x * 8);
        x++;
        return $copyOffset;
      }
      x++;
    }
    copyOffset >>>= 0;
    x = 0;
    return $copySize(byte);
  }

  function $copySize(byte) {
    while (x < 3) {
      if (cmd & (0x10 << x)) {
        copySize |= byte << (x * 8);
        x++;
        return $copySize;
      }
      x++
    }
    if (copySize === 0) copySize = 0x10000;
    var copy = { offset: copyOffset, size: copySize };
    x = 0;
    copyOffset = 0;
    copySize = 0;
    emit({ copy: copy });
    return $command(byte);
  }

  function $insert(byte) {
    throw new Error("TODO: Implement $insert");
  }

};
