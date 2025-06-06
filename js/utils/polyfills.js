/**
 * Polyfills for browser compatibility
 */

// String.prototype.replaceAll polyfill
if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function(search, replace) {
        return this.split(search).join(replace);
    };
}