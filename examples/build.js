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

// start
builder.clean()
builder.build()
builder.watch();