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
      const response = this.useMocks
        ? await this.getMock(API_ENDPOINTS.SCHEDULER_INFO)
        : await this.makeRequestWithRetry(API_ENDPOINTS.SCHEDULER_INFO);
      const data = response.data;

      if (data.scheduler && data.scheduler.schedulerInfo) {
        const schedulerInfo = data.scheduler.schedulerInfo;

        if (schedulerInfo.type !== "capacityScheduler") {
          throw new Error(`Unsupported scheduler type: ${schedulerInfo.type}`);
        }

        queueData = parseSchedulerData(schedulerInfo);
        window.queueData = queueData; // Ensure global access

        extractPartitions(schedulerInfo);
        populatePartitionSelector();
        renderQueueTree(); // Render the queue tree for the default tab
        // showContent(true); // showContent is now handled by tab switching
      } else {
        throw new Error("Invalid scheduler data received");
      }
    } catch (error) {
      showError(`Failed to load queue configuration: ${error.message}`);
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