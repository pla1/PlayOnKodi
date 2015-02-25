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
  console.log("Devices: " + $scope.devices);
  if (typeof $scope.devices == "undefined") {
    console.log("Devices is blank.");
    $scope.devices=[];
    localStorage.setItem("devices",JSON.stringify($scope.devices));
  }

  $scope.searchYouTube = function() {
    var searchText = $scope.searchField;
    console.log('Looking up: ' + searchText + " max results:" + $scope.maxResults);
    var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&key=AIzaSyDPxFL1smrq3bV6BlbPswsvgKnS1G97-4Y&q="+searchText+"&maxResults="+$scope.maxResults+"&safeSearch="+$scope.ytSafeSearch+"&order="+$scope.ytOrder;
    console.log("URL: " + url);
    $http.get(url).success(function(data) {
      $scope.items = data.items;
      for (var i = 0;i<$scope.items.length;i++) {
          $scope.items[i].age=moment($scope.items[i].snippet.publishedAt).fromNow();
      }
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
