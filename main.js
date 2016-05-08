var getMedia = require('getusermedia')
var hypercore = require('hypercore')
var multiplex = require('multiplex')

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
  var inorder = Order()

  var i = 0
  rec.addEventListener('dataavailable', function (ev) {
    var i_ = i++
    tobuf(ev.data, inorder(function (buf) {
      console.log('buf', i_, buf.length)
      stream.write(buf)
    }))
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

function Order () {
  var queue = []
  var args = []
  var these = []
  return function (cb) {
    var i = queue.length
    queue[i] = cb
    return function () {
      args[i] = arguments
      these[i] = this
      while (args[0]) {
        queue.shift().apply(these.shift(), args.shift())
      }
    }
  }
}
