var hypercore = require('hypercore')
var level = require('level-browserify')
var core = hypercore(level('hypercore'))
var Queue = require('ordered-queue')
var wswarm = require('webrtc-swarm')
var signalhub = require('signalhub')

var hubs = [ 'https://signalhub.mafintosh.com' ]

module.exports = function (self) {
  var mode = null
  var writeStream, writeQueue, writeSeq = 0
  var swarm

  self.addEventListener('message', function (ev) {
    if (ev.data.type === 'record.start') {
      writeStream = core.createWriteStream()
      writeQueue = new Queue(function (buf, next) {
        writeStream.write(buf)
        next()
      }, { concurrency: 10 })
      mode = 'record'

      var id = writeStream.publicId.toString('hex')
      createSwarm(id)
      self.postMessage({ type: 'record.info', id: id })
    } else if (ev.data.type === 'play.start') {
      createSwarm(ev.data.id)
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

function createSwarm (id) {
  swarm = wswarm(signalhub('sudocast.' + id, hubs))
  swarm.on('peer', function (peer, peerId) {
    console.log('PEER', peerId)
    peer.pipe(core.replicate()).pipe(peer)
  })
}
