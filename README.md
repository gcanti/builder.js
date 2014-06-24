# builder.js

Build system for Node.js

    var builder = new (require('./builder').Builder)();

    // global options
    builder.opts = {
        target: '../dist/',
        src: '../src/',
        banner: 'banner',
        compress: false,
        less: {
            paths: []
        }
    };

    // transformers
    builder.use(builder.transformers.ejs, ['js/templates.html']);

    builder.js({
        target: 'js/app.js',
        deps: [
            'js/jsdk.js',
            'js/templates.html',
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

### builder.use(plugin, paths)

Usa la funzione `plugin(src) -> src` per trasformare il sorgente dei file indicati da `paths`.

### builder.clean([dir])

Elimina tutti i file della directory `dir`, utile per inizializzare il processo di build.
Di default `dir` è `opts.target`.

### builder.build()

Build totale.

### builder.watch()

Monitora il filesystem per rifare un build incrementale.

