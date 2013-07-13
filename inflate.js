module.exports = inflate;

function inflate($done, emit) {

  var cmf;
  var fdict;

  return $cmf;  // Start out parsing the zlib deflate headers

  // Compression method and flags
  function $cmf(byte) {
    cmf = byte;
    // bits 0 to 3 Compression method
    if ((cmf & 0xf) !== 8) {
      throw new Error("Only compression method 8 (deflate) supported");
    }
    // bits 4 to 7 Compression info
    if ((cmf >> 4 & 0xf) !== 7) {
      throw new Error("Sorry, only 32K LZ77 windows are supported");
    }
    return $flg;
  }

  // FLaGs
  function $flg(byte) {
    if (((cmf << 8) + byte) % 31) {
      throw new Error("Invalid fcheck in zlib header");
    }
    // bit 5 (preset dictionary)
    return (flg >> 5 & 0x1) ? $dict : $head;
  }

  function $dict(byte) {
    throw new Error("TODO: Implement parsing preset dictionary");
  }

  function $head(byte) {
    throw new Error("TODO: Implement deflate header parsing");
  }

}
