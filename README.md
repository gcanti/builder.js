deplo is a tiny build system aimed to be fast even on older machines.

## Pros

- simple and clean api tailored for common tasks
- manual dependency tracking of files provides amazing speed of building

## Cons

- manual dependency tracking is cumbersome
- Yet Another Build System

## Installation

    npm install deplo

## Usage

    var Deplo = require('deplo');
    var builder = new Deplo();

    // global options
    builder.opts = {
        target: 'build/',
        src: 'src/',
        banner: '/* MIT License */\n',
        compress: false,
        less: {
            paths: []
        }
    };

    // build a js file
    builder.js({
        target: 'js/app.js',
        deps: [
            'js/json2.js',
            'js/app.js'
        ]
    });

    // build a css file
    builder.less({
        target: 'css/app.css',
        main: 'less/app.less',
        paths: [],
        images: {
            target: 'css/images',
            src: 'less/images'
        },
        deps: [
            'less/dep1.less',
            'less/dep2.less'
        ]
    });

    // start
    builder.clean()
    builder.build()
    builder.watch();

## Api

### options

- target: target dir
- src: src dir
- banner: optional banner placed on top of the files
- compress: if `true` minify targets
- less.paths: optional paths needed by less compiler

### builder.use(transformer, paths)

Use function `transformer(src) -> src` to transform the sources of files listed by `paths`.

### builder.clean([dir])

Removes all files in directory `dir`. Useful for initialize the building process. Default value for `dir` is `opts.target`.

### builder.build()

Build all.

### builder.watch()

Watch filesystem and rebuild on files changes.

## Example

Run

    node examples/build.js

## Copyright & License

Copyright (C) 2014 Giulio Canti - Released under the MIT License.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.