var getMedia = require('getusermedia')
var multiplex = require('multiplex')

var Worker = require('webworkify')
var worker = Worker(require('./worker.js'))
worker.addEventListener('message', function (ev) {
  if (ev.data.type === 'info') {
    console.log('id=' + ev.data.id)
  }
})

var video = document.querySelector('video')

getMedia({ video: true, audio: false }, function (err, media) {
  if (err) return console.error(err)
  video.src = URL.createObjectURL(media)
  video.play()

  var rec = new MediaRecorder(media)
  rec.addEventListener('dataavailable', function (ev) {
    worker.postMessage({ type: 'blob', blob: ev.data })
  })
  rec.start()
})
