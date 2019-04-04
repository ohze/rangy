const OBJECT = "object", FUNCTION = "function", UNDEFINED = "undefined";

// Trio of functions taken from Peter Michaux's article:
// http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting
export function isHostMethod(o, p) {
    var t = typeof o[p];
    return t == FUNCTION || (!!(t == OBJECT && o[p])) || (t as any) == "unknown";
}

export function isHostObject(o, p) {
    return !!(typeof o[p] == OBJECT && o[p]);
}

export function isHostProperty(o, p) {
    return typeof o[p] != UNDEFINED;
}

// Creates a convenience function to save verbose repeated calls to tests functions
function createMultiplePropertyTest(testFunc) {
    return function(o, props) {
        var i = props.length;
        while (i--) {
            if (!testFunc(o, props[i])) {
                return false;
            }
        }
        return true;
    };
}

// Next trio of functions are a convenience to save verbose repeated calls to previous two functions
export var areHostMethods = createMultiplePropertyTest(isHostMethod);
export var areHostObjects = createMultiplePropertyTest(isHostObject);
export var areHostProperties = createMultiplePropertyTest(isHostProperty);

export function getBody(doc) {
    return isHostObject(doc, "body") ? doc.body : doc.getElementsByTagName("body")[0];
}

export var forEach = [].forEach ?
    function(arr, func) {
        arr.forEach(func);
    } :
    function(arr, func) {
        for (var i = 0, len = arr.length; i < len; ++i) {
            func(arr[i], i);
        }
    };

// Add utility extend() method
// TODO document about prerequires (or shim, ex using core-js):
// Object.assign,..
/** @deprecated */
export function extend(obj, props, deep?) {
    var o, p;
    for (var i in props) {
        if (props.hasOwnProperty(i)) {
            o = obj[i];
            p = props[i];
            if (deep && o !== null && typeof o == "object" && p !== null && typeof p == "object") {
                extend(o, p, true);
            }
            obj[i] = p;
        }
    }
    // Special case for toString, which does not show up in for...in loops in IE <= 8
    if (props.hasOwnProperty("toString")) {
        obj.toString = props.toString;
    }
    return obj;
}

// Don't support IE <9, so don't need test Array.prototype.slice can be relied on
// for NodeLists and use an alternative toArray() if not
export function toArray(arrayLike) {
    return [].slice.call(arrayLike, 0);
}

// Very simple event handler wrapper function that doesn't attempt to solve issues such as "this" handling or
// normalization of event properties because we don't need this.
// https://caniuse.com/#search=addEventListener
export function addListener(obj, eventType, listener) {
    obj.addEventListener(eventType, listener, false);
}

// https://mariusschulz.com/blog/typescript-2-2-mixin-classes
export type Constructor<T = {}> = new (...args: any[]) => T;
