const _data = new Map()
const ADD = "ADD"
const DELETE = "DELETE"
const UPDATE = "UPDATE"

function safeGet(key, map) {
    if (!_data.has(key)) {
        throw new Error(`Missing config for path: ${key}`);
    }
    return _data.get(key)
}

function crtElement(op, change) {
    return {op: op, change: change}
}

function iter(op) {
    return Array.from(_data.entries()).filter(e => e[1].op === op)
}

window.pendingChanges = {
    doAdd: (path, change) => _data.set(path, crtElement(ADD, change)),
    doDelete: path => _data.set(path, crtElement(DELETE)),
    doUpdate: (path, change) => _data.set(path, crtElement(UPDATE, change)),
    delete: path => _data.delete(path),
    safeGet: (path, op) => get(path).change === op,
    get: (path) => _data.get(path)?.change, //TODO: replace with projection
    checkState: path => _data.get(path)?.op ,
    size: () => _data.size,
    count: (op) => iter(op).length,
    clear: () => _data.clear(),
    iter: iter
}

