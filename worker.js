var hypercore = require('hypercore')
var level = require('level-browserify')
var core = hypercore(level('hypercore'))
var Queue = require('ordered-queue')

module.exports = function (self) {
  var stream = core.createWriteStream()
  var queue = new Queue(function (buf, next) {
    stream.write(buf)
    next()
  }, { concurrency: 10 })

  self.postMessage({
    type: 'info',
    id: stream.publicId.toString('hex')
  })

  var msgSeq = 0
  self.addEventListener('message', function (ev) {
    if (ev.data.type === 'blob') {
      var seq = msgSeq++
      tobuf(ev.data.blob, function (buf) {
        console.log('seq=' + seq)
        queue.push(seq, buf)
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
