import "qunit";

declare global {
    interface Assert {
        notThrows(f: () => void, msg?: string): void;
    }
}
