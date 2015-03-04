var pokApp = angular.module('pokModule', []);

pokApp.factory('webSocketService', function($rootScope) {
  console.log("webSocketService");
  var Chat = {};
  Chat.socket = null;
  Chat.connect = (function(host) {
    console.log("Chat.connect");
    if ('WebSocket' in window) {
      Chat.socket = new WebSocket(host);
    } else if ('MozWebSocket' in window) {
      Chat.socket = new MozWebSocket(host);
    } else {
      console.log('Error: WebSocket is not supported by this browser.');
      return;
    }

  });
  Chat.initialize = function() {
    console.log("webSocketService Chat.initialize");
    var device = getActiveDevice();
    var url = 'ws://' + device.name + ':' + device.port;
    console.log("WebSocket URL: " + url);
    Chat.connect(url);
  };
  Chat.sendMessage = (function() {

  });
  return Chat;
});

pokApp.config(function($httpProvider) {

  $httpProvider.interceptors.push(function($q, $rootScope) {
    return {
      'request' : function(config) {
        $rootScope.$broadcast('loading-started');
        return config || $q.when(config);
      },
      'response' : function(response) {
        $rootScope.$broadcast('loading-complete');
        return response || $q.when(response);
      }
    };
  });

});

pokApp.directive("loadingIndicator", function() {
  return {
    restrict : "A",
    template : "<div>Loading...</div>",
    link : function(scope, element, attrs) {
      scope.$on("loading-started", function(e) {
        element.css({
          "display" : ""
        });
      });

      scope.$on("loading-complete", function(e) {
        element.css({
          "display" : "none"
        });
      });

    }
  };
});

pokApp.controller('PokController', [ '$scope', '$http', 'webSocketService', function($scope, $http, webSocketService) {
  // localStorage.removeItem("devices");
  $scope.showSettings = false;
  $scope.maxResults = storageGet("maxResults", 5);
  $scope.ytOrder = storageGet("ytOrder", "date");
  $scope.ytSafeSearch = storageGet("ytSafeSearch", "moderate");
  $scope.devices = JSON.parse(localStorage.getItem("devices"));
  $scope.notOnQueue = "notOnQueue";
  $scope.muteButtonText="Mute";
  $scope.volumeObject = {
    level : 50
  };

  console.log("Devices: " + JSON.stringify($scope.devices));
  if (typeof $scope.devices == "undefined" || isBlank($scope.devices)) {
    console.log("Devices is blank.");
    $scope.devices = [];
    localStorage.setItem("devices", JSON.stringify($scope.devices));
  }

  webSocketService.initialize();
  webSocketService.socket.onmessage = function(message) {
    var jsonObject = JSON.parse(message.data);
    console.log("WebSocket message received: " + message.data);
    console.log("Has property result: " + jsonObject.hasOwnProperty("result") + JSON.stringify(jsonObject));
    if (jsonObject.hasOwnProperty("result")) {
      if(jsonObject.result.hasOwnProperty("volume")) {
        $scope.volumeObject.level = jsonObject.result.volume;
        console.log("Setting volume to:" + $scope.volumeObject.level);
      }
    }
    if (!jsonObject.hasOwnProperty("method")) {
      return;
    }
    var methodName = jsonObject.method;
    if (methodName == "Application.OnVolumeChanged") {
        $scope.volumeObject.level = jsonObject.params.data.volume.toFixed(0);
        if (jsonObject.params.data.muted) {
            $scope.muteButtonText="Unmute";
        } else {
            $scope.muteButtonText="Mute";
        }
        $scope.messageLabel = "Volume: " + $scope.volumeObject.level + " muted: " + jsonObject.params.data.muted;
    }
    $scope.$apply();
  };
  webSocketService.socket.onopen = function() {
    console.log('Info: WebSocket connection opened.');
    $scope.messageLabel = "WebSocket connection opened.";
    console.log($scope.messageLabel);
    $scope.kodiGetVolume();
    $scope.$apply();
  };
  webSocketService.socket.onclose = function() {
    console.log('Info: WebSocket closed.');
    $scope.messageLabel = "WebSocket closed. Will retry in five seconds.";
    console.log($scope.messageLabel);
    $scope.$apply();
    setTimeout(function() {
      webSocketService.initialize();
    }, 5000);
  };

  $scope.searchYouTube = function() {
    console.log('Looking up: ' + $scope.searchField + " max results:" + $scope.maxResults);
    document.getElementById("searchFieldId").blur();
    var url = "https://www.googleapis.com/youtube/v3/search";
    var httpConfig = {
      method : "GET",
      params : {
        part : "snippet",
        type : "video",
        key : "AIzaSyDPxFL1smrq3bV6BlbPswsvgKnS1G97-4Y",
        q : $scope.searchField,
        maxResults : $scope.maxResults,
        safeSearch : $scope.ytSafeSearch,
        order : $scope.ytOrder
      }
    }
    console.log("URL:" + url + "HTTP Config: " + JSON.stringify(httpConfig));
    $http.get(url, httpConfig).success(function(data) {
      $scope.items = data.items;
      for (var i = 0; i < $scope.items.length; i++) {
        $scope.items[i].age = moment($scope.items[i].snippet.publishedAt).fromNow();
        $scope.items[i].kodiStatus = $scope.notOnQueue;
      }
    });
  }

  $scope.kodiAddToPlaylist = function(item) {
    console.log("kodiAddToPlaylist" + JSON.stringify(item));
    var data = {
      jsonrpc : "2.0",
      method : "Playlist.Add",
      id : 1,
      params : {
        playlistid : 0,
        item : {
          file : "plugin://plugin.video.youtube/?action=play_video&videoid=" + item.id.videoId
        }
      }
    };
    webSocketService.socket.send(JSON.stringify(data));
    console.log(data);
    item.kodiStatus = "addedToQueue";
    $scope.kodiPlayIfIdle();
  }
  $scope.kodiClearPlaylist = function() {
    console.log("kodiClearPlaylist");
    var data = {
      jsonrpc : "2.0",
      method : "Playlist.Clear",
      id : 1,
      params : {
        playlistid : 0,
      }
    };
    webSocketService.socket.send(JSON.stringify(data));
  }
//TODO HANDLE IN THE WEBSOCKET ENVIRONMENT
  $scope.kodiPlayIfIdle = function() {
    var data = {
      jsonrpc : "2.0",
      method : "Player.GetActivePlayers",
      id : 1
    };
    console.log("Play if idle " + JSON.stringify(data));
    $scope.kodiPlay();
  }

  $scope.kodiPlay = function() {
    console.log("Kodi play");
    var data = {
      jsonrpc : "2.0",
      method : "Player.Open",
      id : 1,
      params : {
        item : {
          playlistid : 0
        }
      }
    };
    webSocketService.socket.send(JSON.stringify(data));
  }

  $scope.kodiVolume = function() {
    console.log("Kodi volume: " + $scope.volumeObject.level);
    var data = {
      jsonrpc : "2.0",
      method : "Application.SetVolume",
      id : 1,
      params : {
        volume : parseInt($scope.volumeObject.level)
      }
    };
    webSocketService.socket.send(JSON.stringify(data));
  }

  $scope.kodiGetVolume = function() {
    console.log("Kodi get volume");
    var data = {
      jsonrpc : "2.0",
      method : "Application.GetProperties",
      id : 1,
      params : {
        properties : [ 'volume' ]
      }
    };
    webSocketService.socket.send(JSON.stringify(data));
  }

  $scope.kodiPlayPause = function(playerId) {
    console.log("Kodi play / pause toggle");
    var data = {
      jsonrpc : "2.0",
      method : "Player.PlayPause",
      id : 1,
      params : {
        playerid : playerId
      }
    };
    webSocketService.socket.send(JSON.stringify(data));
  }
  // TODOO HANDLE IN THE WEBSOCKET ENVIRONMENT.
  $scope.kodiPlayPauseAll = function() {
    console.log("Kodi play / pause all players");
    var data = {
      jsonrpc : "2.0",
      method : "Player.GetActivePlayers",
      id : 1,
    };
  }

  $scope.kodiStop = function(playerId) {
    console.log("Kodi stop playerid: " + playerId);
    var data = {
      jsonrpc : "2.0",
      method : "Player.Stop",
      id : 1,
      params : {
        playerid : playerId
      }
    };
    webSocketService.socket.send(JSON.stringify(data));
  }
  // TODOO HANDLE IN THE WEBSOCKET ENVIRONMENT.
  $scope.kodiStopAll = function() {
    console.log("Kodi stop all players");
    var data = {
      jsonrpc : "2.0",
      method : "Player.GetActivePlayers",
      id : 1,
    };
  }

  $scope.kodiMusicParty = function() {
    console.log("Kodi stop");
    var data = {
      jsonrpc : "2.0",
      method : "Player.Open",
      id : 1,
      params : {
        item : {
          partymode : "music"
        }
      }
    };
    webSocketService.socket.send(JSON.stringify(data));
    setTimeout($scope.kodiBack, 4000);
    setTimeout($scope.kodiBack, 5000);
  }

  $scope.kodiPlayNext = function(playerId) {
    console.log("Kodi play next");
    var data = {
      jsonrpc : "2.0",
      method : "Player.Goto",
      id : 1,
      params : {
        playerid : playerId,
        to : "next"
      }
    };
    webSocketService.socket.send(JSON.stringify(data));
  }
  // TODOO HANDLE IN THE WEBSOCKET ENVIRONMENT.

  $scope.kodiPlayNextAll = function() {
    console.log("Kodi play / pause all players");
    var data = {
      jsonrpc : "2.0",
      method : "Player.GetActivePlayers",
      id : 1,
    };
  }

  $scope.kodiClearPlaylist = function(playListId) {
    console.log("Kodi play next");
    var data = {
      jsonrpc : "2.0",
      method : "Playlist.Clear",
      id : 1,
      params : {
        playlistid : playListId

      }
    };
    webSocketService.socket.send(JSON.stringify(data));
  }
  // TODOO HANDLE IN THE WEBSOCKET ENVIRONMENT.

  $scope.kodiClearPlaylistAll = function() {
    console.log("Kodi clear all playlists");
    var data = {
      jsonrpc : "2.0",
      method : "Playlist.GetPlaylists",
      id : 1,
    };

  }

  $scope.kodiMute = function() {
    console.log("Kodi mute");
    var data = {
      jsonrpc : "2.0",
      method : "Application.SetMute",
      id : 1,
      params : {
        mute : "toggle"
      }
    };
    console.log("Websocket sending: " + JSON.stringify(data));
    webSocketService.socket.send(JSON.stringify(data));
  }

  $scope.kodiShutdown = function() {
    console.log("Kodi shutdown");
    var data = {
      jsonrpc : "2.0",
      method : "System.Shutdown",
      id : 1
    };
    webSocketService.socket.send(JSON.stringify(data));
  }
  $scope.kodiBack = function() {
    console.log("Kodi back");
    var data = {
      jsonrpc : "2.0",
      method : "Input.Back",
      id : 1
    };
    webSocketService.socket.send(JSON.stringify(data));
  }

  $scope.saveYtSettings = function() {
    console.log("saveYtSettings");
    storageSet("ytOrder", $scope.ytOrder);
    storageSet("maxResults", $scope.maxResults);
    storageSet("ytSafeSearch", $scope.ytSafeSearch);
  }
  $scope.deselectOtherDevices = function(device) {
    console.log("Deselecting " + $scope.devices.length + " devices.");
    for (i = 0; i < $scope.devices.length; i++) {
      if (device.id != $scope.devices[i].id) {
        $scope.devices[i].active = false;
      }
    }
  }
  $scope.getActiveDevice = function() {
    for (i = 0; i < $scope.devices.length; i++) {
      if ($scope.devices[i].active) {
        console.log("getActiveDevice: " + JSON.stringify($scope.devices[i]));
        return $scope.devices[i];
      }
    }
    if ($scope.devices.length > 0) {
      console.log("getActiveDevice return the first one since none were active: " + JSON.stringify($scope.devices[0]));
      return $scope.devices[0];
    }
    return null;
  }
  $scope.deviceToggle = function(device) {
    console.log(JSON.stringify(device) + " active: " + device.active);
    if (device.active) {
      $scope.deselectOtherDevices(device);
    }
    $scope.saveDevice(device);
  }
  $scope.deleteDevice = function(device) {
    console.log("Delete device: " + JSON.stringify(device) + " device quantity: " + $scope.devices.length);
    for ( var i in $scope.devices) {
      if (device.id == $scope.devices[i].id) {
        $scope.devices.splice(i, 1);
      }
      if (device.active) {
        if ($scope.devices.length > 0) {
          $scope.devices[0].active = true;
        }
      }
    }
    localStorage.setItem("devices", JSON.stringify($scope.devices));
  }

  $scope.saveDevice = function(device) {
    console.log("Saving device: " + JSON.stringify(device) + " device quantity: " + $scope.devices.length);
    for (i = 0; i < $scope.devices.length; i++) {
      console.log("Device number: " + i + " " + JSON.stringify($scope.devices[i]));
      if ($scope.devices[i].id == device.id) {
        $scope.devices[i] = device;
        localStorage.setItem("devices", JSON.stringify($scope.devices));
        console.log("Device match. Saving device to local storage: " + JSON.stringify(device));
        return;
      }
    }
    console.log("Device not matched. Saving device to local storage: " + JSON.stringify(device));
    $scope.devices.push(device);
    localStorage.setItem("devices", JSON.stringify($scope.devices));
  }

  $scope.saveNewDevice = function() {
    var device = {};
    device.id = generateUUID();
    device.active = true;
    device.name = $scope.deviceName;
    device.port = $scope.devicePort;
    device.userName = $scope.deviceUserName;
    device.password = $scope.devicePassword;
    device.description = $scope.deviceDescription;
    $scope.deselectOtherDevices(device);
    console.log("Devices before saving: " + $scope.devices);
    $scope.devices.push(device);
    localStorage.setItem("devices", JSON.stringify($scope.devices));
    console.log("Devices after saving: " + $scope.devices);
  }


} ]);

function generateUUID() {
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
};

function getActiveDevice() {
  devices = JSON.parse(localStorage.getItem("devices"));
  for (i = 0; i < devices.length; i++) {
    if (devices[i].active) {
      console.log("getActiveDevice: " + JSON.stringify(devices[i]));
      return devices[i];
    }
  }
  if (devices.length > 0) {
    console.log("getActiveDevice return the first one since none were active: " + JSON.stringify(devices[0]));
    return devices[0];
  }
  return null;
}
