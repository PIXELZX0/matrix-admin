const noopStorage: Storage = {
  clear: () => undefined,
  getItem: () => null,
  key: () => null,
  length: 0,
  removeItem: () => undefined,
  setItem: () => undefined,
};

const storage = typeof window === "undefined" ? noopStorage : window.localStorage;

export default storage;
