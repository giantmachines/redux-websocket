/* eslint no-param-reassign: "off" */

/**
 * Get keys from an array or an object
 * @param {string[]|object} keys - An array or object whose elements or keys are key values.
 * @return {string[]} An array of key values (strings).
 */
export const toKeys = keys => (Array.isArray(keys) ? keys : Object.keys(keys));

/**
 * Transform an array or an object with key values into an object with key/value
 * pairs where the values are string representations of the keys.
 *
 * @param {string[]|object} keys - An array or object whose elements or keys are key values.
 * @return {object} An object whose key/value pairs match the keys passed in.
 *
 * @example
 * const keys = ['one', 'two', 'three']
 * const mirror = keyMirror(keys)
 * // => { one: 'one', two: 'two', three: 'three' }
 *
 * @example
 * const keys = { one: null, two: null, three: null }
 * const mirror = keyMirror(keys)
 * // => { one: 'one', two: 'two', three: 'three' }
 */
export default keys =>
  toKeys(keys).reduce((obj, key) => {
    obj[key] = key;
    return obj;
  }, {});
