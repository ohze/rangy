Rangy2
=====

A cross-browser JavaScript range and selection library.

## Compare to [rangy](https://github.com/timdown/rangy) 1.x
+ migrated to typescript
    - so, the definition types is always updated
+ use typescript's module (import / export) instead of the complex `rangy.createModule` logic
+ remove TextRange & [inactive](https://github.com/timdown/rangy/tree/master/src/modules/inactive) modules
    - if you use those modules, please migrate to rangy2 & create a pull request.
+ use [rollup](https://rollupjs.org) instead of the
  [old complex manually with text-replacing building logic](https://github.com/timdown/rangy/blob/master/builder/build.js)
+ don't support too-outdated browser: IE < 9
    - removed many outdated feature testing logic (for too-outdated browser)
+ migrated testing code to [QUnit](https://qunitjs.com/)
    - dont use [jest](https://jestjs.io/) because we need test in android/ ios
+ remove `rangy.init` (& `rangy.addInitListener`)
    - rangy is "initialized" even before DOM ready!
    - So, many bugs like [326](https://github.com/timdown/rangy/issues/326),
      [321](https://github.com/timdown/rangy/issues/321) is auto-fixed!

## Guide to migrate from rangy 1.x to rangy2
+ removed `rangy.util.{extend, toArray, `[forEach](http://kangax.github.io/compat-table/es5/#test-Array.prototype.forEach)`}`
+ if you want support IE, please shim [Object.assign](http://kangax.github.io/compat-table/es6/#test-Object_static_methods_Object.assign)
  ex, shim with [core-js](https://www.npmjs.com/package/core-js)

## Install
```bash
yarn add rangy2
```

## Documentation

Documentation is in [the GitHub wiki](https://github.com/timdown/rangy/wiki). 

## Dev guide
```bash
yarn install
yarn run dev
```
+ test by opening test/*.html in a desktop or mobile browser
