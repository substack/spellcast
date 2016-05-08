var getMedia = require('getusermedia')
var multiplex = require('multiplex')

var Worker = require('webworkify')
var worker = Worker(require('./worker.js'))
worker.addEventListener('message', function (ev) {
  if (ev.data.type === 'record.info') {
    state.recordId = ev.data.id
    update()
  } else if (state.playing && ev.data.type === 'play.data') {
    //...
    update()
  }
})

var html = require('yo-yo')
var root = document.querySelector('#content')
var video = html`<video width="400" height="300"></video>`
var state = {
  playId: /^#\w{16,}/.test(location.hash) ? location.hash.slice(1) : null,
  recordId: null,
  recording: false,
  playing: false
}
var recorder = null

window.addEventListener('hashchange', function () {
  var h = location.hash.slice(1)
  if (/^#\w{16,}/.test(location.hash)
  && h !== state.recordId && h !== state.playId) {
    state.playId = h
    state.playing = true
    worker.postMessage({ type: 'play.start', id: state.playId })
    update()
  }
})

function update () {
  html.update(root, render(state))
}
update()

function render (state) {
  if (state.playId) return renderPlayer(state)
  else return renderRecorder(state)
}

function renderPlayer (state) {
  return html`<div>${video}</div>`
}

function renderRecorder(state) {
  return html`<div id="content">
    <div>
      ${state.recordId
        ? html`<a href="#${state.recordId}">${state.recordId}</a>`
        : ''}
    </div>
    <div>
      ${state.recording
        ? html`<button onclick=${stopCast}>stop webcast</button>`
        : html`<button onclick=${startCast}>start webcast</button>`
      }
    </div>
    <div>${video}</div>
  </div>`

  function startCast () {
    state.recording = true
    if (recorder) {
      recorder.resume()
      return update()
    }
    worker.postMessage({ type: 'record.start' })

    getMedia({ video: true, audio: false }, function (err, media) {
      if (err) return console.error(err)
      video.src = URL.createObjectURL(media)
      video.play()

      recorder = new MediaRecorder(media)
      recorder.addEventListener('dataavailable', function (ev) {
        worker.postMessage({ type: 'record.data', blob: ev.data })
      })
      recorder.start()
      update()
    })
  }
  function stopCast () {
    if (recorder) recorder.pause()
    state.recording = false
    update()
  }
}
