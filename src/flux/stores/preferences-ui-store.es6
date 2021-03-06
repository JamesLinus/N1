import {ipcRenderer} from 'electron';
import _ from 'underscore'
import NylasStore from 'nylas-store'
import WorkspaceStore from './workspace-store'
import FocusedPerspectiveStore from './focused-perspective-store'
import Actions from '../actions'
import Immutable from 'immutable'

const MAIN_TAB_ITEM_ID = 'General'

class TabItem {
  constructor(opts = {}) {
    opts.order = opts.order || Infinity;
    _.extend(this, opts);
  }
}

class PreferencesUIStore extends NylasStore {
  constructor() {
    super();

    const perspective = FocusedPerspectiveStore.current()

    this._tabs = Immutable.List();
    this._selection = Immutable.Map({
      tabId: null,
      accountId: perspective.account ? perspective.account.id : null,
    })

    this._triggerDebounced = _.debounce(() => this.trigger(), 20)
    this.setupListeners()
  }

  setupListeners() {
    this.listenTo(Actions.openPreferences, this.openPreferences);
    ipcRenderer.on('open-preferences', this.openPreferences);

    this.listenTo(Actions.switchPreferencesTab, this.switchPreferencesTab);

    NylasEnv.commands.add(document.body, 'core:show-keybindings', () => {
      this.openPreferences();
      this.switchPreferencesTab('Shortcuts');
    });
  }

  tabs = () => {
    return this._tabs;
  }

  selection = () => {
    return this._selection;
  }

  openPreferences = () => {
    ipcRenderer.send('command', 'application:show-main-window');
    if (WorkspaceStore.topSheet() !== WorkspaceStore.Sheet.Preferences) {
      Actions.pushSheet(WorkspaceStore.Sheet.Preferences);
    }
  }

  switchPreferencesTab = (tabId, options = {}) => {
    this._selection = this._selection.set('tabId', tabId);
    if (options.accountId) {
      this._selection = this._selection.set('accountId', options.accountId);
    }
    this.trigger();
  }

  /*
  Public: Register a new top-level section to preferences

  - `tabItem` a `PreferencesUIStore.TabItem` object
    schema definitions on the PreferencesUIStore.Section.MySectionId
    - `tabId` A unique name to access the Section by
    - `displayName` The display name. This may go through i18n.
    - `component` The Preference section's React Component.

  Most Preference sections include an area where a {PreferencesForm} is
  rendered. This is a type of {GeneratedForm} that uses the schema passed
  into {PreferencesUIStore::registerPreferences}

  */
  registerPreferencesTab = (tabItem) => {
    this._tabs = this._tabs.push(tabItem).sort((a, b) =>
      a.order > b.order
    )
    if (tabItem.tabId === MAIN_TAB_ITEM_ID) {
      this._selection = this._selection.set('tabId', tabItem.tabId);
    }
    this._triggerDebounced();
  }

  unregisterPreferencesTab = (tabItemOrId) => {
    this._tabs = this._tabs.filter(s => (s.tabId !== tabItemOrId) && (s !== tabItemOrId));
    this._triggerDebounced();
  }
}

const Store = new PreferencesUIStore();
Store.TabItem = TabItem;
export default Store;
