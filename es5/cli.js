'use strict';

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var fs = require('fs');
var execSync = require('child_process').execSync;
var semver = require('semver');
var inquirer = require('inquirer');
var shellQuote = require('shell-quote');

var createNpmBump = function createNpmBump(remoteName, branch, prependTag, npm) {
    remoteName = remoteName || 'origin';
    branch = branch || 'master';
    prependTag = prependTag || '';
    npm = npm || true;

    var UsageError = (function (_Error) {
        _inherits(UsageError, _Error);

        function UsageError(message) {
            _classCallCheck(this, UsageError);

            _get(Object.getPrototypeOf(UsageError.prototype), 'constructor', this).call(this, message);
            this.name = 'UsageError';
        }

        return UsageError;
    })(Error);

    return function (releaseType) {
        var isPrerelease = ['major', 'minor', 'patch'].indexOf(releaseType) === -1;

        var getHashFor = function getHashFor(branchName) {
            try {
                return run('git rev-parse --verify ' + quote(branchName)).trim();
            } catch (error) {
                throw new UsageError('Git couldn\'t find the branch: "' + branchName + '"; please ensure it exists');
            }
        };

        var ensureCleanBranch = function ensureCleanBranch() {
            if (getHashFor('HEAD') !== getHashFor(branch)) {
                throw new UsageError('You need to be on the "' + branch + '" branch to run this script');
            }
            if (getHashFor(branch) !== getHashFor(remoteName + '/' + branch)) {
                throw new UsageError('You need to push your changes first');
            }
            if (run('git status -s').length) {
                throw new UsageError('You have uncommited changes! Commit them before running this script');
            }
        };

        var getRootPath = function getRootPath() {
            return run('git rev-parse --show-cdup').trim();
        };
        var getPackageJsonPath = function getPackageJsonPath() {
            return process.cwd() + '/' + getRootPath() + 'package.json';
        };
        var quote = function quote(string) {
            return shellQuote.quote([string]);
        };
        var run = function run(command) {
            return execSync(command, { encoding: 'utf8' });
        };
        var writePackageJson = function writePackageJson(configObject) {
            return fs.writeFileSync(getPackageJsonPath(), JSON.stringify(configObject, null, 2) + '\n');
        };

        var doBump = function doBump() {
            var commitMsg = undefined;
            var packageJson = require(getPackageJsonPath());
            var oldVersion = packageJson.version;

            // Tag a new release
            var newStableVersion = packageJson.version = isPrerelease ? semver.inc(oldVersion, 'pre', releaseType) : semver.inc(oldVersion, releaseType);
            writePackageJson(packageJson);
            console.log('Version bumped from ' + oldVersion + ' to ' + newStableVersion);
            run('git add ' + quote(getPackageJsonPath()));
            run('git commit -m ' + quote('Tag ' + newStableVersion));
            run('git tag ' + quote(prependTag + newStableVersion));

            // Bump to a new pre-release version but only if the version to publish is not
            // itself a pre-release; otherwise semver gets confused.
            //if (!isPrerelease) {
            //    packageJson.version = `${ semver.inc(packageJson.version, 'patch') }-pre`;
            //    writePackageJson(packageJson);
            //    run(`git add ${ quote(getPackageJsonPath()) }`);
            //    run(`git commit -m ${ quote(`Bump to ${ packageJson.version }`) }`);
            //}

            // All public changes are done here.
            inquirer.prompt([{
                name: 'shouldProceed',
                type: 'confirm',
                message: 'Are you sure you want to publish the new version?'
            }], function (answers) {
                if (answers.shouldProceed) {
                    // Push & publish the tag.
                    //run(`git checkout ${ quote(newStableVersion) } 2>/dev/null`);

                    if (npm) {

                        run('npm publish ' + quote(getRootPath()) + (isPrerelease ? ' --tag ' + quote(releaseType) : ''));
                    }

                    //run(`git push ${ quote(remoteName) } ${ quote(newStableVersion) }`);

                    // Push the latest commit.
                    //run(`git checkout ${ quote(branch) } 2>/dev/null`);

                    //if (!isPrerelease) {
                    //    // Force-update the date to prevent two commits having the same time stamp.
                    //    commitMsg = run('git show -s --format=%s');
                    //    run('git reset --soft HEAD^');
                    //    run(`git commit -m ${ quote(commitMsg) }`);
                    //}

                    run('git push ' + quote(remoteName) + ' ' + quote(branch));
                } else {
                    run('git tag -d ' + quote(prependTag + newStableVersion));
                    run('git reset --hard ' + quote(remoteName) + '/' + quote(branch));
                    console.log('Changes reverted');
                }
            });
        };

        ensureCleanBranch();
        doBump();
    };
};

module.exports = createNpmBump('origin', 'master');
module.exports.custom = createNpmBump;

