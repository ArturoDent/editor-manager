import * as vscode from 'vscode';
import * as sorter from './sorters'


export class EditorTabProvider implements vscode.TreeDataProvider<Tab|Group> {

	private _onDidChangeTreeData: vscode.EventEmitter<Tab | undefined | void> = new vscode.EventEmitter<Tab | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Tab | undefined | void> = this._onDidChangeTreeData.event;

	constructor() {	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	};

	reveal(element: Tab, options) {}
	// 	console.log("here");
	// };

	getTreeItem(element: Tab|Group): Tab|Group  {
		return element;
	};

	getChildren(key: Group|undefined): (Tab[]|Group[]) {

		const groups =  vscode.window.tabGroups.groups;

		if (!key) {
			return groups.map(group => new Group(group));
		}
		
		const sorted = sorter.byLabelAlphabetically(groups[Number(key.id)]);
		return sorted.map(tab => new Tab(tab));

		// return groups[Number(key.id)].tabs.map(tab => new Tab(tab));
	};

	getParent(key: Tab): Group  {
		return new Group(key.tab.group);
	}

	
}

export class Group extends vscode.TreeItem {

	constructor(
		public readonly group: vscode.TabGroup
	) {
		super(`Group-${group.viewColumn}`, vscode.TreeItemCollapsibleState.Collapsed);

		this.id = String(group.viewColumn - 1);
		this.tooltip = new vscode.MarkdownString(`Group-${group.viewColumn}`, true);
	}

	contextValue = 'group';
}

export class Tab extends vscode.TreeItem {

	constructor(
		public readonly tab: vscode.Tab
	) {
		super(tab.label, vscode.TreeItemCollapsibleState.None);

		this.id = `${tab?.label}-${tab.group.viewColumn}`;

		// break into a new utility function if (tab.kind === undefined) Settings
		// how to account for the correct viewColumn? tab.group.viewColumn
		if (tab.kind === undefined) this.command = { command: 'workbench.action.openGlobalKeybindings', title: ""};
		// if (tab.label === "Keyboard Shortcuts") this.command = { command: 'workbench.action.openGlobalKeybindings', title: ""};

		else if (tab?.kind?.uri)  this.command = { command: 'vscode.open', title: "", 
																		arguments: [tab.kind?.uri, {viewColumn: tab.group.viewColumn}] };
		// else if (tab?.kind?.original)

		this.tooltip = new vscode.MarkdownString(`${tab.label}`, true);

		this.iconPath = tab.isDirty ? new vscode.ThemeIcon("circle-filled", new vscode.ThemeColor("tab.activeModifiedBorder")) : undefined;
	}

	contextValue = 'tab';
}