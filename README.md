# How to use i18n-node in an AngularJS application

## The problem
I have an application that uses Node and express. I use [i18n-node](https://github.com/mashpie/i18n-node) for internationalization.

On the frontend, I use AngularJS and I have certain strings (in controllers and services) which I also need to have translated. I could use [angular-translate](https://github.com/PascalPrecht/angular-translate) here, but I would really like to use the same resources which I have already generated with i18n-node on my backend.

## The solution

### Make the users locale known in the DOM
First of all, we want to place the locale that was determined by i18n-node into our DOM for easy retrieval later on. To do that, we first create a function that we can call when compiling our template.

    app.use( function( req, res, next ) {
      res.locals.acceptedLanguage = function() {
        return i18n.getLocale.apply( req, arguments );
      };
      next();
    } );

Now we can use that method in our template. In a jade template it would be as simple as: 

    body(data-language=acceptedLanguage())

### Add the required express routes
We now define two new routes in our express application. The first route will provide our full i18n-node translation document and the second will translate a single phrase.

    module.exports = function( app ) {
        // Routes
        app.get( "/i18n/:locale",          routes.i18n       );
        app.get( "/i18n/:locale/:phrase",  routes.translate  );
    }

Let's look at the implementation of those routes.

#### `routes.i18n`
The content of our translation document can then later be used freely on the frontend. For convenience, we'll also implement a service which we'll check out further below.

    /**
     * Sends a translation file to the client.
     * @param request
     * @param response
     */
    exports.i18n = function( request, response ) {
      var locale = request.params.locale;
      response.sendfile( "locales/" + locale + ".json" );
    };

#### `routes.translate`
The translate route could theoretically be used to dynamically load single translated phrases from the backend. We primarily use it to have previously unknown translation phrases added to our JSON files by i18n-node.  

    /**
     * Translate a given string and provide the result.
     * @param request
     * @param response
     */
    exports.translate = function( request, response ) {
      var locale = request.params.locale;
      var phrase = request.params.phrase;
      var result = i18n.__( {phrase: phrase, locale: locale} );
      response.send( result );
    };

### Create an AngularJS service to access the translation
We now create an AngularJS service, named `i18n` with a method to access translations, named `__()`, thus making the usage equivalent to that on the backend.

We also inject the complete translation into the `$rootScope` which allows us to access it directly in any directive template (or wherever we might want to access it) like `{{i18n['My translation phrase']}}`.

    servicesModule.factory( "i18n", function( $rootScope, $http, $q ) {
      var i18nService = function() {
        this.ensureLocaleIsLoaded = function() {
          var deferred = $q.defer();
    
          if( $rootScope.i18n ) {
            deferred.resolve( $rootScope.i18n );
    
          } else {
            // This is the language that was determine to be the desired language for the user.
            // It was rendered into the HTML document on the server.
            var userLanguage = $( "body" ).data( "language" );
            this.userLanguage = userLanguage;
            console.log( "Loading locale '" + userLanguage + "' from server..." );
            $http( { method:"get", url:"/i18n/" + userLanguage, cache:true } ).success( function( translations ) {
              $rootScope.i18n = translations;
              deferred.resolve( $rootScope.i18n );
            } );
          }
    
          return deferred.promise;
        };
    
        this.__ = function( name ) {
          if( !$rootScope.i18n ) {
            console.error( "i18n: Translation map not initialized. Be sure to call i18nService.ensureLocaleIsLoaded before accessing translations with i18n.__!" );
            return name;
          }
    
          var translation = $rootScope.i18n[ name ];
          if( !translation ) {
            translation = name;
            $http.get( "/i18n/" + this.userLanguage + "/" + name );
          }
          return translation;
        };
    
        this.ensureLocaleIsLoaded();
      };
    
      return new i18nService();
    } );

### Use the service
We can now access translations easily, by injecting our `i18n` service.

    function MyController( i18n ) {
        console.log( i18n.__( "My translation phrase" ) );
    }

    servicesModule.factory( "MyService", function( i18n ) {
        console.log( i18n.__( "My translation phrase" ) );
    }

If a term wasn't translated yet, the service will invoke the `/i18n/locale/phrase` route and cause i18n-node to add it to the translation JSON file.

#### Ensuring the locale was loaded
It is possible that you might invoke `i18n.__` before the translation map was loaded from the server. This will cause an error message to be written to your console, telling you that you need to call `ensureLocaleIsLoaded`.

`ensureLocaleIsLoaded` returns a promise. So you can simply wrap the call around your use of `i18n.__` or include the call earlier in your load hierarchy. Whatever suits your needs best.

An example would be:

    function MyController( i18n ) {
        i18n.ensureLocaleIsLoaded().then( function() { console.log( i18n.__( "My translation phrase" ) ); } );
    }

    servicesModule.factory( "MyService", function( i18n ) {
        i18n.ensureLocaleIsLoaded().then( function() { console.log( i18n.__( "My translation phrase" ) ); } );
    }