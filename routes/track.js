
var fs = require('fs')
var path = require('path')
var util = require('util')
var srt2vtt = require('srt-to-vtt')
var u = require('lodash')

const MODNAME = path.parse(module.filename).name

module.exports = sendTrackFile

function sendTrackFile(req, res, next) {
  'use strict';
  var app = res.app

  //NOTE: old non-query string version
  //var p = decodeURI(req.path).split('/')
  //var root = p[2]
  //var subdirs = p.slice(3, p.length-1)
  //var file = p[p.length-1]

  function bail(errstr) {
    console.error('%s: %s', MODNAME, errstr)
    next()
  }

  if (!u.isObject(req.query)) {
    bail(util.format('req.query is not an object req.query = %j', req.query))
    return;
  }
  if ( !u.has(req.query, 'root') ||
       !u.isString(req.query.root) ||
       req.query.root.length === 0 ) {
    bail(util.format('req.query.root = %j', req.query.root))
    return
  }
  if ( !u.has(req.query, 'subdirs') ||
       !u.isArray(req.query.subdirs) ||
       req.query.subdirs.lenth === 0 ) {
    bail(util.format('req.query.subdirs = %j', req.query.subdirs))
    return
  }
  if ( !u.has(req.query, 'file') ||
       !u.isString(req.query.file) ||
       req.query.file.length === 0 ) {
    bail(util.format('req.query.file = %j', req.query.file))
    return
  }

  var root = req.query.root
  var subdirs = req.query.subdirs
  var file = req.query.file

  console.log('%s: root = %j', MODNAME, root)
  console.log('%s: subdirs = %j', MODNAME, subdirs)
  console.log('%s: file = %j', MODNAME, file)

  // See routes/index.js for how I came up with this rx
  var rx = /(?:\/\.\.(?![^\/])|^\.\.(?![^\/])|^\.\.$)/;

  if (root.match(rx)) {
    console.error('%s: HACKING ATTEMPT root=%j matched %s', MODNAME
                 , root, rx.toString())
    res.status(403).end('FUCK OFF')
    return
  }

  for (let subdir of subdirs) {
    if (subdir.match(rx)) {
      console.error('%s: HACKING ATTEMPT subdir=%j matched %s', MODNAME
                   , subdir, rx.toString())
      res.status(403).end('FUCK OFF')
      return
    }
  }

  if (file.match(rx)) {
    console.error('%s: HACKING ATTEMPT file=%j matched %s', MODNAME
                 , file, rx.toString())
    res.status(403).end('FUCK OFF')
    return
  }

  var app_cfg = app.get('app config by name')
  var root_fqdn = app_cfg['video roots'][root].fqdn

  var parts = [root_fqdn]
  parts = parts.concat(subdirs)
  parts.push(file)

  var track_fqfn = path.join.apply(path, parts)
  //console.log("%s: track_fqfn=%s", MODNAME, track_fqfn)

  var ext = path.extname(track_fqfn).substr(1)

  if (ext != 'srt' && ext != 'vtt') {
    res.status(404).end('Good Bye.')
    return
  }

  var stream = fs.createReadStream(track_fqfn)

  res.status(200)
  res.set({ 'Content-Type' : 'text/vtt' })
  
  if (ext == 'srt') {
    console.log('%s: serving .srt file true srt2vtt; %j', MODNAME, track_fqfn)
    stream.pipe(srt2vtt()).pipe(res)
  }
  else if (ext == 'vtt') {
    console.log('%s: serving a .vtt file straight; %j', MODNAME, track_fqfn)
    stream.pipe(res)
  }
  //console.log('%s: ok done', MODNAME)
} //end: sendTrackFile()