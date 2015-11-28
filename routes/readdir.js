
/*
 * GET directory lookup returns JSON
 */

var util = require('util')
var fs = require('fs')
var path = require('path')
var Promise = require('bluebird')
var join = Promise.join
var u = require('lodash')

Promise.promisifyAll(fs)

/* filterFilesByExt
 * 
 * files: array of strings; filenames with or without an extension
 * exts: array of strings; filename extensions without leading '.'
 * 
 */
function filterFilesByExt(files, exts) {
  'use strict';
  console.log("readdir: filterFilesByExt: exts = %j", exts)
  return files.filter(function(fn) {
    for (let ext of exts)
      if (path.extname(fn).substr(1) == ext)
        return true
  })
}

module.exports = function (req, res) {
  'use strict';

  console.log('req.originalUrl = ', req.originalUrl)
  
  var cfg = req.app.get('app config by name')

  console.log("readdir: cfg = ", cfg)

  var root = req.query.root
  var root_fqdn = cfg['video roots'][root].fqdn
  var subdirs = u.clone(req.query.subdirs) || []
  var exts = cfg['acceptable extensions']
  console.log("readdir: exts = %j", exts)

  // Stop any hacking attempt to '..' below '/'
  console.log('readdir: subdirs = %j', subdirs)

  subdirs.unshift('/')
  var nmldir = path.join.apply(path, subdirs)
  nmldir = nmldir.slice(1) // take off the /
  subdirs.shift()

  console.log('readdir: nmldir = %s', nmldir)

  var fqdn = path.join(root_fqdn, nmldir)

  console.log("readdir: fqdn = %j", fqdn)
  
  fs.readdirAsync(fqdn).map(function(fileName) {
    console.log("readdir: fileName = %j", fileName)
    var fqfn = path.join(fqdn, fileName)
    var stat = fs.statAsync(fqfn);

    return join(stat, function(stat) {
      return {
        stat: stat,
        file: fileName
      }
    })
  }).then(function(results) {
    var files = []
      , dirs  = [] //list of directories found in fqdn
      , other = []

    results.forEach(function(result){
      if (result.stat.isDirectory())
        dirs.push(result.file)
      else if (result.stat.isFile)
        files.push(result.file)
      else
        other.push(result.file)
    })

    files = filterFilesByExt(files, exts)
    
    var json = { root    : root
               , subdirs : subdirs
               , files   : files
               , dirs    : dirs
               }
      , json_str = JSON.stringify(json)
    
    console.log("readdir: sending json:\n"
               , util.inspect(json, {depth:null}))
    
    res.set("Content-type", "application/json")
    res.send(json_str)

    if (other.length)
      console.error("NOT FILE OR DIRECTORY: %j", other)
  })
}