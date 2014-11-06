var assert = require('assert');
var colors = require('colors');
var debug = require('debug')('deplo');
var async = require('async');
var fs = require('fs-extra');
var path = require('path');
var less = require('less');
var uglifyJs = require("uglify-js");
var t = require('tcomb');

var assert = t.assert;
var Str = t.Str;
var Obj = t.Obj;
var list = t.list;

function DirMixin (opts) {
  assert(Obj.is(opts), 'bad opts');
  assert(Str.is(opts.target_dir), 'bad target_dir');
  assert(Str.is(opts.src_dir), 'bad src_dir');

  this.target_dir = opts.target_dir;
  this.src_dir = opts.src_dir;
}

DirMixin.prototype = {
  target: function(relative_path, env) {
    assert(Str.is(relative_path), 'bad relative_path');
    var target_dir = this.target_dir.replace(/%env/, env);
    return path.join(target_dir, relative_path);
  },
  src: function(relative_path) {
    assert(Str.is(relative_path), 'bad relative_path');
    return path.join(this.src_dir, relative_path);
  }
};

//
// app
//

exports = module.exports = function (opts) {
  return new App(opts);
};

function App (opts) {
  opts = opts || {};
  assert(Str.is(opts.target_dir), 'bad target_dir');

  this.target_dir = opts.target_dir;
  this._plugins = [];
}

App.prototype.clean = function() {
  var dir = this.target_dir;
  debug('removing target_dir %s...', dir);
  fs.removeSync(dir);
  debug('removing target_dir %s done.', dir);
};

App.prototype.build = function(env, callback) {
  assert(Str.is(env), 'bad env');
  assert(t.Func.is(callback), 'bad callback');

  timer.start();

  env = env.split(',');
  
  var done = function (err) {
    if (err) {
      print('BUILD FAILED: %s.'.red, err);
      return callback(err);
    }
    print('BUILD DONE in %s millis.'.green, timer.elapsed()); 
    callback();
  };
  
  this.clean();
  async.map(env, function (env, callback) {
    print('build() called with %s env...', env);
    async.map(this._plugins, function (plugin, callback) {
      plugin.build(env, callback);
    }, callback);
  }.bind(this), done);
};

App.prototype.watch = function() {
  var done = function () {
    print('Watching all files done. Waiting for changes...');
  };

  var watch = function (plugin, callback) {
    plugin.watch(callback);
  };

  async.map(this._plugins, watch, done);
};

App.prototype.use = function(plugin) {
  assert(!this.hasOwnProperty(plugin.name), 'duplicate plugin name');
  this._plugins.push(plugin);
  this[plugin.name] = plugin.add.bind(plugin);
};

//
// plugins
//

var JsPlugin = function (opts) {
  DirMixin.call(this, opts);
  assert(Str.is(opts.banner), 'bad banner');
  assert(Obj.is(opts.compress), 'bad compress');
  assert(Obj.is(opts.transformers), 'bad transformers');

  this.banner = opts.banner;
  this.compress = opts.compress;
  this.transformers = this._transformers(opts.transformers);
  this._targets = {};
  this._watchee = {};
  this._cache = {};
};

t.util.mixin(JsPlugin.prototype, DirMixin.prototype);

t.util.mixin(JsPlugin.prototype, {
  name: 'js',
  add: function (target, deps) {
    assert(Str.is(target), 'bad target');
    assert(list(Str).is(deps), 'bad deps');

    debug('adding js target %s', target);

    deps = deps.map(this.src, this);
    this._targets[target] = deps;

    var addTarget = function (dep) {
      var targets = this._watchee[dep] = this._watchee[dep] || [];
      targets.push(target);
    };

    deps.forEach(addTarget, this);
  },
  build: function (env, callback) {
    debug('calling plugin %s.build (%s)...', this.name, env);

    var build = function (target, callback) {
      this._build(target, env, callback);
    }.bind(this);

    async.map(Object.keys(this._targets), build, callback);
  },
  watch: function (callback) {
    debug('watching %s files...', this.name);

    var self = this;

    var rebuildTargets = function (dep) {
      debug('%s changed, rebuilding all targets...', dep);

      timer.start();

      var done = function (err) {
        if (err) {
          debug('rebuilding %s targets FAILED: %s.'.red, dep, err);
          return;
        }
        debug('rebuilding %s targets done in %s millis.'.green, dep, timer.elapsed());
      };

      // invalidate cache
      delete self._cache[dep];
      var targets = self._watchee[dep];
      async.map(targets, function (target, callback) {
        self._build(target, 'development', callback);
      }, done);
    };

    Object.keys(this._watchee).forEach(function (dep) {
      watchFile(dep, rebuildTargets);
    });

    callback();
  },
  _transformers: function (transformers) {
    var ret = {};
    for (var k in transformers) {
      if (transformers.hasOwnProperty(k)) {
        ret[this.src(k)] = transformers[k];
      }
    }
    return ret;
  },
  _readFromCache: function (path, env, callback) {
    var cache = this._cache[path];
    var compress = this.compress[env];
    if (cache) {
      debug('%s file source found', path);
      var source = cache.source;
      if (compress) {
        if (cache.compress) {
          debug('%s compressed source found', path);
          callback(null, cache.compress);
        } else {
          debug('compressing file %s...', path);
          source = uglify(source);
          if (typeof source !== 'string') return callback(source);
          cache.compress = source;
          debug('compressing file %s done.', path);
          callback(null, source);
        }
        cache.compress
      } else {
        callback(null, source);
      }
    } else {
      debug('%s file not found, reading source...', path);
      var source = readFileSync(path);
      // apply transformations
      source = (this.transformers[path] || []).reduce(function (source, transformer) {
        return transformer(source, env);
      }, source);
      var cache = this._cache[path] = {
        source: source
      };
      debug('%s file cached.', path);
      this._readFromCache(path, env, callback);
    }
  },
  _build: function (target, env, callback) {
    debug('building %s (%s)...', target, env);

    var banner = this.banner;

    var read = function (dep, callback) {
      this._readFromCache(dep, env, callback);
    }.bind(this);
    
    var write = function (err, deps) {
      if (err) return callback(err);
      var js = deps.join('\n');
      // add banner
      js = banner + js;
      target = this.target(target, env);
      debug('writing target %s...', target);
      writeFile(target, js, callback);
    }.bind(this);

    async.map(this._targets[target], read, write);
  }
});

JsPlugin.create = function (opts) {
  return new JsPlugin(opts);
};

var LessPlugin = function (opts) {
  DirMixin.call(this, opts);
  assert(Str.is(opts.banner), 'bad banner');
  assert(Obj.is(opts.compress), 'bad compress');
  assert(list(Str).is(opts.paths), 'bad paths');

  this.banner = opts.banner;
  this.compress = opts.compress;
  this.paths = opts.paths;
  this._targets = {};
  this._watchee = {};
};

t.mixin(LessPlugin.prototype, DirMixin.prototype);

t.mixin(LessPlugin.prototype, {
  name: 'less',
  add: function (target, config) {
    assert(Str.is(target), 'bad target');
    assert(Obj.is(config), 'bad config');
    assert(Str.is(config.main), 'bad main');
    assert(list(Str).is(config.deps), 'bad config.deps');
    if (config.images) {
      assert(Str.is(config.images.target_dir), 'bad config.images.target_dir');
      assert(Str.is(config.images.src_dir), 'bad config.images.src_dir');
    }

    debug('adding less target %s', target);

    var main = this.src(config.main);
    var deps = config.deps.map(this.src, this);
    var images = config.images;
    if (images) {
      images = {
        target_dir: images.target_dir,
        src_dir: this.src(images.src_dir)
      };
    }

    this._targets[target] = {
      main: main,
      deps: deps,
      images: images
    };

    var addTarget = function (dep) {
      var targets = this._watchee[dep] = this._watchee[dep] || [];
      targets.push(target);
    }.bind(this);

    addTarget(main);
    deps.forEach(addTarget);
  },
  build: function (env, callback) {
    debug('calling plugin %s.build (%s)...', this.name, env);

    var build = function (target, callback) {
      this._build(target, env, true, callback);
    }.bind(this);

    async.map(Object.keys(this._targets), build, callback);
  },
  watch: function (callback) {
    debug('watching %s files...', this.name);

    var self = this;

    var rebuildTargets = function (dep) {
      debug('%s changed, rebuilding all targets...', dep);

      timer.start();

      var done = function (err) {
        if (err) {
          debug('rebuilding %s targets FAILED: %s.'.red, dep, err);
          return;
        }
        debug('rebuilding %s targets done in %s millis.'.green, dep, timer.elapsed());
      };

      var targets = self._watchee[dep];
      async.map(targets, function (target, callback) {
        self._build(target, 'development', false, callback);
      }, done);
    };

    Object.keys(this._watchee).forEach(function (dep) {
      watchFile(dep, rebuildTargets);
    });

    callback();
  },
  _build: function (target, env, doCopyImages, callback) {
    debug('building %s (%s)...', target, env);

    var self = this;
    var banner = this.banner;
    var compress = this.compress[env];
    var config = this._targets[target];
    var source = readFileSync(config.main);
    var parser = new (less.Parser)({ paths: this.paths });    
    parser.parse(source, function (err, tree) {
      if (err) return callback(err);
      var css = tree.toCSS({ compress: compress });
      // add banner
      css = banner + css;
      // output
      async.parallel([
        function (callback) {
          target = self.target(target, env);
          debug('writing target %s...', target);
          writeFile(target, css, callback);
        },
        function (callback) {
          if (doCopyImages && config.images) {
            var src_dir = config.images.src_dir;
            var target_dir = self.target(config.images.target_dir, env);
            debug('copying images %s...', config.images.src_dir);
            copy(src_dir, target_dir, callback);
          } else {
            callback();
          }
        }
      ], callback);
    });

  }
});

LessPlugin.create = function (opts) {
  return new LessPlugin(opts);
};

var CopyPlugin = function () {
  this._targets = {};
};

t.mixin(CopyPlugin.prototype, {
  name: 'copy',
  add: function (target_dir, src_dir) {
    assert(Str.is(target_dir), 'bad target_dir');
    assert(Str.is(src_dir), 'bad src_dir');

    debug('adding copy target_dir %s', target_dir);

    this._targets[target_dir] = src_dir;
  },
  build: function (env, callback) {
    debug('calling plugin %s.build (%s)...', this.name, env);

    var build = function (target_dir, callback) {
      src_dir = this._targets[target_dir];
      var target_dir = target_dir.replace(/%env/, env);
      copy(src_dir, target_dir, callback);
    }.bind(this);

    async.map(Object.keys(this._targets), build, callback);
  },
  watch: function (callback) {
    callback();
  }
});

CopyPlugin.create = function (opts) {
  return new CopyPlugin(opts);
};

App.prototype.plugins = {
  js: JsPlugin.create,
  less: LessPlugin.create,
  copy: CopyPlugin.create
};

//
// utils
//

var print = console.log.bind(console);

var timer = {
  start: function () {
    this.tick = +new Date;
  },
  elapsed: function () {
    var now = +new Date;
    return now - this.tick;
  }
};

function readFileSync (path) {
  return fs.readFileSync(path, 'utf8');
}

function writeFile (path, data, callback) {
  fs.outputFile(path, data, callback);
}

function watchFile (path, callback) {
  fs.watchFile(path, { persistent: true, interval: 100 }, function (curr, prev) {
    if (curr.mtime !== prev.mtime) {
      callback(path);
    }
  });
}

function uglify(src) {
  try {
    return uglifyJs.minify(src, {fromString: true}).code;
  } catch (e) {
    return null;
  } 
}

function copy (src, target, callback) {
  fs.ensureDir(target, function (err) {
    if (err) return callback(err);
    fs.copy(src, target, callback);
  });
}


