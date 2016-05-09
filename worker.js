var hypercore = require('hypercore')
var level = require('level-browserify')
var core = hypercore(level('hypercore'))
var Queue = require('ordered-queue')

var hubs = [ 'https://signalhub.mafintosh.com' ]

module.exports = function (self) {
  var mode = null
  var feed, writeQueue, writeSeq = 0
  var swarms = {}

  self.addEventListener('message', function (ev) {
    if (ev.data.type === 'record.start') {
      var stream = core.createWriteStream()
      writeQueue = new Queue(function (buf, next) {
        stream.write(buf)
        next()
      }, { concurrency: 10 })
      mode = 'record'
      var id = stream.key.toString('hex')
      feed = stream.feed
      self.postMessage({ type: 'record.info', id: id })
 
    } else if (ev.data.type === 'peer.start' && feed) {
      var id = ev.data.peerId
      swarms[id] = feed.replicate({ live: true, encrypted: false })
      swarms[id].on('data', function (buf) {
        console.log('SEND PEER', buf.length)
        self.postMessage({
          type: 'peer.data',
          peerId: id,
          buffer: buf
        })
      })
    } else if (ev.data.type === 'peer.data') {
      swarms[ev.data.peerId].write(Buffer(ev.data.buffer))
    } else if (ev.data.type === 'peer.end') {
      swarms[ev.data.peerId].end()
    } else if (mode === 'record' && ev.data.type === 'record.data') {
      var seq = writeSeq++
      tobuf(ev.data.blob, function (buf) {
        writeQueue.push(seq, buf)
      })
    } else if (ev.data.type === 'play.stream') {
      var stream = core.createReadStream(ev.data.id, {
        live: true,
        start: ev.data.start,
        end: ev.data.end
      })
      feed = stream.feed
      stream.on('data', function (buf) {
        self.postMessage({
          type: 'play.data',
          index: ev.data.index,
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
