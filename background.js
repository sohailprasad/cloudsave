

function https(){
  if(localStorage.no_https == 'on'){
    return 'http://'; //idk why someone would want this
  }
  return 'https://';
}

function getURL(type, request, callback, sync){
  if(request.data && sync) return request.data;
  
  if(request.data) return callback(request); //no need reconverting!
  
  if(/^data:/.test(request.url)){
    console.log('opened via data url');
    var parts = request.url.match(/^data:(.+),/)[1].split(';');
    var mime = parts[0], b64 = parts.indexOf('base64') != -1;
    var enc = request.url.substr(request.url.indexOf(',')+1);
    var data = b64 ? atob(enc) : unescape(enc);
    //data urls dont have any weird encoding issue as far as i can tell
    var name = '';
    if(request.name){
      name = request.name;
    }else{
      name = enc.substr(enc.length/2 - 6, 6) + '.' + mime.split('/')[1];
    }
    if(sync) return data;
    callback({
      data: data,
      type: mime,
      id: request.id,
      size: data.length,
      name: name
    });
    
    //callback(new dFile(data, name, mime, id, size)
  }else{
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', request.url, !sync);
    if(type == 'binary' || type == 'raw'){
      xhr.overrideMimeType('text/plain; charset=x-user-defined'); //should i loop through and do that & 0xff?
    }
    if(sync){
      xhr.send();
      return xhr.responseText;
    }
    xhr.onload = function(){
      if(!request.type) request.type = xhr.getResponseHeader("Content-Type");
    
      console.log('opened via xhr ', request.url);
      var raw = xhr.responseText, data = '';
      //for(var l = raw.length, i=0; i<l;i++){ data += String.fromCharCode(raw.charCodeAt(i) & 0xff); if(!(i%(1024 * 1024))) console.log('1mb') };
      //var data = postMessage(raw.split('').map(function(a){return String.fromCharCode(a.charCodeAt(0) & 0xff)}).join(''));
      //window.fd = data;
      
      //var obj = {id: request.id, bin: function(){return raw}, b64: function(){return btoa(data)},type: request.type, size: data.length, name: request.name}
      //callback(obj);
      //because running it here since js is single threaded causes the asynchrouously running instantInit request to be delayed, slowing it down substantially.
      //using a web worker: probably overkill.

      if(type == 'binary'){
        //*
        if(typeof BlobBuilder == 'undefined'){
        
          for(var raw = xhr.responseText, l = raw.length, i = 0, data = ''; i < l; i++) data += String.fromCharCode(raw.charCodeAt(i) & 0xff);
          
          callback({id: request.id, data: data, type: request.type, size: data.length, name: request.name});
        }else{
        
          var bb = new BlobBuilder();//this webworker is totally overkill
          bb.append("onmessage = function(e) { for(var raw = e.data, l = raw.length, i = 0, data = ''; i < l; i++) data += String.fromCharCode(raw.charCodeAt(i) & 0xff); postMessage(data) }");
          var url;
          if(window.createObjectURL){
            url = window.createObjectURL(bb.getBlob())
          }else if(window.createBlobURL){
            url = window.createBlobURL(bb.getBlob())
          }else if(window.URL && window.URL.createObjectURL){
            url = window.URL.createObjectURL(bb.getBlob())
          }else if(window.webkitURL && window.webkitURL.createObjectURL){
            url = window.webkitURL.createObjectURL(bb.getBlob())
          }
          var worker = new Worker(url);
          worker.onmessage = function(e) {
            var data = e.data;
            callback({id: request.id, data: data, type: request.type, size: data.length, name: request.name});
          };
          
          worker.postMessage(xhr.responseText);
        }
        
        //*/
      }else if(type == 'raw'){
        var data = xhr.responseText;
        callback({id: request.id, data: data, type: request.type, size: data.length, name: request.name});
      }else{
        callback({id: request.id, data: raw, type: request.type, size: data.length, name: request.name});
      }
    }
    xhr.send();
  }
}


function getText(request, callback){
  getURL('text', request, callback);
}

function getRaw(request, callback){
  getURL('raw', request, callback);
}

function getBinary(request, callback){
  getURL('binary', request, callback);
}


