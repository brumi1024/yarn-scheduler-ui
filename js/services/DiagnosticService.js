class DiagnosticService {
    constructor(appStateModel, schedulerConfigModel, schedulerInfoModel) {
        this.appStateModel = appStateModel;
        this.schedulerConfigModel = schedulerConfigModel;
        this.schedulerInfoModel = schedulerInfoModel;
    }

    run() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download",  "diagnostic-" + Date.now() + ".json");
        document.body.appendChild(downloadAnchorNode); // Required for Firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}