var fs = require('fs'),
    gulp = require('gulp'),
    bump = require('gulp-bump'),
    git = require('gulp-git'),
    gutil = require('gulp-util'),
    groc = require('groc'),
    spawn = require('child_process').spawn,
    pargv = require('./lib/index'),
    pargs = pargv.parse();

// Common handler for gulp errors.
function error(err) {
  if(err)
    throw new gutil.PluginError('gulp-<%= pluginName %>', err);
}

// Git commit common task.
function commit() {

  var flags,
      keys;

  // Convert flags to array.
  flags = pargv.flagsToArray({ 'a': true, 'm': 'Lazy commit' });

  // Commit the project.
  return gulp.src('./*')
    .pipe(git.commit(undefined, {
        args: flags.join(' '),
        disableMessageRequirement: true
    }));

}

// Bumps the project's version.
gulp.task('bump', function(cb) {

  if (pargs.cmd === 'commit:local')
    return cb();

  return gulp.src(['./package.json'])
      .pipe(bump())
      .pipe(gulp.dest('./'));

});

// Remote commit.
gulp.task('commit', commit);

// Push commit(s) to remote repo.
gulp.task('push', function(cb) {
    return git.push('origin', 'master', {}, function(err) {
        if (err)
          throw err;
        cb();
    });
});

// Publish the project to NPM.
gulp.task('pub', function(cb) {
    return spawn('npm', ['publish'], { stdio: 'inherit' }).on('close', function() {
        cb();
    });
});

// Commit locally without bumping version.
gulp.task('commit:local', ['commit']);

// Bump project then commit & push.
gulp.task('commit:remote', ['bump', 'commit', 'push']);

// Publish to NPM after commit.
gulp.task('commit:publish', [ 'bump', 'commit', 'push', 'pub']);

// Builds out documentation.
gulp.task('docs', function (cb) {

  var args = [];

  if(pargs.github)
    args.push('--github');

  return groc.CLI([],function (err) {
    // Don't need to handle the error directly
    // it will be logged in console but add additional
    // error indicating docs although built were not output.
    if(err)
      error('Docs successfully built but failed to output due to error.');
    cb();

  });

});
