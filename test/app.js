var express = require( "express" );
var i18n = require( "i18n" );
var i18nRoutes = require( "i18n-node-angular" );
var path = require( "path" );

var app = express();
app.set( "view engine", "jade" );
app.set( "views", __dirname + "/views" );

i18n.configure( {
                  // setup some locales - other locales default to en silently
                  locales   : ["en", "de"],
                  directory : __dirname + "/locales"
                } );

//app.use( i18nHelper );
app.use( i18n.init );
app.use( i18nRoutes.getLocale );
i18nRoutes.configure( app, {directory : __dirname + "/locales/"} );

app.get( "/", function( req, res ) {
  res.render( "index" );
} );
app.get( "/start", function( req, res ) {
  res.render( __dirname + "/views/start.jade" );
} );
app.get( "/i18n-node-angular.js", function( req, res ) {
  res.sendfile( path.resolve( __dirname + "/../i18n-node-angular.js" )  );
});

var server = app.listen( 3000, function() {
  console.log( "Listening on port %d", server.address().port );
} );
