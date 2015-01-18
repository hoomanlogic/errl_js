var gulp = require('gulp');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');

var onError = function (err) {  
	gutil.beep();
	console.log(err);
};

// TASK: Minify Javascript
gulp.task('minify-js', function () {
    return gulp.src(['src/*.js'])
		.pipe(plumber({
			errorHandler: onError
		}))
		.pipe(rename(function (path) {
            path.basename += '.min';
        }))
        .pipe(uglify())
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', function () {
	var jsWatcher = gulp.watch(['src/*.js'], ['minify-js']);
	jsWatcher.on('change', function (event) {
		console.log('File ' + event.path + ' was ' + event.type + ', running task...');
	});
});