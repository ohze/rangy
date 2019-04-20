import "qunit";

declare global {
    interface Assert {
        notThrows(f: () => void, msg?: string): void;
        assertNull(state: any, message?: string): void;
        assertFalse(state: any, message?: string): void;
        assertTrue(state: any, message?: string): void;
    }
    interface QUnit {
        testEx(name: string,
             callback: (assert: Assert) => void,
             setUp: (assert: Assert) => void,
             tearDown: (assert: Assert) => void): void;
        skipEx(name: string,
               callback: (assert: Assert) => void,
               setUp: (assert: Assert) => void,
               tearDown: (assert: Assert) => void): void;
    }
}
