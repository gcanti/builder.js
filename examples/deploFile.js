var app = require('../index')({
  target_dir: 'build/' // required by clean()
});

//
// plugins and transformers
//

var js = app.plugins.js;
var less = app.plugins.less;
var copy = app.plugins.copy;
var jsx = require('react-tools').transform;

//
// configure
//

app.use(js({
  target_dir: 'build/%env/js/',
  src_dir: 'src/js/',
  banner: '/* MIT License */\n',
  // hash env -> bool
  compress: {
    development: false,            
    production: true 
  },
  transformers: {
    'HelloMessage.jsx': [jsx]
  }
}));

app.use(less({
  target_dir: 'build/%env/css/',
  src_dir: 'src/less/',
  banner: '/* MIT License */\n',
  // optional paths required by less parser
  paths: ['src/less/'],
  // hash env -> bool
  compress: {               
    development: true,            
    production: true
  }
}));

app.use(copy());

//
// apps
//

// app1
app.js('app1.js', [
    'dep1.js',
    'app1.js'
]);

// app2
app.js('app2.js', [
    'HelloMessage.jsx', // jsx
    'dep1.js',
    'app2.js'
]);

// less
app.less('app.css', {
  main: 'app.less',
  images: {
    target_dir: 'images',
    src_dir: 'images'
  },
  deps: [
    'dep1.less'
  ]
});

// copy
app.copy('build/%env/images', 'src/images');

app.build('development', function (err) {
  if (err) throw err;
  app.watch();
});
