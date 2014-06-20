module.exports = function( grunt ) {

  // Project configuration.
  grunt.initConfig(
    {
      pkg   : grunt.file.readJSON( "package.json" ),
      clean : [ "dist/" ],

      uglify : {
        options : {
          banner : "/*! <%= pkg.name %> <%= grunt.template.today('yyyy-mm-dd HH:MM:ss') %> */\n"
        },
        i18n      : {
          src  : "i18n-node-angular.js",
          dest : "dist/<%= pkg.name %>.min.js"
        }
      }
    }
  );

  grunt.loadNpmTasks( "grunt-contrib-clean" );
  grunt.loadNpmTasks( "grunt-contrib-uglify" );

  grunt.registerTask( "default", ["clean", "uglify"] );
};
