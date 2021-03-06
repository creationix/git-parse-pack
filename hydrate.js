var subStream = require('sub-stream');
var each = require('simple-stream-helpers/each.js');
var bops = require('bops');
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
  var dependents = {};

  // map from offset to hash
  var offsets = {};
  // hashes of full ready objects
  var hashes = {};
  // queue of deltas who are ready to be resolved.
  var jobQueue = [];

  stream.read(onHeader);

  function onHeader(err, info) {
    if (err) return callback(err);
    version = info.version;
    num = info.num;
    // Convert the stream have nested bodies
    stream = subStream(stream, function (item) {
      return !bops.is(item);
    }, "body");

    each({ read: rawRead, abort: stream.abort })(onReceived);

    function rawRead(callback) {
      stream.read(function (err, obj) {
        if (obj === undefined) return callback(err);
        onObject(obj, callback);
      });
    }
  }

  function progress() {
    var percent = Math.round(count / num * 100);
    return "Receiving objects:  " + percent + "% (" + count + "/" + num + ")";
  }

  function deltaProgress() {
    var percent = Math.round(count / deltas * 100);
    return "Applying deltas:  " + percent + "% (" + count + "/" + deltas + ")";
  }

  function onObject(obj, callback) {
    // process.stdout.write(progress() + "\r");
    db.save(obj, function (err, hash) {
      if (err) return callback(err);
      offsets[obj.offset] = hash;
      if (obj.ref) {
        deltas++;
        if (typeof obj.ref === "number") {
          obj.ref = offsets[obj.offset - obj.ref];
        }
        if (dependents[obj.ref]) dependents[obj.ref].push(hash);
        else dependents[obj.ref] = [hash];
      }
      else {
        hashes[hash] = true;
      }
      count++;
      callback(null, obj);
    });
  }

  function onReceived(err) {
    if (err) return callback(err);
    // process.stdout.write(progress() + "\n");
    Object.keys(dependents).forEach(function (hash) {
      if (!hashes[hash]) return;
      dependents[hash].forEach(function (delta) {
        jobQueue.push({delta:delta,target:hash});
      });
      delete dependents[hash];
    });
    offsets = null;
    hashes = null;
    count = 0;

    nextJob();
  }

  function nextJob(err) {
    if (err) return callback(err);
    // process.stdout.write(deltaProgress() + "\r");
    var job = jobQueue.shift();
    if (!job) return onApplied();
    count++;
    var delta, target;
    var first = true;
    db.load(job.delta, onDelta);

    function onDelta(err, obj) {
      // console.log("onDelta", arguments);
      if (err) return callback(err);
      if (!obj) return callback(new Error("Can't find base object " + job.delta));
      delta = obj;
      db.load(job.target, onTarget);
    }

    function onTarget(err, obj) {
      // console.log("onTarget", arguments);
      if (err) return callback(err);
      target = obj;
      applyDelta(delta.body, getTarget, onOutput);
    }

    function getTarget(callback) {
      if (first) {
        first = false;
        return callback(null, target.body);
      }
      // console.log("getTarget");
      db.load(job.target, function (err, obj) {
        // console.log("onTargetAgain", arguments);
        if (err) return callback(err);
        callback(null, obj.body);
      });
    }

    function onOutput(err, stream) {
      // console.log("onOutput", arguments);
      if (err) return callback(err);
      db.save({
        type: target.type,
        size: stream.targetLen,
        body: stream
      }, onSave);
    }

    function onSave(err, hash) {
      // console.log("onSave", arguments);
      if (err) return callback(err);

      // If others dependended on this, queue them up!
      if (dependents[job.delta]) {
        dependents[job.delta].forEach(function (delta) {
          jobQueue.push({delta:delta,target:hash});
        });
        delete dependents[job.delta];
      }

      db.remove(job.delta, nextJob);
    }
  }

  function onApplied() {
    // process.stdout.write(deltaProgress() + "\n");
    if (jobQueue.length || Object.keys(dependents).length) {
      return callback(new Error("Failed to apply all deltas"));
    }
    callback(null, {
      version: version,
      objects: num,
      deltas: deltas
    });
  }

}
