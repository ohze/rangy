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
