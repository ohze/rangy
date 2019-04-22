export {
    // from ./domrange
    RangeBase,
    RangyRange,
    RangyRangeEx,
    rangesEqual,
    getRangeDocument,
    createPrototypeRange,
    DomRange,
    createRangyRange,
    // from ./wrappedrange
    WrappedRange,
    createNativeRange,
    createRange,
    // /** @deprecated */
    // createRange as createIframeRange,
    shimCreateRange,
    // from ./wrappedselection
    getNativeSelection,
    isSelectionValid,
    getSelection,
    // /** @deprecated */
    // getSelection as getIframeSelection,
    WrappedSelection,
    WrappedSelection as Selection, //alias
    RangeIterator,
    shimGetSelection
} from "./_";
