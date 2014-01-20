# Using i18n-node in an AngularJS application

## The problem
I have an application that uses Node and express. I use [i18n-node](https://github.com/mashpie/i18n-node) for internationalization.

On the frontend, I use AngularJS and I have certain strings (in controllers, services and templates) which I also need to have translated. I could use [angular-translate](https://github.com/PascalPrecht/angular-translate) here, but I would really like to use the same resources which I have already generated with i18n-node on my backend.

## The solution

### Overview
To make this approach work, we have to make several changes to the application at hand. The final setup is as follows:

1. Communicate the locale, which was detected by i18n-node on the backend, to the frontend through the DOM.
2. Establishing express routes that allow for retrieval of translations.
3. Accessing those routes from Angular.

### Make the users locale known in the DOM
First of all, we want to place the locale that was determined by i18n-node into our DOM for easy retrieval later on. Of course, you could detect the locale on the client side, but this approach makes sure that the same locale is used on both the backend *and* the frontend. To do that, we first create a function that we can call when compiling our template.

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

See [`i18n-node-angular.js`](https://github.com/oliversalzburg/i18n-node-angular/blob/master/i18n-node-angular.js) for a complete example.

### Use the service
We can now access translations easily, by injecting our `i18n` service.

    function MyController( i18n ) {
        console.log( i18n.__( "My translation phrase" ) );
    }

    servicesModule.factory( "MyService", function( i18n ) {
        console.log( i18n.__( "My translation phrase" ) );
    }

If a term wasn't translated yet, the service will invoke the `/i18n/locale/phrase` route and cause i18n-node to add it to the translation JSON file.

### Templates
[`i18n-node-angular.js`](https://github.com/oliversalzburg/i18n-node-angular/blob/master/i18n-node-angular.js) also defines a filter named `i18n`. This filter can be used to translate strings in templates. While a lot of strings that appear in page templates are probably already translated on the backend, strings appearing in templates in directives aren't usually passed through the same channel; this is where we use the filter.

    angular.module( "foo", [])
      .directive( "bar", function() {
        return {
          template: "{{'My translation phrase'|i18n}}"
        };
      });

#### Ensuring the locale was loaded
It is possible that you might invoke `i18n.__` before the translation map was loaded from the server. This will cause an error message to be written to your console, telling you that you need to call `ensureLocaleIsLoaded`.


##### Locally
`ensureLocaleIsLoaded` returns a promise. So you can simply wrap the call around your use of `i18n.__` or include the call earlier in your load hierarchy. Whatever suits your needs best.

An example would be:

    function MyController( i18n ) {
        i18n.ensureLocaleIsLoaded().then( function() { 
            console.log( i18n.__( "My translation phrase" ) ); 
        } );
    }

    servicesModule.factory( "MyService", function( i18n ) {
        i18n.ensureLocaleIsLoaded().then( function() { 
            console.log( i18n.__( "My translation phrase" ) ); 
        } );
    }

##### Globally
Alternatively, you can also [make the controller creation wait for the locale to be loaded](http://stackoverflow.com/questions/16286605/initialize-angularjs-service-with-asynchronous-data). An example of such a configuration with the `i18n` service would be:

    $routeProvider.
      when( "/", {
            templateUrl: "/partials/index",
            controller : IndexController,
            resolve    : { "i18nData": function( i18n ) { return i18n.ensureLocaleIsLoaded().promise; } }
          } );

