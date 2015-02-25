var pokApp = angular.module('pokModule', []);



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

pokApp.controller('PokController', [ '$scope', '$http', function($scope, $http) {
  $scope.maxResults = storageGet("maxResults",5);
  $scope.ytOrder = storageGet("ytOrder","date");
  $scope.ytSafeSearch = storageGet("ytSafeSearch","moderate");
  $scope.devices = JSON.parse(localStorage.getItem("devices"));
  $scope.notOnQueue="notOnQueue";
  console.log("Devices: " + JSON.stringify($scope.devices));
  if (typeof $scope.devices == "undefined" || isBlank($scope.devices)) {
    console.log("Devices is blank.");
    $scope.devices=[];
    localStorage.setItem("devices",JSON.stringify($scope.devices));
  }

  $scope.searchYouTube = function() {
    console.log('Looking up: ' + $scope.searchField + " max results:" + $scope.maxResults);
    var url = "https://www.googleapis.com/youtube/v3/search";
    var httpConfig = {
          method: "GET",
          params: {
              part: "snippet",
              type: "video",
              key: "AIzaSyDPxFL1smrq3bV6BlbPswsvgKnS1G97-4Y",
              q: $scope.searchField,
              maxResults: $scope.maxResults,
              safeSearch: $scope.ytSafeSearch,
              order: $scope.ytOrder
          }
    }
    console.log("URL:" + url + "HTTP Config: " + JSON.stringify(httpConfig));
    $http.get(url, httpConfig).success(function(data) {
      $scope.items = data.items;
      for (var i = 0;i<$scope.items.length;i++) {
          $scope.items[i].age=moment($scope.items[i].snippet.publishedAt).fromNow();
          $scope.items[i].kodiStatus=$scope.notOnQueue;
      }
    });
  }
  $scope.playOnKodi = function(item) {
    console.log("playOnKodi" + JSON.stringify(item));
    var url = "http://10.6.1.6:8080/jsonrpc";
    var data = {
          jsonrpc : "2.0",
          method : "Playlist.Add",
          id : 1,
          params : {
            playlistid : 1,
            item : {
              file : "plugin://plugin.video.youtube/?action=play_video&videoid=" + item.id.videoId
            }
          }
    };
    $http.post(url, data).success(function(data) {
      console.log(data);
      item.kodiStatus="addedToQueue";
      if ($scope.kodiIsPlaying() == 0) {
          $scope.kodiPlay();
      }
    });

  }

  $scope.kodiIsPlaying = function() {
    var url = "http://10.6.1.6:8080/jsonrpc";
    var playerQuantity = 0;
    var data = {
      jsonrpc:"2.0",
      method: "Player.GetActivePlayers",
      id: 1
    };
    $http.post(url, data).success(function(data) {
      console.log(data);
      playerQuantity = data.result.length;
    });
    return playerQuantity;
  }
  $scope.kodiPlay = function() {
    var url = "http://10.6.1.6:8080/jsonrpc";
    var data ={
      jsonrpc:"2.0",
      method: "Player.Open",
      id: 1,
      params: {
        item: {
          playlistid:1
        }
      }
    };
    $http.post(url, data).success(function(data) {
      console.log(data);
    });
  }

  $scope.saveYtSettings = function() {
    console.log("saveYtSettings");
    storageSet("ytOrder", $scope.ytOrder);
    storageSet("maxResults", $scope.maxResults);
    storageSet("ytSafeSearch", $scope.ytSafeSearch);
  }
  $scope.saveDevice = function() {
    var device = {};
    device.name=$scope.deviceName;
    device.port=$scope.devicePort;
    device.userName=$scope.deviceUserName;
    device.password=$scope.devicePassword;
    device.description=$scope.deviceDescription;
    console.log("Devices before saving: " + $scope.devices);
    $scope.devices.push(device);
    localStorage.setItem("devices",JSON.stringify($scope.devices));
  }

} ]);
