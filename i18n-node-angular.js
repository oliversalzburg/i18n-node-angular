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

i18nModule.directive( "i18nInit", [ "i18n", "$rootScope", function( i18n, $rootScope ) {
  return {
    restrict : "A",
    link     : function postLink( scope, element, attributes ) {
      attributes.$observe( "i18nInit", function( value ) {
        i18n.init( value );
      } );
      $rootScope.$watch( "i18nInit", function localeChanged( newLocale, oldLocale ) {
        if( !newLocale || newLocale == oldLocale ) return;
        i18n.init( newLocale );
      } );
    }
  };
} ] );

i18nModule.factory( "i18n", function( $rootScope, $http, $q ) {
  var i18nService = function() {

    this._localeLoadedDeferred = $q.defer();
    this._deferredStack = [];

    this.loaded = false;

    this.init = function( locale ) {
      if( locale != this.userLanguage ) {
        if( this._localeLoadedDeferred ) {
          this._deferredStack.push( this._localeLoadedDeferred );
        }
        this._localeLoadedDeferred = $q.defer();
        this.loaded = false;
        this.userLanguage = locale;

        var service = this;

        console.log( "Loading locale '" + locale + "' from server..." );
        $http( { method : "get", url : "/i18n/" + locale, cache : true } ).success( function( translations ) {
          $rootScope.i18n = translations;
          service.loaded = true;
          service._localeLoadedDeferred.resolve( $rootScope.i18n );

          while( service._localeLoadedDeferred.length ) {
            service._localeLoadedDeferred.pop().resolve($rootScope.i18n);
          }
        } );
      }

      return this._localeLoadedDeferred.promise;
    };

    this.ensureLocaleIsLoaded = function() {
      return this._localeLoadedDeferred.promise;
    };

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

    //this.ensureLocaleIsLoaded();
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
