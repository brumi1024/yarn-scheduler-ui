const _changes = new Map()
const _queues = new Map()
const _conf = new Map()

const ADD = "ADD"
const DELETE = "DELETE"
const UPDATE = "UPDATE"

function crtElement(op, change) {
    return {op: op, change: change}
}

function iter(op) {
    return Array.from(_changes.entries()).filter(e => e[1].op === op)
}

function updateConf(conf) {
    _conf.clear()
    Object.values(conf.property).forEach(
        v => _conf.set(v.name.replace("yarn.scheduler.capacity.", ""), v.value))
}
function updateQueues(queues) {
    _queues.clear()
    _updateQueues(queues)
}

function _updateQueues(queues) {
    if (!queues) return
    _queues.set(queues.queuePath, queues)
    queues.queues?.queue?.forEach(_updateQueues)
}

function detectMode(value) {
    if (!isNaN(Number(value))) {
        return CAPACITY_MODES.PERCENTAGE
    }
    if (String(value).endsWith("w")) {
        return CAPACITY_MODES.WEIGHT
    }
    if (String(value).startsWith("[")) {
        return CAPACITY_MODES.ABSOLUTE
    }
    return CAPACITY_MODES.VECTOR //TODO
}

function display(mode, value) {
    if (mode === CAPACITY_MODES.PERCENTAGE) {
        return value + "%"
    }
    if (mode === CAPACITY_MODES.WEIGHT) {
        return value + "w"
    }
    return value.slice(1,-1).split(",").map(v => v.split("="))
}

function allQueue() {
    const allPath = []
    for (const [key, _] of _queues.entries()) {
        allPath.push(key)
    }
    for (const [key, _] of _changes.entries()) {
        allPath.push(key)
    }
    return allPath.map(getQueue)
}

function getQueue(path) {
    let queue = _queues.get(path)
    if (!queue) {
        queue = _changes.get(queue)
    }
    if (!queue) {
        throw new Error("Queue not found: " + path)
    }

    const capacity = _conf.get(path + ".capacity")
    if (capacity) {
        queue.capacity = capacity
    }

    const maxCapacity = _conf.get(path + ".maximum-capacity")
    if (maxCapacity) {
        queue.maxCapacity = maxCapacity
    }

    const change = _changes.get(queue)
    queue.changeStatus = change ? change.op : "UNCHANGED"

    if (change && change.capacity) {
        queue.capacity = change.capacity
    }

    if (change && change.maxCapacity) {
        queue.maxCapacity = change.maxCapacity
    }

    const capacityMode = detectMode(queue.capacity);
    queue.capacityMode = capacityMode
    queue.capacityDisplay = display(capacityMode, queue.capacity)

    const maxCapacityMode = detectMode(queue.maxCapacity);
    queue.maxCapacityMode = maxCapacityMode
    queue.maxCapacityDisplay = display(maxCapacityMode, queue.maxCapacity)

    queue.level = path.split(".").length - 1

    return queue
}

window.queueStateStore = {
    updateConf: updateConf,
    updateQueues: updateQueues,

    doAdd: (path, change) => _changes.set(path, crtElement(ADD, change)),
    doDelete: path => _changes.set(path, crtElement(DELETE)),
    doUpdate: (path, change) => _changes.set(path, crtElement(UPDATE, change)),
    deleteChange: path => _changes.delete(path),

    isStateAdd: path => _changes.get(path)?.op === ADD,
    isStateDelete: path => _changes.get(path)?.op === DELETE,
    isStateUpdate: path => _changes.get(path)?.op === UPDATE,

    countAdd: () => iter(ADD).length,
    countDelete: () => iter(DELETE).length,
    countUpdate: () => iter(UPDATE).length,

    size: () => _changes.size,
    clear: () => _changes.clear(),

    allQueue: allQueue,
    getQueue: getQueue
}
