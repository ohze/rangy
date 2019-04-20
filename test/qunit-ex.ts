QUnit.assert.notThrows = function(f: () => void, msg?: string) {
    let e;
    try {
        f()
    } catch (err) {
        e = err;
    }
    const result = typeof e === 'undefined';
    const desc = result || (typeof e.stack === 'undefined')? '' : e.stack;
    this.pushResult({
        result,
        message: msg + desc
    });
};
QUnit.assert.assertNull = function(state: any, message?: string): void {
    this.strictEqual(state, null, message);
};
QUnit.assert.assertFalse = function(state: any, message?: string): void {
    this.strictEqual(state, false, message);
};
QUnit.assert.assertTrue = function(state: any, message?: string): void {
    this.strictEqual(state, true, message);
};

QUnit.testEx = (name: string,
                callback: (assert: Assert) => void,
                setUp: (assert: Assert) => void,
                tearDown: (assert: Assert) => void) => {
    QUnit.test(name, t => {
        setUp(t);
        callback(t);
        tearDown(t);
    });
};

QUnit.skipEx = (name: string,
                callback: (assert: Assert) => void,
                setUp: (assert: Assert) => void,
                tearDown: (assert: Assert) => void) => {
    QUnit.skip(name, t => {
        setUp(t);
        callback(t);
        tearDown(t);
    });
};
