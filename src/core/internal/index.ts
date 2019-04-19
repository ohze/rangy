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
    shimCreateRange,
    // from ./wrappedselection
    getNativeSelection,
    isSelectionValid,
    getSelection,
    WrappedSelection,
    WrappedSelection as Selection, //alias
    RangeIterator,
    shimGetSelection
} from "./_";
