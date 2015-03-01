window.RELAYR = (function (win, doc) {
    var relayr =  {
        init: function(credentials){
          return new Relayr(credentials);
        }
    };
    function Relayr(credentials){

      if (!(credentials && util.nonEmptyString(credentials.appId))){
        throw new Error("Provide credentials: appId and redirectUri");
      }

      var config ={
        url: "https://api.relayr.io/",
        mqtt: "mqtt.relayr.io",
        mockMode: false
      };


      var self = this;
      self.credentials = credentials;
      self.config = config;
      self.checkAccount = function(){
        if (!self.account){
          throw new Error("You must be logged in to access this method.");
        }
      };
      function login(callback){

        if (!(credentials && util.nonEmptyString(credentials.redirectUri))){
          throw new Error("Provide credentials: redirectUri");
        }
        if (!(callback && callback.success && typeof callback.success == "function")){
          throw new Error("Provide the method success within your parameters");
        }
        var localToken = localStorage.getItem("relayrToken");
        if (localToken){
            triggerCallback();    
          
          }else{

          var authURL ={
            client_id: self.credentials.appId,
            redirect_uri: self.credentials.redirectUri,
            scope: "access-own-user-info"
          };

          this.login.redirect(config.url+"oauth2/auth?client_id="+authURL.client_id+"&redirect_uri="+authURL.redirect_uri+"&response_type=token&scope="+authURL.scope);
        }

        function triggerCallback(){
          self.user().getUserInfo(localToken, function(){

            callback.success(localToken) ;  
          }, function(error){
            if (!(callback && callback.error && typeof callback.error == "function")){
              localStorage.removeItem("relayrToken");
              self.login(callback);
            }else{
              callback.error(error);
            }
          });
          
        }

      }



      function user(){

        this.getUserInfo = function(token, callback, errorCb){

          if (self.account){
            if (!(callback && typeof callback == "function")){
              return self.account;
            }else{
              callback(self.account);
            }
          }else{
            util.ajax({
              url:self.config.url+"oauth2/user-info", 
              type: "GET", 
              token:"Bearer "+ token, 
              isObject: true
            }, function(account){
                account.token = token;
                self.account = account;
                callback(self.account);
            }, function(error){
                errorCb(error);
            });
          }  
          return this;
        };

        this.logout = function(){
          localStorage.removeItem("relayrToken");
        };
      }



      function devices(){

        this.getDeviceData = function(device, callback, errorCb){

          if (!(device && device.incomingData && typeof device.incomingData == "function")){
            throw new Error("Provide the method incomingData within your parameters");
          }
          if (!(device && device.deviceId)){
            throw new Error("Provide the deviceId within your parameters");
          }
          if (device.token){
          }else{
            if (self.account.token){
              device.token = self.account.token;
            }
          }


          device.token = device.token.replace("Bearer ","");
          util.ajax({
            url:self.config.url+"channels", 
            type: "POST", 
            token:"Bearer "+ device.token, 
            isObject: true,
            body:{
              "transport":"mqtt",
              "deviceId": device.deviceId
            }
          }, function(credentials){
 

            device.mqtt = new mqtt(self);
            credentials.cb = device.incomingData;
            device.mqtt.subscribe(credentials);
            device.mqtt.connect();


          }, function(error){
            if (!(device && device.error && typeof device.error == "function")){
              throw new Error("Provide the method error within your parameters");
            }
            errorCb(error);
            localStorage.removeItem("relayrToken");
            self.login();
          });
          return this;
        };   


        this.getAllDevices = function(callback, errorCb){
          util.ajax({
            url:self.config.url+"users/"+self.account.id +"/devices", 
            type: "GET", 
            token:"Bearer "+ self.account.token, 
            isObject: true
          }, function(devices){
            callback(devices);
          }, function(error){
            if (!(errorCb && errorCb && typeof errorCb == "function")){
              throw new Error("Provide the method error within your parameters");
            }
          });
          return this;
        };        


        this.sendCommand = function(device){
          if (!(device && device.deviceId && device.command)){
            throw new Error("Provide the deviceId within your parameters");
          }
          if (device.token){
          }else{
            if (self.account.token){
              device.token = self.account.token;
            }
          }


          device.token = device.token.replace("Bearer ","");
  
          util.ajax({
            url:self.config.url+"devices/"+ device.deviceId+"/cmd", 
            type: "POST", 
            token:"Bearer "+ device.token, 
            isObject: true,
            body: device.command
          }, function(credentials){
 

            device.mqtt = new mqtt(self);
            credentials.cb = device.incomingData;
            device.mqtt.subscribe(credentials);
            device.mqtt.connect();


          }, function(error){
            if (!(device && device.error && typeof device.error == "function")){
              throw new Error("Provide the method error within your parameters");
            }
            errorCb(error);
            localStorage.removeItem("relayrToken");
            self.login();
          });
          return this;
        };   
      } 


      function transmitters(){
        self.checkAccount();
        this.getTransmitters = function(callback, errorCb){
  
          util.ajax({
            url:self.config.url+"users/"+self.account.id +"/transmitters", 
            type: "GET", 
            token:"Bearer "+ self.account.token, 
            isObject: true
          }, function(transmitters){
            callback(transmitters);
          }, function(error){
            if (!(errorCb && errorCb && typeof errorCb == "function")){
              throw new Error("Provide the method error within your parameters");
            }
          });
          return this;
        };
      }

      (function(){
        //Auto check for token scrapping
        function parse(input){
          var parts = input.split("#");
          if (parts.length <  2){
            return undefined;
          }
          var queryParams = parts[1].split("&");
          var obj = queryParams.reduce(function(accumulator, pair){
            var tuple = pair.split("=");
            accumulator[tuple[0]] = tuple[1];
            return accumulator;
          }, {});
          return obj.access_token;
        }
        var parsed = parse(document.location.hash);
        var loc = window.location.href,
            index = loc.indexOf('#access_token');

        if (index > 0) {
          window.location = loc.substring(0, index);
        }
        if (parsed){
          localStorage.setItem("relayrToken", parsed);
        } 
        
      
      })();

      this.login = login;
      this.user = function(){
        return new user();
      };   

      this.devices = function(){
        return new devices();
      };    

      this.transmitters = function(){
        return new transmitters();
      };      

      this.login.redirect = function(uri){
          doc.location = uri;
      };
    }
    


    var util ={
      nonEmptyString: function(string){
        return string && typeof string == "string" && string.length > 0;
      },
      
      ajax: function(options, callback, error){
        var xhrObject = new XMLHttpRequest();
        xhrObject.onreadystatechange = function() {
          if (xhrObject.readyState === 4) {
            if (xhrObject.status > 199 && xhrObject.status < 299 ) {
              
              if (options.isObject){
                callback(JSON.parse(xhrObject.responseText));
              }else{
                callback(xhrObject.responseText);
              }
            }
            if (xhrObject.status === 401) {
              error(xhrObject);
            }
          }
        };
        xhrObject.open(
          options.type, 
          options.url, 
          true
        );
        xhrObject.setRequestHeader("Authorization", options.token);
        xhrObject.setRequestHeader("Content-Type","application/json");
        if (options.body){
          xhrObject.send(JSON.stringify(options.body));
        }else{
          xhrObject.send();
        }
      },
      
      loadScript: function(url, callback){
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;

        script.onreadystatechange = callback;
        script.onload = callback;

        head.appendChild(script);

      }
    };

    function mqtt(base){
      var self = this;
      self.subscriptions =[];
      self.credentials =null;

      self.connect= function(param){
        param= self.subscriptions[0];
        self.credentials = param;
        self.client = new Paho.MQTT.Client(base.config.mqtt, 443, "JSDK_" + Math.floor((Math.random() * 1000)));
        self.client.onConnectionLost = onConnectionLost;
        self.client.onMessageArrived = onMessageArrived;
        self.client.isConnected = false;

        var options = {
          timeout: 3,
          keepAliveInterval: 600,
          cleanSession: true,
          useSSL: true,
          userName:param.credentials.user,
          password:param.credentials.password,
          onSuccess: function(data){
            self.client.isConnected = true;
        
            self.subscriptions.forEach(function(subscription){
              self.client.subscribe(subscription.credentials.topic,0);

            });
          },
          onFailure: function(data){

            if (!self.forceDisconnect){
              self.connect(self.credentials);
            }
            
       
          }
        };


        self.client.connect(options);
      };



      function onMessageArrived(data){
        var deviceId = data._getDestinationName();
        deviceId = deviceId.split("/v1/")[1].split("/")[0];
        var dataTopic =data._getDestinationName().split("/v1/")[1];

        for (var i = self.subscriptions.length - 1; i >= 0; i--) {
         if(self.subscriptions[i].channelId == dataTopic){
          deviceId = self.subscriptions[i].deviceId;
          self.subscriptions[i].cb(JSON.parse(data._getPayloadString()));
         }
        }


      }

      function onConnectionLost(data){
        self.client.isConnected = false;
         self.connect(self.lastParam);
        if (!self.forceDisconnect){
          self.connect(self.lastParam);
        }

      }

      this.disconnect= function(){
        if (self.client){

        }
        self.forceDisconnect= true;
        if (self.client){
          try{

            self.client.disconnect();
          }catch(err){

          }
        }
      };

      this.subscribe= function(channel){
        self.subscriptions.push(channel);
      };

      this.cleanUp= function(){
        self.disconnect();
      };
   
      return this;
    }

    return relayr;
}(window, window.document));