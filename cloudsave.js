var Hosts = {};

var root = chrome.contextMenus.create({
  "title" : "Cloud Save",
  "contexts" : ["page", "image", "link"]
});

var save_as = chrome.contextMenus.create({
  "title": "Save As...",
  "contexts": ["all"],
  "parentId": root
});

chrome.contextMenus.create({
  "type": "separator",
  "contexts": ["all"],
  "parentId": root
});


//todo: add more
var classes = {
  "image": {
    picasa: 'Picasa',
    twitpic: 'TwitPic',
    flickr: 'Flickr',
    posterous: 'Posterous',
    twitrpix: 'Twitrpix',
    twitgoo: 'Twitgoo',
    imgly: 'Imgly'
  },
  "all": {
    box: 'Box.net',
    dropbox: 'Dropbox',
    gdocs: 'Google Docs',
    minus: 'Min.us',
    cloudapp: 'CloudApp',
    droplr: 'Droplr',
    webdav: 'WebDAV'
  }, 
  "link": {
    dropdo: 'Dropdo' //this one is peculiar because it works differently from all the other hosts
  }
};


function clone(obj){ //very shallow cloning
  var n = {};
  for(var i in obj) n[i] = obj[i]; //we are the knights who say ni!
  return n;
}
var title_map = {};

for(var i in classes){
  for(var h in classes[i]){
    title_map[h] = classes[i][h]; //flatten it out
  }
}

var menu_ids = {};

//an order which shoudl theoretically work, but isnt optimal
//in any stretch of the imagination
/*
  general idea: 
    1. quantity (2 > 1)
    2. position (end > beginning)
*/


try {
  recent = JSON.parse(localStorage.cloudsave_recent);
}catch(err){
  recent = [
    'gdocs',
    'twitpic',
    'dropbox',
    'flickr',
    'box',
    'picasa',
    'gdocs',
    'dropbox'
  ];
}


function handle_click(info, tab){
  console.log(arguments);
  var url = info.linkUrl || info.srcUrl || info.pageUrl;
  var name = unescape(unescape(unescape(url)))
              .replace(/^.*\/|\?.*$|\#.*$|\&.*$/g,'') || 
            url.replace(/.*\/\/|www./g,'')
               .replace(/[^\w]+/g,'_')
               .replace(/^_*|_*$/g,'');
  var host = menu_ids[info.menuItemId];
  if(host == 'dropdo'){
    chrome.tabs.create({
      url: 'http://dropdo.com/upload?link='+url
    })
  }else{
    if(host == 'dropbox' && localStorage.folder_prefix){
      name = localStorage.folder_prefix + name;
    }
    if(info.parentMenuItemId == save_as){
      //woot save as stuff
      console.log('save as');
      name = prompt('Save file as...', name);
      if(!name) return;
    };
    
    if(name.indexOf('/') != -1){
      localStorage.folder_prefix = name.replace(/[^\/]+$/,'');
    }
    
    upload(host, url, name);
  }
  console.log(host, url, name);
  recent.push(host);
  recent.shift();
  localStorage.cloudsave_recent = JSON.stringify(recent);
  updateMenus();
  
}

function updateMenus(){
  Object.keys(menu_ids).reverse().forEach(function(item){
    chrome.contextMenus.remove(parseInt(item));
  });
  menu_ids = {};
  for(var unique = [], freqmap = {}, i = 0; i < recent.length;i++){
    if(!freqmap[recent[i]]){
      freqmap[recent[i]] = 1;
      unique.push(recent[i]);
    }
    freqmap[recent[i]]++;
  }
  var dilation_factor = 100;
  function grade(result){
    return freqmap[result] + recent.lastIndexOf(result) / dilation_factor;
  }
  var sorted = unique.sort(function(a,b){
    return grade(b) - grade(a);
  });
  console.log(recent);
  console.log(unique.map(function(a){
    return a + ' ' + grade(a)  
  }))
  for(var i = 0; i < sorted.length; i++){
    var prop = {
      "title": title_map[sorted[i]],
      "onclick": handle_click
    };
    prop.contexts = classes.image[sorted[i]] ? 
                    ['image'] : 
                  (classes.link[sorted[i]]? 
                    ['image', 'link']:  ['page', 'link', 'image']);
    prop.parentId = root;
    menu_ids[chrome.contextMenus.create(clone(prop))] = sorted[i];
    prop.parentId = save_as;
    menu_ids[chrome.contextMenus.create(clone(prop))] = sorted[i];
  }
  var others = Object.keys(title_map).sort().filter(function(x){
    return unique.indexOf(x) == -1;
  });
  /*
  menu_ids[chrome.contextMenus.create({
    "type": "separator",
    "contexts": ["all"],
    "parentId": root
  })] = 42;
  menu_ids[chrome.contextMenus.create({
    "type": "separator",
    "contexts": ["all"],
    "parentId": save_as
  })] = 42;
  //*/
  var save_as_more = chrome.contextMenus.create({
    "title": "More",
    "parentId": save_as,
    "contexts": ["all"]
  });
  menu_ids[save_as_more] = 'save_as_more';
  var root_more = chrome.contextMenus.create({
    "title": "More",
    "parentId": root,
    "contexts": ["all"]
  });
  menu_ids[root_more] = 'root_more';
  for(var i = 0; i < others.length; i++){
    var prop = {
      "title": title_map[others[i]],
      "onclick": handle_click
    };
    prop.contexts = classes.image[others[i]] ? 
                    ['image'] : 
                  (classes.link[others[i]]? 
                    ['image', 'link']:  ['page', 'link', 'image']);
    prop.parentId = root_more;
    menu_ids[chrome.contextMenus.create(clone(prop))] = others[i];
    prop.parentId = save_as_more;
    menu_ids[chrome.contextMenus.create(clone(prop))] = others[i];
  }
  //*
  menu_ids[chrome.contextMenus.create({
    "type": "separator",
    "contexts": ["all"],
    "parentId": root_more
  })] = 42;
  menu_ids[chrome.contextMenus.create({
    "title": "Add/Remove",
    "contexts": ["all"],
    "parentId": root_more
  })] = 'add_remove'; //*/
}

updateMenus();



function upload(host, url, name){
  Hosts[host]({
    url: url,
    name: name
  }, function(e){
    console.log('uploaded file yay', e);
    if(e && typeof e == "string" && e.indexOf('error:') != -1){
      var notification = webkitNotifications.createNotification(
        'icon/64sad.png',  // icon url - can be relative
        "Aww Snap!",  // notification title
        "The file '"+name+"' could not be uploaded to "+
        title_map[host]+". "+e.substr(6)  // notification body text
      );
      notification.show();
    }else{
      var notification = webkitNotifications.createNotification(
        'icon/64.png',  // icon url - can be relative
        "Uploading Complete",  // notification title
        "The file '"+name+"' has been uploaded to "+
        title_map[host]+"."  // notification body text
      );
      notification.show();
    }
  })
}

