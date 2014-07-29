var Deplo = require('../index');
var builder = new Deplo();

// global options
builder.opts = {
  target: 'build/',
  src: 'src/',
  banner: '/* MIT License */\n',
  compress: false,
  less: {
    paths: ['./src/less']
  }
};

// build a js file
builder.js({
  target: 'js/app.js',
  deps: [
    'js/dep1.js',
    'js/app.js'
  ]
});

// build a css file
builder.less({
  target: 'css/app.css',
  main: 'less/app.less',
  images: {
    target: 'css/images',
    src: 'less/images'
  },
  deps: [
    'less/dep1.less'
  ]
});

// build a jsx file
builder.use(require('react-tools').transform, ['jsx/HelloMessage.jsx']);

builder.js({
  target: 'js/HelloMessage.js',
  deps: [
    'jsx/HelloMessage.jsx'
  ]
});

// start
builder.clean()
builder.build()
builder.watch();