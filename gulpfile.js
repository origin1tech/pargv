/* eslint reset: true */

var fs = require('fs'),
    gulp = require('gulp'),
    bump = require('gulp-bump'),
    git = require('gulp-git'),
    gutil = require('gulp-util'),
    groc = require('groc'),
    pargv = require('./lib'),
    spawn = require('child_process').spawn,
    pargs = pargv.parse();

var commitTasks = ['commit:base'],
    baseTasks = [];

// If commit remote bump and push.
if (pargs.remote || pargs.r) {
  baseTasks.push('bump');
  commitTasks.push('push');
}

// If publish commit push and publish to npm.
if (pargs.p || pargs.pub || pargs.publish){
  commitTasks.push('pub');
}

// Common handler for gulp errors.
function error(err) {
  if(err)
    throw new gutil.PluginError('gulp-<%= pluginName %>', err);
}

// Bumps the project's version.
gulp.task('bump', function(cb) {

  if (pargs.cmd === 'commit:local')
    return cb();

  return gulp.src(['./package.json'])
      .pipe(bump())
      .pipe(gulp.dest('./'));

});

// Runs Git commit.
gulp.task('commit:base', baseTasks, function () {

  var flags, valid;

  valid = ['a', 'm', 's', 'c', 'fixup', 'dry-run', 'amend', 'u', 'patch',
           'interactive', 'F', 'cleanup', 'date', 'allow-empty', 'allow-empty-message',
           'no-verify', 'e', 'author', 'i', 'o', 'S'];

  // Ensure subset of valid git switches.
  Object.keys(pargs).forEach(function(k) {
    if (valid.indexOf(k) === -1)
      delete pargs[k];
  });

  // esure commit message.
  pargs.m = pargs.m || 'Lazy commit';

  // always ensure -a
  if(!pargs.a)
    pargs.a = true;

  // Convert flags to array.
  flags = pargv.flagsToArray();

  // Commit the project.
  return gulp.src('./*')
    .pipe(git.commit(undefined, {
        args: flags.join(' '),
        disableMessageRequirement: true
    }));

});

// Push commit(s) to remote repo.
gulp.task('push', ['bump', 'commit:base'], function(cb) {
    return git.push('origin', 'master', {}, function(err) {
        if (err)
          throw err;
        cb();
    });
});

// Publish the project to NPM.
gulp.task('pub', ['bump', 'commit:base', 'push'], function(cb) {
    return spawn('npm', ['publish'], { stdio: 'inherit' }).on('close', function() {
        cb();
    });
});

// Builds out documentation.
gulp.task('docs', function (cb) {

  var args = [];

  if (pargs.g || pargs.github)
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

// Commit by selected tasks.
gulp.task('commit', commitTasks);
