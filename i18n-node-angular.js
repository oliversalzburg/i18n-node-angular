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

i18nModule.factory( "i18n", function( $rootScope, $http, $q ) {
  var i18nService = function() {
    this.ensureLocaleIsLoaded = function() {
      if( !this.existingPromise ) {
        this.existingPromise = $q.defer();
        var deferred = this.existingPromise;

        // This is the language that was determine to be the desired language for the user.
        // It was rendered into the HTML document on the server.
        var userLanguage = $( "body" ).data( "language" );
        this.userLanguage = userLanguage;

        console.log( "Loading locale '" + userLanguage + "' from server..." );
        $http( { method : "get", url : "/i18n/" + userLanguage, cache : true } ).success( function( translations ) {
          $rootScope.i18n = translations;
          deferred.resolve( $rootScope.i18n );
        } );
      }

      if( $rootScope.i18n ) {
        this.existingPromise.resolve( $rootScope.i18n );
      }

      return this.existingPromise.promise;
    };

    this.__ = function( name ) {
      if( !$rootScope.i18n ) {
        console.error( "i18n: Translation map not initialized. Be sure to call i18nService.ensureLocaleIsLoaded before accessing translations with i18n.__!" );
        return name;
      }

      var translation = $rootScope.i18n[ name ];
      if( !translation ) {
        translation = name;

        $rootScope.i18n[ name ] = translation;

        $http.get( "/i18n/" + this.userLanguage + "/" + name ).success( function( translated ) {
          debugger;
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

    this.ensureLocaleIsLoaded();
  };

  return new i18nService();
} );

i18nModule.filter( "i18n", [
  "i18n", function( i18n ) {
    return function( input ) {
      return i18n.__( input );
    };
  }
] );