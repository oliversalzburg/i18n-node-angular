/**
 * Copyright (C) 2014, Oliver Salzburg
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 * Created: 2014-01-20 21:05
 *
 * @author Oliver Salzburg
 * @copyright Copyright (C) 2014, Oliver Salzburg, HARTWIG Communication & Events
 * @license http://opensource.org/licenses/mit-license.php MIT License
 */

"use strict";

var i18nModule = angular.module( "i18n", [] );

/**
 * The i18nLocale directive can (and should) be used to tell the i18n service which locale to use.
 * You may just want to combine it with the ngApp directive in your DOM. For example:
 *
 * <html ng-app="yourApp" i18n-locale="de">
 *
 * The "de" part should in practice be filled by the result of the i18n.getLocale() call in your express app.
 */
i18nModule.directive( "i18nLocale", [ "i18n", "$rootScope", function( i18n, $rootScope ) {
  return {
    restrict : "A",
    link     : function postLink( scope, element, attributes ) {
      // Observe the value provided to us and re-initialize if it changes.
      attributes.$observe( "i18nLocale", function( value ) {
        i18n.init( value );
      } );
      // Also check if a "i18nLocale" model in the scope changes its value to indicate a desired locale change.
      $rootScope.$watch( "i18nLocale", function localeChanged( newLocale, oldLocale ) {
        if( !newLocale || newLocale == oldLocale ) return;
        i18n.init( newLocale );
      } );
    }
  };
} ] );

/**
 * The main i18n service which handles retrieval of the translation map sends single translation terms to the backend.
 */
i18nModule.factory( "i18n", function( $rootScope, $http, $q ) {
  var i18nService = function() {

    // We use this deferred to keep track of if the last locale loading request has completed.
    this._localeLoadedDeferred = $q.defer();
    // If a lot of locale loading is requested, we collect all the promises on this stack so we can later resolve them.
    this._deferredStack = [];

    // A handy boolean that indicates if the currently requested locale was loaded.
    this.loaded = false;

    // Initialize the service with a given locale.
    this.init = function( locale ) {
      if( locale != this.userLanguage ) {
        if( this._localeLoadedDeferred ) {
          this._deferredStack.push( this._localeLoadedDeferred );
        }
        this._localeLoadedDeferred = $q.defer();
        this.loaded = false;
        this.userLanguage = locale;

        var service = this;

        $http( { method : "get", url : "/i18n/" + locale, cache : true } ).success( function( translations ) {
          $rootScope.i18n = translations;
          service.loaded = true;
          service._localeLoadedDeferred.resolve( $rootScope.i18n );

          while( service._deferredStack.length ) {
            service._deferredStack.pop().resolve( $rootScope.i18n );
          }
        } );
      }

      return this._localeLoadedDeferred.promise;
    };

    /**
     * Syntactic sugar. Returns a promise to return the i18n service, once the translation map is loaded.
     * @returns {defer.promise|*|promise}
     */
    this.i18n = function() {
      var serviceDeferred = $q.defer();

      var service = this;
      this.ensureLocaleIsLoaded().then( function() {
        serviceDeferred.resolve( service );
      } );

      return serviceDeferred.promise;
    };

    /**
     * Returns a promise to return the translation map, once it is loaded.
     * @returns {defer.promise|*|promise}
     */
    this.ensureLocaleIsLoaded = function() {
      return this._localeLoadedDeferred.promise;
    };

    /**
     * Translate a given term, using the currently loaded translation map.
     * @param {String} name The string to translate.
     * @returns {String} The translated string or the input, if no translation was available.
     */
    this.__ = function( name ) {
      if( !$rootScope.i18n ) {
        return name;
      }

      var translation = $rootScope.i18n[ name ];
      if( !translation ) {
        translation = name;

        // Temporarily store the original string in the translation table
        // to avoid future lookups causing additional GET requests to the backend.
        $rootScope.i18n[ name ] = translation;

        // Invoke the translation endpoint on the backend to cause the term to be added
        // to the translation table on the backend.
        // Additionally, store the returned, translated term in the translation table.
        // The term is very unlikely to be actually translated now, as it was most
        // likely previously unknown in the users locale, but, hey.
        $http.get( "/i18n/" + this.userLanguage + "/" + encodeURIComponent( name ) ).success( function( translated ) {
          $rootScope.i18n[ name ] = translated;
        } );
      }

      // If an implementation of vsprintf is loaded and we have additional parameters,
      // try to perform the substitution and return the result
      if( arguments.length > 1 && typeof( vsprintf ) == "function" ) {
        translation = vsprintf( translation, Array.prototype.slice.call( arguments, 1 ) );
      }

      return translation;
    };
  };

  return new i18nService();
} );

/**
 * i18n filter to be used conveniently in templates.
 */
i18nModule.filter( "i18n", [
  "i18n", function( i18n ) {
    return function( input ) {
      return i18n.__.apply( i18n, arguments );
    };
  }
] );
