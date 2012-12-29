/**
* @license cs 0.4.3 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
* Available via the MIT or new BSD license.
* see: http://github.com/jrburke/require-cs for details
*/

/*jslint */
/*global define, window, XMLHttpRequest, importScripts, Packages, java,
ActiveXObject, process, require */

define(['module'], function (module) {
  'use strict';
  var getXhr,
    progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
    fetchText = function () {
      throw new Error('Environment unsupported.');
    };

  // Browser action
  getXhr = function () {
    //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
    var xhr, i, progId;
    if (typeof XMLHttpRequest !== "undefined") {
      return new XMLHttpRequest();
    } else {
      for (i = 0; i < 3; i += 1) {
        progId = progIds[i];
        try {
          xhr = new ActiveXObject(progId);
        } catch (e) {}

        if (xhr) {
          progIds = [progId];  // so faster next time
          break;
        }
      }
    }

    if (!xhr) {
      throw new Error("getXhr(): XMLHttpRequest not available");
    }

    return xhr;
  };

  fetchText = function (url, callback, errback) {
    var xhr = getXhr();
    xhr.open('GET', url, requirejs.inlineRequire ? false : true);
    xhr.onreadystatechange = function (evt) {
      var status, err;
      //Do not explicitly handle errors, those should be
      //visible via console output in the browser.
      if (xhr.readyState === 4) {
        status = xhr.status;
        if ((status > 399 && status < 600) || status == 0) {
          err = new Error(url + ' HTTP status: ' + status);
          err.xhr = xhr;
          errback(err);
        }
        else
          callback(xhr.responseText);
      }
    };
    xhr.send(null);
  };

  return {
    pluginBuilder: './cs-builder',

    fetchText: fetchText,

    version: '0.4.3',

    load: function (name, parentRequire, load, config) {
      require(['coffee-script'], function(CoffeeScript) {
        var path = parentRequire.toUrl(name + '.coffee');
        fetchText(path, function (text) {

          //Do CoffeeScript transform.
          try {
            text = CoffeeScript.compile(text, config.CoffeeScript);
          } catch (err) {
            err.message = "In " + path + ", " + err.message;
            throw err;
          }

          //IE with conditional comments on cannot handle the
          //sourceURL trick, so skip it if enabled.
          /*@if (@_jscript) @else @*/
          text += "\r\n//@ sourceURL=" + path;
          /*@end@*/

          load.fromText(module.id + '!' + name, text);

          //Give result to load. Need to wait until the module
          //is fully parse, which will happen after this
          //execution.
          parentRequire([module.id + '!' + name], function (value) {
            load(value);
          });
        });
      }, function (err) {
        if (load.error)
          load.error(err);
      });
    }
  };
});
