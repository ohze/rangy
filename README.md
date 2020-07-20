Rangy2
=====

A cross-browser JavaScript range and selection library based off of the abondoned project: https://github.com/timdown/rangy.



## Other improvements over [rangy](https://github.com/timdown/rangy) 1.x
+ migrated to typescript
    - type definitions stay up-to-date
+ uses typescript's module system (import / export) instead of the complex `rangy.createModule` logic
+ removed TextRange & [inactive](https://github.com/timdown/rangy/tree/master/src/modules/inactive) modules
    - if you use those modules, please migrate to rangy2 & create a pull request.
+ uses [rollup](https://rollupjs.org) instead of the
  [old complex manually with text-replacing building logic](https://github.com/timdown/rangy/blob/master/builder/build.js)
+ doesn't support outdated browsers: IE < 9
    - removed feature testing logic for outdated browsers
+ migrated testing code to [QUnit](https://qunitjs.com/)
    - doesn't use [jest](https://jestjs.io/) because we need test in Android and iOS
+ removed `rangy.init` (& `rangy.addInitListener`)
    - rangy is "initialized" even before DOM ready!
    - many bugs like [326](https://github.com/timdown/rangy/issues/326),
      [321](https://github.com/timdown/rangy/issues/321) are auto-fixed!

## Guide to migrate from rangy 1.x to rangy2
+ removed:
    - `util.extend`. Pls use [Object.assign](http://kangax.github.io/compat-table/es6/#test-Object_static_methods_Object.assign)
    - `util.toArray`. Pls use [Array.slice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice)
    - `util.`[forEach](http://kangax.github.io/compat-table/es5/#test-Array.prototype.forEach)
    - `dom.arrayContains`. Pls use [Array.includes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes)
    - `initialized, init, addInitListener`. rangy is now always initialized right when import
    - `addShimListener`
    - `createModule, createCoreModule`
    - `warn, fail, supported`
    - `RangePrototype, rangePrototype, selectionPrototype`
    - `WrappedTextRange`

+ note: to support IE, we bundled the following [core-js](https://www.npmjs.com/package/core-js) modules
  into `dist/*/bundles/index.umd.js` (not bundle into `index.esm.js` & other module types)
```javascript
import "core-js/features/array/includes";
import "core-js/features/object/assign";
```

## Install
```bash
yarn add rangy2
```

## Quick Start
```typescript
import { createRangyRange } from 'rangy2';

const range = createRangyRange();
```

## Documentation

Documentation is in [the GitHub wiki](https://github.com/timdown/rangy/wiki).

## Dev guide
```bash
yarn install
yarn run dev
```
+ test by opening test/*.html in a desktop or mobile browser
