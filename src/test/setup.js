import "@testing-library/jest-dom/vitest";

class IntersectionObserverMock {
    constructor(callback) {
        this.callback = callback;
    }
    observe(element) {
        this.callback([{isIntersecting: true, target: element}], this);
    }
    unobserve() {}
    disconnect() {}
}

globalThis.IntersectionObserver ??= IntersectionObserverMock;
