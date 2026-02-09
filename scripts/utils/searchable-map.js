export class SearchableMap {
  constructor(object = {}) {
    this._object = object;
    this._keys = [];
    for (const key in object) this._keys.push(parseInt(key));
  }

  has(key) {
    return key in this._object;
  }

  get(key) {
    return this._object[key];
  }

  findPrevious(key) {
    return this._keys[this.lowerBound(key) - 1];
  }

  lowerBound(value, array = this._keys) {
    let left = 0; 
    let right = array.length;

    while (left < right) {
      const mid = (left + right) >> 1;

      if (array[mid] < value) left = mid + 1;
      else right = mid;
    }

    return left;
  }

  serialize() {
    return this._object;
  }
}