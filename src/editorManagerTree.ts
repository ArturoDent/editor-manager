import exp = require('constants');
import * as vscode from 'vscode';
import * as sorter from './sorters';
import * as utilities from './utilites';


export class EditorManager {

	constructor(context: vscode.ExtensionContext) {

		const myTreeProvider = new TabTreeDataProvider();
		const groupState = new GroupExpansionStateManager();

		const view = vscode.window.createTreeView('editor-groups', 
					{ treeDataProvider: myTreeProvider, showCollapseAll: true, canSelectMany: true });
		context.subscriptions.push(view);

		// fires after onDidExpandElement
		view.onDidChangeSelection(event => {

			// this will also be called as a result of onDidExpandElement : reveal
			// but it is necessary! onDidChangeSelection doesn't fire when open already focused group
			// because that is not a change in selection!!
			if (event.selection[0] instanceof Tab) {
				view.reveal(event.selection[0]);

				const thisTab = event.selection[0].tab as vscode.Tab;
				const tabIndex = event.selection[0].tab.group.tabs.findIndex(tab => tab === thisTab);
				vscode.commands.executeCommand('editor-manager.focusTab', 
					[ event.selection[0].tab.group.viewColumn, tabIndex ]);
			}
		});

		// Not used: view.onDidChangeVisibility

		// fires before onDidChangeSelection
		view.onDidExpandElement(event => {
			if (event.element instanceof Group) groupState.setIsExpanded(event.element.group.viewColumn, true);
			// need below - else onDidChangeSelection does not always fire
			if (event.element instanceof Group) view.reveal(new Tab(event.element.group.activeTab));
			// find a way to make below work
			// if (event.element instanceof Group) view.reveal(event.element.group.activeTab);
		});

		view.onDidCollapseElement(event => {
			if (event.element instanceof Group) groupState.setIsExpanded(event.element.group.viewColumn, false);
		});

		// for menu view/title button command
		vscode.commands.registerCommand('editor-groups.refreshTree', () => myTreeProvider.refresh());

		vscode.workspace.onDidChangeTextDocument(event => {
			if (view.visible) myTreeProvider.refresh();
		});
		// above includes onDidSaveTextDocument, onDidRenameFiles, onDidOpenTextDocument and onDidCloseTextDocument

		vscode.window.onDidChangeTextEditorViewColumn(event => {
			if (view.visible) myTreeProvider.refresh();
		});

		// *** beware, can close a tab without changing editor group focus

		// vscode.commands.registerCommand('editor-groups.addEntry', async () => {
		// });

		// change active tab within group <== fires once
		// delete a tab; <== fires once

		// add a tab by double clicking on its explorer name; <== fires two or three times
		// add a tab by single clicking on its explorer name; <== fires two times
		// split an editor: this runs twice and so does onDidChangeTabGroups

		// drop a file from the Explorer into the active group <== fires two times

		// fires before onDidChangeTabGroups
		vscode.window.tabGroups.onDidChangeTabs(async tabs => {
			console.log(tabs);
			if (view.visible && groupState.getIsExpanded(tabs[0].group.viewColumn)) {
				const treeItem = await utilities.getMatchingTreeItem(tabs[0]);
				await view.reveal(treeItem);
			}
		});

		// with just one group, split an editor: this runs 3 times and onDidChangeTabs runs 2 times and this runs again
		// close last editor in group, this runs 3 times
		// on close last editor in group (and group closes), fires twice
		vscode.window.tabGroups.onDidChangeTabGroups(async groups => {
			console.log(groups);
			if (view.visible && groupState.getIsExpanded(groups[0].viewColumn)) {
				const treeItem = await utilities.getMatchingTreeItem(groups[0].activeTab);
				await view.reveal(treeItem);
			}
		});
	}
}

class TabTreeDataProvider implements vscode.TreeDataProvider<Tab | Group> {

	private _onDidChangeTreeData: vscode.EventEmitter<Tab | Group | undefined | null | void> = new vscode.EventEmitter<Tab | Group | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<Tab | Group | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Tab | Group): Tab | Group {
		return element;
	}

	getChildren(key: Group | undefined): (Tab[] | Group[]) {

		const groups = vscode.window.tabGroups.groups;

		if (!key) {
			return groups.map(group => new Group(group));
		}

		// works well, sorted and pins go first
		// const sorted = sorter.byLabelAlphabetically(groups[Number(key.id)]);
		// return sorted.map(tab => new Tab(tab));

		// still need  to put pinned tabs first even if unsorted
		const pinsFirst = sorter.putPinnedTabsFirst(groups[Number(key.id)]);
		// return groups[Number(key.id)].tabs.map(tab => new Tab(tab));  // no pinsFirst
		return pinsFirst.map(tab => new Tab(tab));
	}

	getParent(key: Tab): Group | undefined {
		if (key instanceof Group) return undefined;
		return new Group(key.tab.group);   // (key instanceof Tab)
	}
}

// should rename: TreeGroup
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

// should rename: TreeTab
export class Tab extends vscode.TreeItem {

	constructor(
		public readonly tab: vscode.Tab
	) {
		super(tab.label, vscode.TreeItemCollapsibleState.None);

		// id's must be unique within whole tree
		this.id = `${tab?.label}-${tab.group.viewColumn}`;

		this.tooltip = new vscode.MarkdownString(`${tab.label}`, true);

		if (tab.isPinned && tab.isDirty) this.iconPath = new vscode.ThemeIcon("pinned-dirty", new vscode.ThemeColor("tab.activeModifiedBorder"));
		else if (tab.isPinned) this.iconPath = new vscode.ThemeIcon("pinned", new vscode.ThemeColor("tab.activeModifiedBorder"));
		else if (tab.isDirty) new vscode.ThemeIcon("close-dirty", new vscode.ThemeColor("tab.activeModifiedBorder"));
	}
	contextValue = 'tab';
}

export class GroupExpansionStateManager {

	private isExpanded: boolean[] = [];

	setIsExpanded(groupColumn: number, expansionState: boolean): void {
		this.isExpanded[groupColumn] = expansionState;
	};

	getIsExpanded(groupColumn: number): boolean {
		return this.isExpanded[groupColumn];
	};

	// TODO: implement
	removeGroup(groupColumn: number): void {
		return;
	};

	// TODO: implement
	addGroup(groupColumn: number, expansionState: boolean): void {
		return;
	};
}