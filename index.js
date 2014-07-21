var fs = require('fs');
var path = require('path');
var less = require('less');
var uglify = require("uglify-js");

// --------
// io utils
// --------

// restituisce il contenuto di un file come stringa
function read(path) {
    return fs.readFileSync(path, 'utf8').toString();
}

// TODO chiamrla ensure_dirs
function dirs(path) {
    var dirs = path.split('/'),
        base_dir = '',
        dir;

    while (dirs.length > 1) {
        var dir = dirs.shift();
        if (dir !== '.' && dir !== '..') {
            if (!is_dir(base_dir + dir)) {
                fs.mkdirSync(base_dir + dir);
            }
        }
        base_dir += dir + '/';
    }
}

// scrive un file creando le directories intermedie se necessario
function write(path, data) {
    dirs(path);
    fs.writeFileSync(path, data, 'utf8');
}

// restituisce true se path è una directory
function is_dir(path) {
    return fs.existsSync(path) ? fs.statSync(path).isDirectory() : false;
}

// elimina tutti file e le sotto directory in una directory
function remove_dir(dir) {
    if( fs.existsSync(dir) ) {
        fs.readdirSync(dir).forEach(function(file){
            var base_dir = path.join(dir, file);
            if (is_dir(base_dir)) { // recurse
                remove_dir(base_dir);
            } else { // delete file
                fs.unlinkSync(base_dir);
            }
        });
        fs.rmdirSync(dir);
    }
}

function copy_dir(src, target) {
    remove_dir(target);
    dirs(target);
    if (is_dir(src)) {
        fs.mkdirSync(target);
        fs.readdirSync(src).forEach(function(file) {
            copy_dir(path.join(src, file), path.join(target, file));
        });
    } else {
        fs.linkSync(src, target);
    }
};

function watch(file, callback) {
    fs.watchFile(file, { persistent: true, interval: 100 }, function (curr, prev) {
        if (curr.mtime !== prev.mtime) {
            callback();
        }
    });
}

function Builder() {
    this.opts = {};
    this._uses = {};
    this._configs = {
        js: {},
        less: {},
        images: {}
    };
}

// associa una funzione di trasformazione al contenuto dei file sorgenti
// indicati da paths
Builder.prototype.use = function(transformer, paths) {
    //assert(Func.is(transformer), 'use(): transformer non è una funzione');
    //assert(List(Str).is(paths), 'use(): paths non è una lista di stringhe');

    var u = this._uses;
    paths.forEach(function (path) {
        u[path] = u[path] || [];
        u[path].push(transformer);
    });
};

Builder.prototype.js = function(config) {
    this._configs.js[config.target] = config;
};

Builder.prototype.less = function(config) {
    this._configs.less[config.target] = config;
};

Builder.prototype.images = function(config) {
    this._configs.images[config.target] = config;
};

Builder.prototype._read = function(src) {
    var src_path = this.opts.src + src;
    var data = read(src_path);
    return (this._uses[src] || []).reduce(function (data, transformer) {
        return transformer(data);
    }, data);
};    

Builder.prototype._banner = function(config) {
    return config.banner || this.opts.banner || '';
};

Builder.prototype._compress = function(config) {
    return typeof config.compress !== 'undefined' ? config.compress : !!this.opts.compress;
};

Builder.prototype._build_js = function(target) {

    console.log('Building ' + target);
    
    var config = this._configs.js[target];
    config.deps = config.deps || [];
    var js = config.deps.map(this._read.bind(this)).join('\n');
    if (this._compress(config)) {
        var result = uglify.minify(js, { fromString: true, outSourceMap: this.opts.target + target + '.map' });
        js = result.code;
        //write(this.opts.target + target + '.map', result.map);
    }
    js = this._banner(config) + js;
    write(
        this.opts.target + target, 
        js
    );
};

Builder.prototype._build_less = function(target) {
    
    console.log('Building ' + target);
    
    var config = this._configs.less[target];
    config.deps = config.deps || [];
    var main = read(this.opts.src + config.main);
    var parser = new (less.Parser)({ paths: config.paths || this.opts.less.paths || [] });
    parser.parse(main, function (err, tree) {
        if (err) {
            throw err;
        } else {
            var css = tree.toCSS({ compress: this._compress(config) });
            css = this._banner(config) + css;
            write(
                this.opts.target + target, 
                css
            );
            if (config.images) {
                console.log('Copying images ' + this.opts.src + config.images.src);
                copy_dir(
                    this.opts.src + config.images.src, 
                    this.opts.target + config.images.target
                );
            }
        }
    }.bind(this));
};

Builder.prototype._build_images = function(target) {
    var src = this._configs.images[target].src;
    console.log('Copying images ' + this.opts.target + target);
    copy_dir(
        this.opts.src + src, 
        this.opts.target + target
    );
};    

Builder.prototype.clean = function (dir) {
    //assert(Str.is(dir || this.opts.target));

    remove_dir(dir || this.opts.target);
    return this;
};

Builder.prototype.build = function() {
    
    console.log('**********');
    console.log('  Build  ');
    console.log('**********');
    
    this.opts.src = this.opts.src || '';
    this.opts.target = this.opts.target || '';
    this.opts.less = this.opts.less || {};

    var target;
    for (target in this._configs.js) {
        this._build_js(target);
    }
    for (target in this._configs.less) {
        this._build_less(target);
    }
    for (target in this._configs.images) {
        this._build_images(target);
    }
    return this;
};

Builder.prototype.watch = function() {
    
    console.log('**********');
    console.log('  Watch  ');
    console.log('**********');

    var self = this;
    var files = {
        js: {},
        less: {}
    };
    var watch_files = function (files, callback) {
        Object.keys(files).forEach(function (src) {
            watch(src, function () {
                console.log(src + ' changed');
                files[src].forEach(callback);
            });
        });
    };
    var target;

    // ricavo la relazione dep -> target
    for (target in this._configs.js) {
        this._configs.js[target].deps.forEach(function (src) {
            src = (self.opts.src || '') + src;
            files.js[src] = files.js[src] || [];
            files.js[src].push(target);
        });
    }
    for (target in this._configs.less) {

        var main = (self.opts.src || '') + this._configs.less[target].main;
        files.less[main] = files.less[main] || [];
        files.less[main].push(target);
        
        this._configs.less[target].deps.forEach(function (src) {
            src = (self.opts.src || '') + src;
            files.less[src] = files.less[src] || [];
            files.less[src].push(target);
        });
    }

    watch_files(files.js, this._build_js.bind(this));
    watch_files(files.less, this._build_less.bind(this));
};

Builder.transformers = {
    replace: function (replaces) {
        return function (src) {
            return replaces.reduce(function (src, replace) {
                return src.replace(replace[0], replace[1]);
            }, src);
        };
    }
};

module.exports = Builder;