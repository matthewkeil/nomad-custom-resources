const bundle = require("./build/index");

console.log(Object.keys(bundle));

bundle.handler();
