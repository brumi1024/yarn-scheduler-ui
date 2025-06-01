// API Helper Functions
const API_ENDPOINTS = {
  SCHEDULER_CONF: "/ws/v1/cluster/scheduler-conf",
  CLUSTER_INFO: "/ws/v1/cluster/info",
  SCHEDULER_INFO: "/ws/v1/cluster/scheduler",
};

class YarnSchedulerAPI {
  constructor(baseUrl = "", useMocks = false) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    this.defaultOptions = {
      headers: this.defaultHeaders,
      method: "GET",
      body: null,
    };
    this.useMocks = useMocks;
  }

  addUserParam(url) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}user.name=${encodeURIComponent(
      CONFIG.USER_NAME
    )}`;
  }

  async makeRequest(endpoint, options = {}) {
    const url = this.addUserParam(`${this.baseUrl}${endpoint}`);

    try {
      const requestOptions = {
        ...this.defaultOptions,
        ...options,
      };
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorData || response.statusText}`
        );
      }

      let data;
      // YARN will return a string with the wrong content type (JSON) in case of a successful update
      let text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }

      return { status: response.status, data: data };
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getMock(url) {
    let resp = await fetch("./mock" + url + ".json"); // Ensure path is correct if mocks are in a subfolder
    let json = await resp.json();
    return { data: json };
  }

  async makeRequestWithRetry(
    endpoint,
    options = {},
    maxRetries = 3,
    timeout = 10000
  ) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await this.makeRequest(endpoint, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        console.warn(`Attempt ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          throw new Error(
            `Request failed after ${maxRetries} attempts: ${error.message}`
          );
        }

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  async makeConfigurationUpdateApiCall({
    deletions = [],
    additions = [],
    updates = [],
    globalUpdates = [],
  }) {
    const xmlBody = this.buildBatchMutationXML({
      deletions,
      additions,
      updates,
      globalUpdates,
    });
    const options = {
      headers: {
        "Content-Type": "application/xml",
        Accept: "application/xml",
      },
      method: "PUT",
      body: xmlBody,
    };
    const response = await this.makeRequest(
      API_ENDPOINTS.SCHEDULER_CONF,
      options
    );

    return response;
  }

  // Get the scheduler configuration for queue hierarchy
  async loadSchedulerConfiguration() {
    showLoading("Loading queue configuration...");
    try {
      // 1. Fetch SCHEDULER_CONF data
      const confResponse = await this.getSchedulerConf(); // This method already exists and fetches from SCHEDULER_CONF
      const schedulerConfProperties = confResponse.property || [];

      // 2. Instantiate and populate the Trie
      schedulerTrie = new SchedulerConfigTrie();
      schedulerConfProperties.forEach((prop) => {
        schedulerTrie.insertProperty(prop.name, prop.value);
      });

      // 3. Generate window.queueData from the Trie
      if (
        typeof queueStateStore !== "undefined" &&
        typeof queueStateStore.setSchedulerTrie === "function"
      ) {
        queueStateStore.setSchedulerTrie(schedulerTrie);
      } else {
        console.error(
          "queueStateStore or queueStateStore.setSchedulerTrie is not available!"
        );
      }
      // 4. Store global settings (can also be accessed via schedulerTrie.globalProperties)
      // The global variable 'globalSchedulerSettings' in main.js should be updated here.
      // For directness, other modules can access schedulerTrie.globalProperties if the trie instance is global,
      // or we update main.js's globalSchedulerSettings.
      if (
        window.main &&
        typeof window.main.setGlobalSchedulerSettings === "function"
      ) {
        window.main.setGlobalSchedulerSettings(schedulerTrie.globalProperties); // Or create such a setter
      } else {
        // Fallback: directly set a global if main.js's variable is accessible or handle as per your app structure
        window.globalSchedulerSettings = schedulerTrie.globalProperties;
      }

      // 5. Fetch and Store SCHEDULER_INFO for the Info Modal
      // (No change to fetching, just where it's primarily used)
      const infoResponse = this.useMocks
        ? await this.getMock(API_ENDPOINTS.SCHEDULER_INFO)
        : await this.makeRequestWithRetry(API_ENDPOINTS.SCHEDULER_INFO);

      window.rawSchedulerInfo = infoResponse.data; // Store for Info Modal

      // 6. Update UI (existing calls)
      // The original queue-parser.js is no longer the primary source for window.queueData hierarchy.
      // extractPartitions and populatePartitionSelector likely used SCHEDULER_INFO,
      // they might need to be adapted or use window.rawSchedulerInfo if partitions are not in SCHEDULER_CONF.
      // For now, assuming they might still work or will be adapted in Phase 2.
      if (
        typeof extractPartitions === "function" &&
        window.rawSchedulerInfo &&
        window.rawSchedulerInfo.scheduler &&
        window.rawSchedulerInfo.scheduler.schedulerInfo
      ) {
        extractPartitions(window.rawSchedulerInfo.scheduler.schedulerInfo);
      }
      if (typeof populatePartitionSelector === "function") {
        populatePartitionSelector();
      }
      if (typeof renderQueueTree === "function") {
        renderQueueTree(); // Render the queue tree based on new Trie-derived window.queueData
      }
      // showContent(true); // Managed by tab switcher

      // 7. Cleanup calls to old queueStateStore population for conf and hierarchy
      // queueStateStore.updateConf(...) is replaced by Trie
      // queueStateStore.updateQueues(...) is replaced by Trie-derived window.queueData
      // The queueStateStore will still be used for pending changes (_changes map).
    } catch (error) {
      console.error("Error in loadSchedulerConfiguration:", error); // Log the error
      showError(`Failed to load queue configuration: ${error.message}`);
    } finally {
      // hideLoading(); // hideLoading is usually called by switchTab or the function that calls this.
    }
  }

  // Get the raw scheduler configuration properties
  async getSchedulerConf() {
    // showLoading("Loading global scheduler settings..."); // Loading message handled by calling function
    try {
      const response = this.useMocks
        ? await this.getMock(API_ENDPOINTS.SCHEDULER_CONF)
        : await this.makeRequestWithRetry(API_ENDPOINTS.SCHEDULER_CONF);
      return response.data;
    } catch (error) {
      showError(`Failed to load scheduler-conf: ${error.message}`);
      throw error; // Re-throw to be caught by caller
    }
  }

  buildBatchMutationXML({
    deletions = [],
    additions = [],
    updates = [],
    globalUpdates = [],
  }) {
    const xmlParts = ["<sched-conf>"];

    // Helper function to build parameter entries
    const buildParams = (params) => {
      if (!params || Object.keys(params).length === 0) {
        return "";
      }

      const entries = Object.entries(params)
        .map(
          ([key, value]) => `
                        <entry>
                            <key>${escapeXml(key)}</key>
                            <value>${escapeXml(value)}</value>
                        </entry>`
        )
        .join("");
      return `<params>${entries}</params>`;
    };

    // Helper function to escape XML special characters
    const escapeXml = (str) => {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

    // Remove queues
    deletions.forEach((queueName) => {
      xmlParts.push(`
                    <remove-queue>${escapeXml(queueName)}</remove-queue>`);
    });

    // Add queues
    additions.forEach((newQueue) => {
      const params = buildParams(newQueue.params);
      xmlParts.push(`
                    <add-queue>
                        <queue-name>${escapeXml(
                          newQueue.queueName
                        )}</queue-name>
                        ${params}
                    </add-queue>`);
    });

    // Update queues
    updates.forEach((update) => {
      const params = buildParams(update.params);
      xmlParts.push(`
                    <update-queue>
                        <queue-name>${escapeXml(
                          update.queueName
                        )}</queue-name>${params}
                    </update-queue>`);
    });

    // Update global scheduler settings
    globalUpdates.forEach((globalUpdate) => {
      const params = buildParams(globalUpdate.params);
      xmlParts.push(`
                    <global-updates>
                        ${params}
                    </global-updates>`);
    });

    xmlParts.push("\n</sched-conf>");
    return xmlParts.join("");
  }
}
