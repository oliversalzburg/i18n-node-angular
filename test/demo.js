// Depend on i18n module
var yourApp = angular.module( "yourApp", [ "ngRoute", "i18n" ] )
	.config( [ "$routeProvider", "$locationProvider", function( $routeProvider, $locationProvider ) {
		$routeProvider
			.when( "/", {
				templateUrl : "examples",
				controller  : IndexController
				/* By enabling the resolver below, the i18n service won't be injected into
				 IndexController until the locale has been loaded from the server.
				 To enable the resolver, just remove these two characters ↓
				 */                                                         /*
				 ,resolve    : {
				 i18n    : [ "i18n", function( i18n ) { return i18n.i18n(); } ]
				 }
				 //*/
			} );
		$locationProvider.html5Mode( true );
	} ] )
	.factory( "MyService", function( i18n ) {
		// Use i18n service injected into this service.
		console.log( i18n.__( "My translation phrase" ) );
	} )
	.controller( "IndexController", [ "i18n", "$scope", IndexController ] );

function IndexController( i18n, $scope ) {
	// Inject the service into the scope, so we can access __() and 'loaded'.
	$scope.i18n = i18n;
	// Try to instantly translate a phrase. This can fail, because the locale might not have been loaded yet.
	console.log( "Instant: " + i18n.__( "My translation phrase" ) );
	i18n.ensureLocaleIsLoaded().then( function() {
		// Chaining on the promise returned from ensureLocaleIsLoaded() will make sure the translation is loaded.
		console.log( "Insured: " + i18n.__( "My translation phrase" ) );
	} );
}