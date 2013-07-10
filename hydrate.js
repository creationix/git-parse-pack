var subStream = require('sub-stream');
var each = require('simple-stream-helpers/each.js');
var bops = require('bops');
var arraySource = require('simple-stream-helpers/array-source.js');
var pushToPull = require('push-to-pull');
var applyDelta = require('./apply-delta.js');

// Accepts a stream of raw packfile parse output.
// It first parses the stream and saves all the objects to disk.
// Along the way it records in memory deltas that need applying
// Then using recursive sweeps it converts all the deltas to real objects.
// Returns a continuable with a data report.
module.exports = hydrate;
function hydrate(stream, db, callback) {
  if (!callback) return hydrate.bind(this, stream, db);

  var version;
  var num;
  var count = 0;
  var deltas = 0;

  // lists of deltas waiting by target hash
  var waiting = {};

  // map from offset to hash
  var offsets = {};
  // hashes of full ready objects
  var hashes = {};
  // queue of target hashes who's dependendents need to be resolved.
  var queue = [];

  stream.read(onHeader);

  function onHeader(err, info) {
    if (err) return callback(err);
    version = info.version;
    num = info.num;
    // Convert the stream have nested bodies
    stream = subStream(stream, function (item) {
      return !bops.is(item);
    }, "body");

    each(stream, onObject)(onReceived);
  }

  function progress() {
    var percent = Math.round(count / num * 100);
    return "Receiving objects:  " + percent + "% (" + count + "/" + num + ")";
  }

  function onObject(obj) {
    process.stdout.write(progress() + "\r");
    db.save(obj, function (err, hash) {
      if (err) return callback(err);
      offsets[obj.offset] = hash;
      if (obj.ref) {
        deltas++;
        if (typeof obj.ref === "number") {
          obj.ref = offsets[obj.offset - obj.ref];
        }
        if (waiting[obj.ref]) waiting[obj.ref].push(hash);
        else waiting[obj.ref] = [hash];
      }
      else {
        hashes[hash] = true;
      }
      count++;
    });
  }

  function onReceived(err) {
    if (err) return callback(err);
    process.stdout.write(progress() + "\n");
    Object.keys(waiting).forEach(function (hash) {
      if (hashes[hash]) queue.push(hash);
    });
    offsets = null;
    hashes = null;
    count = 0;

    console.log({
      waiting: waiting,
      queue: queue
    });

    each(arraySource(queue), onJob)(onApplied);
  }

  function onJob(job) {
    console.log("job", job);

  }

  function onApplied(err) {
    if (err) return callback(err);
    console.log("DONE?");
  }
}

//   var input =
// module.exports = function (stream, db) {
//
//   // Nest the bodies
//   stream = subStream(stream, function (item) {
//     return !bops.is(item);
//   }, "body");
//
//   var reading = false;
//   var dataQueue = [];
//   var readQueue = [];
//   // Number of pending delta objects waiting on their target to be found.
//   var pending = 0;
//   // offset to hash mapping
//   var hashes = {};
//   var seen = {};
//
//   return { read: read, abort: stream.abort };
//
//   function read(callback) {
//     readQueue.push(callback);
//     check();
//   }
//
//   function check() {
//     // Flush the queues.
//     while (dataQueue.length && readQueue.length) {
//       readQueue.shift().apply(null, dataQueue.shift());
//     }
//     // If we want for data, try to get more.
//     if (!reading && readQueue.length) {
//       reading = true;
//       stream.read(onRead);
//     }
//   }
//
//   function onRead(err, item) {
//     reading = false;
//
//     // Check for leftover deltas when forwarding end of stream information.
//     if (item === undefined) {
//       if (!err && pending) {
//         err = new Error(pending + " delta targets were never found before end");
//       }
//       dataQueue.push([err]);
//       return check();
//     }
//
//     seen[item.offset] = item;
//
//     // If the item is a delta, try to resolve it.
//     if (item && item.ref) {
//       // Convert offset refs into normal hash based refs
//       if (typeof item.ref === "number") {
//         var target = item.offset - item.ref;
//         var hash = hashes[target];
//         if (!hash) {
//           if (!seen[target]) {
//             var keys = Object.keys(hashes).filter(function (key) {
//               key = parseInt(key, 10);
//               return target - 1000 < key && target + 1000 > key;
//             });
//             console.log("near keys", keys);
//             throw new Error("Can't find back-reference");
//           }
//           item.target = seen[target];
//           console.log("WARNING: sending ref instead of hash", item)
//         }
//         else {
//           item.ref = hash;
//         }
//       }
//       pending++;
//       find(item, onFind);
//     }
//
//     // Otherwise, forward all other traffic through.
//     else {
//       item.type = types[item.type];
//     tap(item);
//       dataQueue.push([null, item]);
//     }
//     check();
//   }
//
//   // Item here may or may not be the same object as was passed into find
//   // since it may have been put in offline storage temporarily.
//   function onFind(err, patch, base) {
//     function callback() {
//       dataQueue.push(arguments);
//       check();
//     }
//     if (err) return callback(err);
//     console.log(patch.ref, "FOUND");
//     pending--;
//     applyDelta(patch.body, base.body)(function (err, output) {
//
//     });
//   }
//
//   function onApplied(err, output) {
//     if (output === undefined) return callback(err);
//     if (output.baseLen !== base.length) {
//       return callback(new Error("Base length mismatch " + output.baseLen + " != " + base.length));
//     }
//     var item = tap({
//       offset: patch.offset,
//       type: base.type,
//       length: output.targetLen,
//       body: { read: output.read, abort: output.abort },
//       merged: true
//     });
//     callback(null, item);
//   }
//
//   // Tap an object's substream calculating the sha1sum along the way
//   // When done, store hash on item and save the offset -> hash mapping.
//   function tap(item) {
//     var stream = item.body;
//     var bytes = 0;
//
//     var sha1sum = sha1();
//     sha1sum.update(item.type + " " + item.length + "\0");
//
//     item.body = { read: tappedRead, abort: stream.abort };
//     item.hash = null;
//
//     return item;
//
//     function tappedRead(callback) {
//       stream.read(function (err, chunk) {
//         if (err) return callback(err);
//         if (chunk === undefined) {
//           var hash = sha1sum.digest();
//           if (item.hash && item.hash !== hash) {
//             return callback(new Error("Sha1sum mismatch: " + item.hash + " != " + hash));
//           }
//           hashes[item.offset] = item.hash = hash;
//           if (bytes !== item.length) {
//             return callback(new Error("Length mismatch:  Expected " + item.length + ", but was " + bytes));
//           }
//           return callback();
//         }
//         bytes += chunk.length;
//         // console.log(chunk.toString());
//         sha1sum.update(chunk);
//         callback(null, chunk);
//       });
//     }
//   }
//
// };
//
//
//
//
// var targets = {};
// var targetIndex = {};
//
// function addDep(hash, target) {
//   if (target in targetIndex) {
//
//   }
//   else {
//
//   }
//
// }