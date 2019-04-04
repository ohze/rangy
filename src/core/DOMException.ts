export class DOMException {
    code: number;
    message: string;
    constructor(public codeName) {
        this.code = this[codeName];
        this.message = "DOMException: " + this.codeName;
    }
    static INDEX_SIZE_ERR = 1;
    static HIERARCHY_REQUEST_ERR = 3;
    static WRONG_DOCUMENT_ERR = 4;
    static NO_MODIFICATION_ALLOWED_ERR = 7;
    static NOT_FOUND_ERR = 8;
    static NOT_SUPPORTED_ERR = 9;
    static INVALID_STATE_ERR = 11;
    static INVALID_NODE_TYPE_ERR = 24;

    toString() { return this.message; };
}
