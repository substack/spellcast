var hypercore = require('hypercore')
var level = require('level-browserify')
var core = hypercore(level('hypercore'))
var Queue = require('ordered-queue')

module.exports = function (self) {
  var mode = null
  var writeStream, writeQueue, writeSeq = 0

  self.addEventListener('message', function (ev) {
    if (ev.data.type === 'record.start') {
      writeStream = core.createWriteStream()
      writeQueue = new Queue(function (buf, next) {
        writeStream.write(buf)
        next()
      }, { concurrency: 10 })
      mode = 'record'
      self.postMessage({
        type: 'record.info',
        id: writeStream.publicId.toString('hex')
      })
    } else if (mode === 'record' && ev.data.type === 'record.data') {
      var seq = writeSeq++
      tobuf(ev.data.blob, function (buf) {
        writeQueue.push(seq, buf)
      })
    } else if (ev.data.type === 'play.stream') {
      var stream = core.createReadStream({
        start: ev.data.start,
        end: ev.data.end
      })
      var index = ev.data.index
      stream.on('data', function (buf) {
        self.postMessage({
          type: 'play.data',
          index: index,
          buffer: buf
        })
      })
    }
  })
}

function tobuf (blob, cb) {
  var r = new FileReader()
  r.addEventListener('loadend', function () {
    cb(Buffer(new Uint8Array(r.result)))
  })
  r.readAsArrayBuffer(blob)
}
