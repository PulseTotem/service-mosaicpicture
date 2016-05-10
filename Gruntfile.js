
module.exports = function (grunt) {
    'use strict';

    // load extern tasks
    grunt.loadNpmTasks('grunt-update-json');
    grunt.loadNpmTasks('grunt-npm-install');
    grunt.loadNpmTasks('grunt-express-server');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-yuidoc');
    grunt.loadNpmTasks('grunt-contrib-symlink');
    grunt.loadNpmTasks('grunt-mocha-istanbul');
    grunt.loadNpmTasks('grunt-env');

    // tasks
    grunt.initConfig({

        coreReposConfig : grunt.file.readJSON('core-repos-config.json'),

// ---------------------------------------------
//                               configure tasks
// ---------------------------------------------


        env : {
            test : {
                NODE_ENV : 'test'
            },
            build : {
                NODE_ENV : 'production'
            }
        },

        symlink: {
            // Enable overwrite to delete symlinks before recreating them
            options: {
                overwrite: true
            },
            // The "build/target.txt" symlink will be created and linked to
            // "source/target.txt". It should appear like this in a file listing:
            // build/target.txt -> ../source/target.txt

            coreBackend: {
                src: '<%= coreReposConfig.coreBackendRepoPath %>',
                dest: 't6s-core/core-backend'
            },
            core: {
                src: '<%= coreReposConfig.coreRepoPath %>',
                dest: 't6s-core/core-backend/t6s-core/core'
            }
        },

        update_json: {
            packageBuild: {
                src: ['t6s-core/core-backend/package.json', 'package.json'],
                dest: 'package-tmp.json',
                fields: [
                    'name',
                    'version',
                    'dependencies',
                    'devDependencies',
                    'overrides'
                ]
            }
        },
// ---------------------------------------------

// ---------------------------------------------
//                          build and dist tasks
// ---------------------------------------------
        copy: {
            buildPackageBak: {
                files: 	[{'package-bak.json': 'package.json'}]
            },
            buildPackageReplace: {
                files: 	[{'package.json': 'package-tmp.json'}]
            },
            buildPackageReinit: {
                files: 	[{'package.json': 'package-bak.json'}]
            },

            keepPackage: {
              files: 	[{'build/package.json': 'package.json'}]
            },
            resources: {
                files: 	[{expand: true, cwd: 'resources', src: ['**'], dest: 'build'}]
            },
            buildServiceConfigFile: {
                files: 	[{'build/js/service_config.json': 'scripts/core/service_config.json'}]
            }
        },

        typescript: {
            build: {
                src: [
                    'scripts/**/*.ts'
                ],
                dest: 'build/js/Service.js'
            },
            test: {
                src: [
                    'tests/**/*.ts'
                ],
                dest: 'build/tests/Test.js'
            }
        },

        express: {
            options: {
                port: 6022
            },
            build: {
                options: {
                    script: 'build/js/Service.js',
                    args: ["loglevel=debug"]
                }
            }
        },
// ---------------------------------------------

// ---------------------------------------------
//                                 develop tasks
// ---------------------------------------------
        watch: {
            express: {
                files:  [ 'build/js/Service.js' ],
                tasks:  [ 'express:build' ],
                options: {
                    spawn: false
                }
            },

            developServer: {
                files: ['scripts/**/*.ts'],
                tasks: ['typescript:build']
            }
        },
// ---------------------------------------------

// ---------------------------------------------
//                                 doc tasks
// ---------------------------------------------
        yuidoc: {
            compile: {
                name: 'PulseTotem - Dailymotion Service',
                description: 'Dailymotion Service for PulseTotem products.',
                version: '0.1.0',
                url: 'http://www.pulsetotem.fr',
                options: {
                    extension: '.ts, .js',
                    paths: ['scripts/'],
                    outdir: 'doc/'
                }
            }
        },
// ---------------------------------------------

// ---------------------------------------------
//                                 test tasks
// ---------------------------------------------
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    colors: true,
                    captureFile: 'build/tests/result.txt'
                },
                src: ['build/tests/Test.js']
            },
            jenkins: {
                options: {
                    reporter: 'mocha-jenkins-reporter',
                    quiet: false,
                    reporterOptions: {
                        "junit_report_name": "Tests",
                        "junit_report_path": "build/tests/report.xml",
                        "junit_report_stack": 1
                    }
                },
                src: ['build/tests/Test.js']
            }
        },

        mocha_istanbul: {
            coverage: {
                src: 'build/tests/', // a folder works nicely
                options: {
                    mask: '*.js',
                    root: 'build/tests/',
                    reportFormats: ['cobertura', 'html'],
                    coverageFolder: 'build/coverage'
                }
            },
        },
// ---------------------------------------------


// ---------------------------------------------
//                                    clean task
// ---------------------------------------------
        clean: {
            package: ['package-bak.json', 'package-tmp.json'],
            build: ['build/'],
            heroku: ['heroku/'],
            doc: ['doc'],
            test: ['build/tests/Test.js']
        }
// ---------------------------------------------
    });

    grunt.registerTask('default', ['build']);

    grunt.registerTask('init', ['symlink:coreBackend']);

    grunt.registerTask('initJenkins', ['init','symlink:core']);

    grunt.registerTask('build', function () {
        grunt.task.run(['clean:package', 'clean:build']);

        grunt.task.run(['env:build','update_json:packageBuild', 'copy:buildPackageBak', 'copy:buildPackageReplace', 'npm-install', 'copy:keepPackage', 'copy:buildPackageReinit', 'typescript:build', 'copy:buildServiceConfigFile', 'copy:resources', 'clean:package']);
    });

    grunt.registerTask('develop', ['build', 'express:build', 'watch']);

    grunt.registerTask('doc', ['clean:doc', 'yuidoc']);

    grunt.registerTask('initTest', function() {
        grunt.task.run(['clean:build']);

        grunt.task.run(['env:test','update_json:packageBuild', 'copy:buildPackageBak', 'copy:buildPackageReplace', 'npm-install', 'copy:buildPackageReinit', 'typescript:build', 'typescript:test']);
    });

    grunt.registerTask('coverage', ['initTest', 'mocha_istanbul:coverage']);
    grunt.registerTask('test', ['initTest', 'mochaTest:test']);

    grunt.registerTask('jenkins', ['initTest', 'mochaTest:jenkins', 'mocha_istanbul:coverage', 'clean:package']);


}

