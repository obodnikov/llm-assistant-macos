/**
 * Minimal electron-store mock for Jest tests.
 * In-memory key-value store with get/set.
 */

class Store {
  constructor() {
    this._data = {};
  }

  get(key, defaultValue) {
    return key in this._data ? this._data[key] : defaultValue;
  }

  set(key, value) {
    this._data[key] = value;
  }

  delete(key) {
    delete this._data[key];
  }

  clear() {
    this._data = {};
  }

  has(key) {
    return key in this._data;
  }
}

module.exports = Store;
