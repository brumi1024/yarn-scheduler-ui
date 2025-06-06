class TabView extends EventEmitter {
    constructor(appStateModel) {
        super();
        this.appStateModel = appStateModel; // To listen for currentTab changes

        this.navTabs = DomUtils.qsa('.nav-tab');
        this.tabPanes = DomUtils.qsa('.tab-pane');
        this.diagnosticButton = DomUtils.getById('diagnostic-button');

        // Contextual control containers
        this.queueConfigControls = DomUtils.getById('queue-config-controls');
        this.schedulerConfigControls = DomUtils.qs('#scheduler-config-content > .controls'); // Specific to scheduler config tab
        this.placementRulesControls = DomUtils.qs('#placement-rules-content > .controls');
        this.nodeLabelsControls = DomUtils.qs('#node-labels-content > .controls');

        this._bindNavTabClicks();
        this.appStateModel.subscribe('currentTabChanged', this.render.bind(this));
    }

    _bindNavTabClicks() {
        for (const tab of this.navTabs) {
            tab.addEventListener('click', (event) => {
                const targetTabId = event.currentTarget.dataset.tab;
                if (targetTabId) {
                    // Emit event for controller to update AppStateModel,
                    // which will then trigger this.render() via subscription.
                    this._emit('tabClicked', targetTabId);
                }
            });
        }
        this.diagnosticButton.addEventListener('click', (event) => {
            this._emit('diagnostic')
        })
    }

    /**
     * Renders the active tab based on AppStateModel.
     */
    render() {
        const activeTabId = this.appStateModel.getCurrentTab();

        for (const tab of this.navTabs) {
            tab.classList.toggle('active', tab.dataset.tab === activeTabId);
        }

        for (const pane of this.tabPanes) {
            const paneIsActive = pane.id === activeTabId;
            pane.classList.toggle('active', paneIsActive);
            DomUtils.show(pane, paneIsActive ? 'block' : 'none');
        }
        this._updateContextualControls(activeTabId);
    }

    _updateContextualControls(activeTabId) {
        // Hide all contextual control bars by default
        if (this.queueConfigControls) DomUtils.hide(this.queueConfigControls);
        if (this.schedulerConfigControls) DomUtils.hide(this.schedulerConfigControls);
        if (this.placementRulesControls) DomUtils.hide(this.placementRulesControls);
        if (this.nodeLabelsControls) DomUtils.hide(this.nodeLabelsControls);

        // Show the relevant one
        switch (activeTabId) {
            case 'queue-config-content': {
                if (this.queueConfigControls) DomUtils.show(this.queueConfigControls, 'flex');
                break;
            }
            case 'scheduler-config-content': {
                if (this.schedulerConfigControls) DomUtils.show(this.schedulerConfigControls, 'flex');
                break;
            }
            case 'placement-rules-content': {
                if (this.placementRulesControls) DomUtils.show(this.placementRulesControls, 'flex');
                break;
            }
            case 'node-labels-content': {
                if (this.nodeLabelsControls) DomUtils.show(this.nodeLabelsControls, 'flex');
                break;
            }
        }
    }
}
