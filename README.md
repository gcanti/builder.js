# Deplo

Mini build system for Node.js

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

### builder.use(transformer, paths)

Usa la funzione `transformer(src) -> src` per trasformare il sorgente dei file indicati da `paths`.

### builder.clean([dir])

Elimina tutti i file della directory `dir`, utile per inizializzare il processo di build.
Di default `dir` è `opts.target`.

### builder.build()

Build totale.

### builder.watch()

Monitora il filesystem per rifare un build incrementale.

# Copyright & License

Copyright (C) 2014 Giulio Canti - Released under the MIT License.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.