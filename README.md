# Deplo

Mini Node.js build system for browser apps.

## Pros

- optimized for common tasks
- manual dependencies tracking of js and less files leverage amazing speed of building

## Cons

- manual dependencies tracking is cumbersome
- Yet Another Build System

## Installation

    npm install deplo

## Usage

    var deplo = require('deplo');
    var builder = new deplo();

    // global options
    builder.opts = {
        target: 'build/',
        src: 'src/',
        banner: 'banner',
        compress: false,
        less: {
            paths: []
        }
    };

    builder.js({
        target: 'js/app.js',
        deps: [
            'js/json2.js',
            'js/app.js'
        ]
    });

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
    builder.clean();
    builder.build();
    builder.watch();

## Api

### builder.use(transformer, paths)

Uses function `transformer(src) -> src` to transform the sources of files listed by `paths`.

### builder.clean([dir])

Removes all files in directory `dir`. Useful for initialize the building process. Default value for `dir` is `opts.target`.

### builder.build()

Build all.

### builder.watch()

Watch filesystem and rebuild on files changes.

## Copyright & License

Copyright (C) 2014 Giulio Canti - Released under the MIT License.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.