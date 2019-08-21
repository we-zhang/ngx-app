"use strict";

import gulp from "gulp";
import help from "gulp-help";
import del from "del";
import sourcemaps from "gulp-sourcemaps";
import concat from "gulp-concat";
import changed from "gulp-changed";
import ts from "gulp-typescript";
import install from "gulp-install";
import rename from "gulp-rename";
import tslint from "gulp-tslint";
import template from "gulp-template";
import beautify from "gulp-jsbeautifier";
import gulpless from "gulp-less";
import debug from "gulp-debug";
import shell from "gulp-shell";
import gutil from "gulp-util";
import jeditor from "gulp-json-editor";
import jsonlint from "gulp-jsonlint";
import environments from "gulp-environments";
import runSequence from "run-sequence";
import requireDir from "require-dir";
import childProcess from "child_process";
import merge from "merge2";
import fs from "fs";
import path from "path";
import less from "less";
import inlineTemplate from 'gulp-inline-ng2-template';
import ignore from 'gulp-ignore';
import gulpif from 'gulp-if';
import uglify from 'gulp-uglify';
import minimist from 'minimist';

var yarn = require('gulp-yarn');
var dev = environments.development;
var prod = environments.production;
var stage = environments.make("staging");

// patch gulp for help features
help(gulp, {
    hideDepsMessage: true
});

// Automatically load tasks
// requireDir('./build/gulp', {
//     recurse: true
// });


var packageJson = require("./package.json");

var spawn = childProcess.spawn;
var server;

// Command line option:
//  --fatal=[warning|error|off]
var fatalLevel = require('yargs').argv.fatal;


var ERROR_LEVELS = ["error", "warning"]

function isFatal(level) {
    return ERROR_LEVELS.indexOf(level) > -1;
}
// Handle an error based on its severity level.
// Log all levels, and exit the process for fatal levels.
function handleError(level, error) {
    if (error.message) {
        gutil.log(gutil.colors.magenta(error.message));
    }
    if (isFatal(level)) {
        process.exit(1);
    }
}
// Convenience handler for error-level errors.
function onError(error) {
    handleError.call(this, 'error', error);
}
// Convenience handler for warning-level errors.
function onWarning(error) { handleError.call(this, 'warning', error); }

var PATHS = {
    config: {
        type: "ng2",
        mode: "dev"
    },

    client: {
        ts: ["client/src/**/*.ts", "!client/src/app/test/**"],
        js: ["client/src/**/*.js"],
        html: ["client/src/**/*.html"],
        css: ["client/src/**/*.css"],
        less: ["client/src/**/*.less"],
        img: ["client/src/**/*.{svg,jpg,png,ico,ttf,eot,json}"],
        config: ["client/src/**/bs-config.json"],
        libs: [
            "client/node_modules/@angular/common/**/*",
            "client/node_modules/@angular/animations/**/*",
            "client/node_modules/@angular/common/**/*",
            "client/node_modules/@angular/compiler/**/*",
            "client/node_modules/@angular/core/**/*",
            "client/node_modules/@angular/forms/**/*",
            "client/node_modules/@angular/http/**/*",
            "client/node_modules/@angular/platform-browser/**/*",
            "client/node_modules/@angular/platform-browser-dynamic/**/*",
            "client/node_modules/@angular/router/**/*",
            "client/node_modules/core-js/**/*",
            "client/node_modules/rxjs/**/*",
            "client/node_modules/zone.js/**/*",
            "client/node_modules/systemjs/**/*"
        ],
        models: "client/src/common",
    },
    server: {
        src: "server",
        ts: ["server/**/*.ts"],
        js: ["server/**/*.js"],
        libs: [
            "server/package.json"
        ],
        models: "server/common/**/*.ts"
    },
    dist: {
        path: "dist",
        client: "dist/client",
        server: "dist/server",
        serverlibs: "dist/server/node_modules",
        api: "dist/api",
        libs: {
            client: "dist/client/libs",
            server: "dist/server/libs",
            api: "dist/api/libs"
        }
    },
    build: {
        path: "build",
        docs: "build/doc",
        documents: ["build/doc/**/README.API.md"],
        images: ["build/doc/**/*.png"]
    },
    tslint: "tslint.json",
    port: 8000
};



gulp.task("build", callback => {
    runSequence(
        "build-clean",
        "tslint",
        // "build-i18n",
        [
            "build-server",
            "build-client",
        ],
        callback);
});

gulp.task("build-server", callback => {
    runSequence([
        "build-server-libs",
        "build-ts-server"
    ], "build-server-install");
});
gulp.task("build-client", callback => {
   runSequence([
            "build-client-libs",
            "build-ts-client",
            "build-html",
            "build-less",
            "build-css",
            "build-img"
        ]);

});

gulp.task("build-clean", callback => {
    return del([PATHS.dist.client, PATHS.dist.server, PATHS.dist.api], {
        force: true
    }, callback)
});
gulp.task('build-i18n', shell.task([
    'npm run i18n'
]));

gulp.task("tslint-client", callback => {
    return gulp.src(PATHS.client.ts)
        .pipe(tslint({
            formatter: "verbose",
            configuration: PATHS.tslint
        }))
        .pipe(tslint.report())
        .on('error', onError);
});

gulp.task("tslint-server", callback => {
    return gulp.src(PATHS.server.ts)
        .pipe(tslint({
            formatter: "verbose",
            configuration: PATHS.tslint
        }))
        .pipe(tslint.report())
        .on('error', onError);
});

function convertExtensions(ext, path) {
    if (stage()) {
        gutil.log("convertExtensions:" + path);
    }

    if (ext == '.css') {
        let lessPath = path.replace(/\.css$/, '.less');
        try {
            // check less version exists
            fs.accessSync(lessPath, fs.F_OK);
            if (stage()) {
                gutil.log("[convertedExtensions]:" + lessPath);
            }

            return lessPath;
        } catch (e) {
            // nothing to do, it didn't find the less version
        }
    }
    return path;

}

function processLess(path, ext, fileContent, cb) {
    if (stage()) {
        gutil.log("processLess:" + path);
    }

    if (ext == '.css') {
        let lessPath = path.replace(/\.css$/, '.less');
        try {
            // check less version exists
            fs.accessSync(lessPath, fs.F_OK);
            if (stage()) {
                gutil.log("[convertedExtensions]:" + lessPath);
            }
            ext = ".less";
        } catch (e) {
            // nothing to do, it didn't find the less version
        }
    }

    if (ext === ".less") {
        if (stage()) {
            gutil.log("[rendering]:" + path);
        }
        less.render(fileContent, {
            paths: PATHS.client.less,
            compress: true
        }, (err, output) => {
            onRender(err, output ? output.css : null);
        });
    } else {
        cb(null, fileContent);
    }

    function onRender(err, output) {
        return cb(err, output);
    }
}


gulp.task("build-ts-client", callback => {
    var config = "client/tsconfig.json";
    if (prod()) {
        config = "client/tsconfig.prod.json";
    } else if (stage()) {
        config = "client/tsconfig.stage.json";
    } else {
        config = "client/tsconfig.json";
    }

    let tsProject = ts.createProject(config);
    return merge[
        gulp.src(PATHS.client.ts)
        // .pipe(changed(PATHS.dist.client, {
        //     extension: ".js"
        // }))
        // .pipe(debug()) // here...
        .pipe(sourcemaps.init())
        .pipe(inlineTemplate({
            base: 'client/app',
            useRelativePaths: true,
            removeLineBreaks: true,
            customFilePath: convertExtensions,
            styleProcessor: processLess
        }))
        .pipe(tsProject(ts.reporter.fullReporter(true)))
        .on('error', onError)
        .pipe(sourcemaps.write("./client"))
        .pipe(gulp.dest(PATHS.dist.client)),

        gulp.src(PATHS.client.js)
            .pipe(gulp.dest(PATHS.dist.client))
    ]
});

gulp.task("tslint", [
    "tslint-client",
    "tslint-server"
]);

function flatten(lists) {
    return lists.reduce(function(a, b) {
        return a.concat(b);
    }, []);
}

function getDirectories(srcpath) {
    return fs.readdirSync(srcpath)
        .map(file => path.join(srcpath, file))
        .filter(path => fs.statSync(path).isDirectory());
}

function getDirectoriesRecursive(srcpath) {
    return [srcpath, ...flatten(getDirectories(srcpath).map(getDirectoriesRecursive))];
}

gulp.task("build-server-libs", callback => {
    return gulp.src(PATHS.server.libs)
        .pipe(gulp.dest(PATHS.dist.server));
})

gulp.task("build-ts-server", callback => {
    let tsProject = ts.createProject("server/tsconfig.json", {
        typescript: require("typescript")
    });
    let tsResult = gulp.src(PATHS.server.ts)
        .pipe(changed(PATHS.dist.server, {
            extension: ".js"
        }))
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .on('error', onError);

    return merge([
        tsResult.dts.pipe(gulp.dest(PATHS.dist.server)),
        tsResult.js.pipe(gulp.dest(PATHS.dist.server))
    ]);
});


gulp.task("build-html", function() {
    return gulp
        .src(PATHS.client.html)
        .pipe(changed(PATHS.dist.client, {
            extenstion: "*.html"
        }))
        .pipe(gulp.dest(PATHS.dist.client))
        .on('error', onError);
});

gulp.task("build-css", function() {
    return gulp
        .src(PATHS.client.css)
        .pipe(changed(PATHS.dist.client, {
            extenstion: "*.css"
        }))
        .pipe(gulp.dest(PATHS.dist.client))
        .on('error', onError);
});

gulp.task("build-less", function() {
    return gulp
        .src(PATHS.client.less)
        .pipe(sourcemaps.init())
        .pipe(changed(PATHS.dist.client, {
            extenstion: "*.less"
        }))
        .pipe(gulpless())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(PATHS.dist.client))
        .on('error', onError);

});

gulp.task("build-img", function() {
    return gulp
        .src(PATHS.client.img)
        .pipe(changed(PATHS.dist.client))
        .pipe(gulp.dest(PATHS.dist.client))
        .on('error', onError);
});

gulp.task("build-client-libs", function() {
    return gulp
        .src(PATHS.client.libs, {
            base: "client/node_modules/"
        })
        .pipe(changed(PATHS.dist.libs.client))
        .pipe(gulp.dest(PATHS.dist.libs.client))
        .on('error', onError);
});


gulp.task("build-server-install", callback => {
    return gulp.src(PATHS.dist.server + "/package.json")
        .pipe(gulp.dest(PATHS.dist.server))
        .pipe(install({
            production: true
        }))
        .on('error', onError);
    // return gulp.src([PATHS.dist.server + "/package.json", './yarn.lock'])
    //     .pipe(gulp.dest(PATHS.dist.server))
    //     .pipe(yarn({
    //         production: true
    //     }));
});

gulp.task("npm-install", callback => {
    return gulp.src("./package.json")
        .pipe(gulp.dest("./"))
        .pipe(install())
        .on('error', onError);
    // return gulp.src(['./package.json', './yarn.lock'])
    //     .pipe(gulp.dest('./'))
    //     .pipe(yarn({
    //         production: true
    //     }));

});



gulp.task("server.restart", callback => {
    var started = false;
    if (server) {
        server.kill();
    }
    var args = minimist(process.argv.slice(2), {
        default: {
            port: "8080"
        }
    });
    server = spawn("node", [packageJson.main, "--port", args.port]);
    server.stdout.on("data", function(data) {
        console.log(data.toString());
        if (started === false) {
            started = true;
            callback();
        }
    });
    server.stderr.on("data", function(data) {
        console.error(data.toString());
    });
});

gulp.task("go", ["build", "server.restart"], callback => {
    gulp.watch(PATHS.client.ts, ["build-ts"]);
    gulp.watch(PATHS.client.html, ["build-html"]);
    gulp.watch(PATHS.client.css, ["build-css"]);
    gulp.watch(PATHS.client.img, ["build-img"]);
    gulp.watch(PATHS.client.config, ["build-img"]);
    gulp.watch(packageJson.main, ["server:restart"]);
});



// clean up if an error goes unhandled.
process.on("exit", callback => {
    if (server) {
        server.kill();
    }
});


gulp.task("default", ["build"]);