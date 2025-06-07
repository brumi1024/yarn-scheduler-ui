/**
 * @file NodesInfoModel - Manages cluster nodes information including node labels extraction
 */
class NodesInfoModel extends EventEmitter {
    constructor() {
        super();
        this._nodesInfo = null;
        this._nodeLabels = [];
    }

    /**
     * Loads cluster nodes information from API response
     * @param {Object|null} nodesData - Cluster nodes data from API
     */
    loadNodesInfo(nodesData) {
        try {
            this._nodesInfo = nodesData;
            this._extractNodeLabels();
            this._emit('nodesInfoLoaded', { success: true, data: nodesData });
        } catch (error) {
            console.error('NodesInfoModel: Error loading nodes info:', error);
            this._nodesInfo = null;
            this._nodeLabels = [];
            this._emit('nodesInfoLoaded', { success: false, error: error.message });
        }
    }

    /**
     * Extracts unique node labels from cluster nodes data
     * @private
     */
    _extractNodeLabels() {
        const nodeLabels = new Set();

        if (this._nodesInfo && this._nodesInfo.nodes && this._nodesInfo.nodes.node) {
            const nodes = Array.isArray(this._nodesInfo.nodes.node)
                ? this._nodesInfo.nodes.node
                : [this._nodesInfo.nodes.node];

            for (const node of nodes) {
                if (node.nodeLabels && Array.isArray(node.nodeLabels)) {
                    for (const label of node.nodeLabels) {
                        // TODO: Simple merge logic - YARN validates, no complex UI validation needed
                        if (label && label !== '*' && label !== '' && label !== DEFAULT_PARTITION) {
                            nodeLabels.add(label);
                        }
                    }
                }
            }
        }

        this._nodeLabels = [...nodeLabels].sort();
    }

    /**
     * Gets available node labels from cluster nodes
     * @returns {string[]} Array of unique node labels
     */
    getNodeLabels() {
        return [...this._nodeLabels];
    }

    /**
     * Gets the raw nodes info data
     * @returns {Object|null} Raw nodes info data
     */
    getNodesInfo() {
        return this._nodesInfo;
    }

    /**
     * Gets all cluster nodes
     * @returns {Object[]} Array of node objects
     */
    getNodes() {
        if (!this._nodesInfo || !this._nodesInfo.nodes || !this._nodesInfo.nodes.node) {
            return [];
        }

        return Array.isArray(this._nodesInfo.nodes.node) ? this._nodesInfo.nodes.node : [this._nodesInfo.nodes.node];
    }

    /**
     * Gets nodes filtered by state
     * @param {string|string[]} states - Node states to filter by (e.g., 'RUNNING', ['RUNNING', 'UNHEALTHY'])
     * @returns {Object[]} Array of filtered node objects
     */
    getNodesByState(states) {
        const targetStates = Array.isArray(states) ? states : [states];
        return this.getNodes().filter((node) => targetStates.includes(node.state));
    }

    /**
     * Gets nodes that have specific node labels
     * @param {string|string[]} labels - Node labels to filter by
     * @returns {Object[]} Array of nodes with the specified labels
     */
    getNodesByLabels(labels) {
        const targetLabels = Array.isArray(labels) ? labels : [labels];
        return this.getNodes().filter((node) => {
            if (!node.nodeLabels || !Array.isArray(node.nodeLabels)) {
                return false;
            }
            return targetLabels.some((label) => node.nodeLabels.includes(label));
        });
    }
}
