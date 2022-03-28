import * as vscode from 'vscode';
import * as sorter from './sorters';
import * as utilities from './utilites';


export class EditorManager {

	constructor(context: vscode.ExtensionContext) {

		const myTreeProvider = new TabTreeDataProvider();

		const view = vscode.window.createTreeView('editor-groups', { treeDataProvider: myTreeProvider, showCollapseAll: true });
		context.subscriptions.push(view);

		vscode.commands.executeCommand("workbench.view.extension.editorManager");

		view.onDidExpandElement(event => {
			// works despite ts error
			view.reveal(new Tab(event.element.group.activeTab));
			// refresh the tree so the collapsibleState is updated TODO - doesn't seem to wait to refresh
			// myTreeProvider.refresh();
			// new Group(event.element.group).collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		});

		vscode.commands.registerCommand('editor-groups.refreshTree', () => myTreeProvider.refresh());

		vscode.window.onDidChangeActiveTextEditor(event => {
			myTreeProvider.refresh();
			// const treeItem = utilities.getMatchingTreeItem(event.);
			// editorTabProvider.reveal(treeItem, {expand: true, focus: false, select: true});
		});

		vscode.workspace.onDidChangeTextDocument(event => myTreeProvider.refresh());
		// // above includes onDidSaveTextDocument, onDidRenameFiles, onDidOpenTextDocument and onDidCloseTextDocument

		vscode.window.onDidChangeTextEditorViewColumn(event => myTreeProvider.refresh());

		// vscode.commands.registerCommand('editor-groups.addEntry', async () => {
		// 	const tab = vscode.window.tabGroups.groups[0].tabs[1];
		// 	await view.reveal(new Tab(tab), { focus: true, select: true });
		// });

		// doesn't do anything if change tabGroup to focused tab in other group 
		// works but is triggering onDidExpandElement
		vscode.window.tabGroups.onDidChangeTab(async event => {
			if (view.visible) {
				// myTreeProvider.refresh();
				const treeItem = await utilities.getMatchingTreeItem(event);
				// await view.reveal(treeItem, { expand: false });
				const parentGroup = myTreeProvider.getParent(treeItem);
				// if (parentGroup.collapsibleState === vscode.TreeItemCollapsibleState.Expanded)
				await view.reveal(treeItem);
			}
		});

		// but active tab didn't change
		vscode.window.tabGroups.onDidChangeActiveTabGroup(async event => {
			if (view.visible) {

				// myTreeProvider.refresh();
				const treeItem = await utilities.getMatchingTreeItem(event.activeTab);
				const parentGroup = myTreeProvider.getParent(treeItem);
				// if (parentGroup.collapsibleState === vscode.TreeItemCollapsibleState.Expanded)
				await view.reveal(treeItem);
			}
		});
	}
}

// export class  tabTreeDataProvider(): vscode.TreeDataProvider<Tab|Group> {
// function TabTreeDataProvider():  vscode.TreeDataProvider<Tab|Group> {
// class TabTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
class TabTreeDataProvider implements vscode.TreeDataProvider<Tab | Group> {

	private _onDidChangeTreeData: vscode.EventEmitter<Tab | Group | undefined | null | void> = new vscode.EventEmitter<Dependency | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<Tab | Group | undefined | null | void> = this._onDidChangeTreeData.event;

	// private _onDidChangeTreeData = new vscode.EventEmitter<Tab | Group | undefined>();
	// readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

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

		const sorted = sorter.byLabelAlphabetically(groups[Number(key.id)]);
		return sorted.map(tab => new Tab(tab));

		// return groups[Number(key.id)].tabs.map(tab => new Tab(tab));
	}

	getParent(key: Tab): Group | undefined {
		if (key instanceof Group) return undefined;
		return new Group(key.tab.group);   // (key instanceof Tab)
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
		if (tab.kind === undefined) this.command = { command: 'workbench.action.openGlobalKeybindings', title: "" };
		// if (tab.label === "Keyboard Shortcuts") this.command = { command: 'workbench.action.openGlobalKeybindings', title: ""};

		else if (tab?.kind?.uri) this.command = {
			command: 'vscode.open', title: "",
			arguments: [tab.kind?.uri, { viewColumn: tab.group.viewColumn }]
		};
		// else if (tab?.kind?.original)

		this.tooltip = new vscode.MarkdownString(`${tab.label}`, true);

		this.iconPath = tab.isDirty ? new vscode.ThemeIcon("circle-filled", new vscode.ThemeColor("tab.activeModifiedBorder")) : undefined;
	}

	contextValue = 'tab';
}