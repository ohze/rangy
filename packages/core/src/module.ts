export class Module {
    constructor(public name, public dependencies) {}

    fail(reason) {
        console.log("Module '" + this.name + "' failed to load: " + reason);
        throw new Error(reason);
    }

    warn(msg) {
        console.log("Module " + this.name + ": " + msg);
    }

    createError(msg) {
        return new Error("Error in Rangy " + this.name + " module: " + msg);
    }
}
