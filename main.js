var getMedia = require('getusermedia')
var hypercore = require('hypercore')
var multiplex = require('multiplex')
var Queue = require('ordered-queue')

var level = require('level-browserify')
var core = hypercore(level('hypercore'))

var video = document.querySelector('video')

getMedia({ video: true, audio: false }, function (err, media) {
  if (err) return console.error(err)
  video.src = URL.createObjectURL(media)
  video.play()

  var start = Date.now()

  var rec = new MediaRecorder(media)
  var stream = core.createWriteStream()
  var id = stream.publicId.toString('hex')
  console.log('id=', id)

  var queue = new Queue(function (buf, next) {
    stream.write(buf)
    next()
  }, { concurrency: 10 })

  var i = 0
  rec.addEventListener('dataavailable', function (ev) {
    var index = i++
    tobuf(ev.data, function (buf) {
      queue.push(index, buf)
    })
  })
  rec.start()
})

function tobuf (blob, cb) {
  var r = new FileReader()
  r.addEventListener('loadend', function () {
    cb(Buffer(new Uint8Array(r.result)))
  })
  r.readAsArrayBuffer(blob)
}
