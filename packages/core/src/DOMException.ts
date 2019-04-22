export function DOMException(codeName: string) {
    this.code = this[codeName];
    this.codeName = codeName;
    this.message = "DOMException: " + this.codeName;
}

DOMException.prototype = {
    INDEX_SIZE_ERR: 1,
    HIERARCHY_REQUEST_ERR: 3,
    WRONG_DOCUMENT_ERR: 4,
    NO_MODIFICATION_ALLOWED_ERR: 7,
    NOT_FOUND_ERR: 8,
    NOT_SUPPORTED_ERR: 9,
    INVALID_STATE_ERR: 11,
    INVALID_NODE_TYPE_ERR: 24,
};

//Object.assign(DOMException, DOMException.prototype);

DOMException.prototype.toString =function() {
    return this.message;
};
