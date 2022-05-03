import * as vscode from 'vscode';
import { TabTreeDragDropController } from './dragAnddropController'; 
import * as sorter from './sorters';
import * as utilities from './utilites';

type treeNodes = TreeTab | TreeGroup;

export class EditorManager {

	constructor(context: vscode.ExtensionContext) {

		const myTreeProvider: TabTreeDataProvider = new TabTreeDataProvider();
		const groupState: GroupExpansionStateManager = new GroupExpansionStateManager();
		const myTreeDragController = new TabTreeDragDropController(context);
		const tabView = vscode.window.createTreeView('editor-groups', { treeDataProvider: myTreeProvider, showCollapseAll: true, canSelectMany: true, 
																																		dragAndDropController: myTreeDragController });
		context.subscriptions.push(tabView);

		// let changeTabGroups: vscode.Disposable;
		// let changeTabs: vscode.Disposable;
		// let changeViewSelection: vscode.Disposable;

		// async function enableTabAndViewWatchers()  {
		// // cannot use let or const here because refer to variables before they are declared
		// 	changeTabGroups = await this.enableDidChangeTabGroups(tabView, groupState, myTreeProvider, changeTabs, changeViewSelection, context);
		// 	changeTabs = await this.enableDidChangeTabs(tabView, groupState, myTreeProvider, changeTabGroups, changeViewSelection, context);
		// 	var changeViewSelection = await this.enableViewSelection(tabView, groupState, myTreeProvider, changeTabs, changeTabGroups, context);	
		// };

		this.enableTabAndViewWatchers(tabView, groupState, myTreeProvider, context);

		// async function disableTabAndViewWatchers()  {
		// 	EditorManager.disposeEventWatcher(this.changeTabGroups);
		// 	EditorManager.disposeEventWatcher(this.changeTabs);
		// 	EditorManager.disposeEventWatcher(this.changeViewSelection);
		// };

		// fires before onDidChangeSelection
		// event.element can only be a TreeGroup at this time
		// can we dispose/re-enable something here?
		const viewExpand = tabView.onDidExpandElement(async event => {
			if (event.element instanceof TreeGroup) groupState.setIsExpanded(event.element.group.viewColumn, true);
			// need below - else onDidChangeSelection does not always fire
			if (event.element instanceof TreeGroup && event.element.group.isActive) {
				try {
					await tabView.reveal(new TreeTab(event.element.group.activeTab));
				} catch {
					console.log("tabView catch onDidExpandElement group active");
				}
				// await tabView.reveal(new TreeTab(event.element.group.activeTab));
			}
			// need below because the Group treeItem is focused on expansion even if not the activeGroup 
			else if (event.element instanceof TreeGroup && !event.element.group.isActive) {
				const activeGroup = vscode.window.tabGroups.activeTabGroup;
				if (groupState.getIsExpanded(activeGroup.viewColumn)) {
					try {
						await tabView.reveal(new TreeTab(event.element.group.activeTab));
					} catch {
						// noop
						console.log("tabView catch onDidExpandElement group  not active");
					}
					// await tabView.reveal(new TreeTab(activeGroup.activeTab));
				}
			}
		});
		context.subscriptions.push(viewExpand);


		const viewCollapse = tabView.onDidCollapseElement(event => {
			if (event.element instanceof TreeGroup) groupState.setIsExpanded(event.element.group.viewColumn, false);
		});
		context.subscriptions.push(viewCollapse);


		// for menu view/title button command
		const refreshCommand = vscode.commands.registerCommand('editor-groups.refreshTree', () => {
			myTreeProvider.refresh()
		});
		context.subscriptions.push(refreshCommand);

		const deleteEntry = vscode.commands.registerCommand('editor-groups.deleteEntry', () => {
			myTreeProvider.refresh()
		});
		context.subscriptions.push(deleteEntry);
	}

	changeTabGroups: vscode.Disposable;
	changeTabs: vscode.Disposable;
	changeViewSelection: vscode.Disposable;

	public async enableTabAndViewWatchers(tabView:  vscode.TreeView<treeNodes>, groupState: GroupExpansionStateManager, 
		                                    myTreeProvider: TabTreeDataProvider, context: vscode.ExtensionContext)  {
	// cannot use let or const here because refer to variables before they are declared
		this.changeTabGroups = await this.enableDidChangeTabGroups(tabView, groupState, myTreeProvider, this.changeTabs, this.changeViewSelection, context);
		this.changeTabs = await this.enableDidChangeTabs(tabView, groupState, myTreeProvider, this.changeTabGroups, this.changeViewSelection, context);
		this.changeViewSelection = await this.enableViewSelection(tabView, groupState, myTreeProvider, this.changeTabs, this.changeTabGroups, context);	
	};

	public async disableTabAndViewWatchers()  {
		EditorManager.disposeEventWatcher(this.changeTabGroups);
		EditorManager.disposeEventWatcher(this.changeTabs);
		EditorManager.disposeEventWatcher(this.changeViewSelection);
	};

	public async enableDidChangeTabs (view: vscode.TreeView<treeNodes>, groupState: GroupExpansionStateManager,
						myTreeProvider: TabTreeDataProvider, changeTabGroups: vscode.Disposable, 
						changeViewSelection: vscode.Disposable, context: vscode.ExtensionContext): Promise <vscode.Disposable>  {

		// change active tab within group <== fires once
		// delete a tab; <== fires once
		// add a tab by double clicking on its explorer name; <== fires two or three times
		// add a tab by single clicking on its explorer name; <== fires two times
		// split an editor: this runs twice and so does onDidChangeTabGroups
		// drop a file from the Explorer into the active group <== fires two times

		// 'changed' (to new focused tab) fires before 'removed' when deleting a focused tab
		// 'added' fires before 'changed' when deleting a focused tab
		// fires before onDidChangeTabGroups
		const changeTabs = vscode.window.tabGroups.onDidChangeTabs(async ({opened, closed, changed}) => {
			// find the isActive one and reveal that one only
			// could there be a tab added to 2+ groups and so more activeTabs? 
			const activeTab = opened.concat(changed).filter(tab => tab.isActive)[0];

			if (activeTab) {
				await EditorManager.disposeEventWatcher(changeViewSelection);

				if (view.visible && groupState.getIsExpanded(activeTab.group.viewColumn)) {
					const treeItem = await utilities.getMatchingTreeItem(activeTab);
					try {
						await view.reveal(treeItem);
					} catch {
						// noop
						console.log("view catch onDidChangeTabs");
					}
					// await view.reveal(treeItem);
					// TODO: use above as thenable and then below within?
					changeViewSelection = await this.enableViewSelection(view, groupState, myTreeProvider, changeTabs, changeTabGroups, context);	
				}
			}
			// if only change focus, does this need to run?
			myTreeProvider.refresh();
		});
		context.subscriptions.push(changeTabs);
		return changeTabs;
	}
	
	public async enableDidChangeTabGroups (view: vscode.TreeView<treeNodes>, groupState: GroupExpansionStateManager,
						myTreeProvider: TabTreeDataProvider, changeTabs: vscode.Disposable, 
						changeViewSelection: vscode.Disposable, context: vscode.ExtensionContext): Promise<vscode.Disposable>  {

	// with just one group, split an editor: this runs 3 times and onDidChangeTabs runs 2 times and this runs again
	// close last editor in group, this runs 3 times
	// on close last editor in group (and group closes), fires twice
	// vscode.window.tabGroups.onDidChangeTabGroups(async groups => {
		const changeTabGroups = vscode.window.tabGroups.onDidChangeTabGroups(async ({opened, closed, changed}) => {

			if (view.visible && groupState.getIsExpanded(changed[0].viewColumn)) {

				await EditorManager.disposeEventWatcher(changeViewSelection);
				const treeItem = await utilities.getMatchingTreeItem(changed[0].activeTab);

				try {
					await view.reveal(treeItem);
				} catch {
					// noop
					console.log("view catch onDidChangeTabGroups");
				}
				// await view.reveal(treeItem);
					// TODO: use above as thenable and then below within?
				changeViewSelection = await this.enableViewSelection(view, groupState, myTreeProvider, changeTabs, changeTabGroups, context);	
			}
			// is the below needed?
			// myTreeProvider.refresh();
		});
		context.subscriptions.push(changeTabGroups);
		return changeTabGroups;
	}

	public async enableViewSelection (view:  vscode.TreeView<treeNodes>, groupState: GroupExpansionStateManager, 
								myTreeProvider: TabTreeDataProvider, changeTabs: vscode.Disposable, 
								changeTabGroups: vscode.Disposable, context: vscode.ExtensionContext): Promise<vscode.Disposable>  {

		// fires after onDidExpandElement
		const viewSelection = view.onDidChangeSelection(async event => {

			// but it is necessary! onDidChangeSelection doesn't fire when open already focused group
			// because that is not a change in selection!!
			if (event.selection[0] instanceof TreeTab) {

				await EditorManager.disposeEventWatcher(changeTabs);
				await EditorManager.disposeEventWatcher(changeTabGroups);

				const thisTab = event.selection[0].tab as vscode.Tab;
				// const tabIndex = event.selection[0].tab.group.tabs.findIndex(tab => tab === thisTab);
				const tabIndex = event.selection[0].index;

				const viewColumn = event.selection[0].tab.group.viewColumn;
				const focusGroupCommand = await utilities.getfocusGroupCommand(viewColumn);

				if (!thisTab.isActive && !thisTab.group.isActive) {
					await vscode.commands.executeCommand(focusGroupCommand);
					await vscode.commands.executeCommand('workbench.action.openEditorAtIndex', [tabIndex]);
				}
				else if (!thisTab.isActive) 
					await vscode.commands.executeCommand('workbench.action.openEditorAtIndex', [tabIndex]);

				else if (thisTab.isActive && !thisTab.group.isActive) 	
					await vscode.commands.executeCommand(focusGroupCommand);

				changeTabGroups = await this.enableDidChangeTabGroups(view, groupState, myTreeProvider, changeTabs, viewSelection, context);
				changeTabs = await this.enableDidChangeTabs(view, groupState, myTreeProvider, changeTabGroups, viewSelection, context);
			}
		});
		context.subscriptions.push(viewSelection);
		return viewSelection;
	}

	static async disposeEventWatcher (disposable?: vscode.Disposable): Promise<void>  {
		await disposable?.dispose();
	}
}

// export class TabTreeDataProvider implements vscode.TreeDataProvider<treeNodes>, vscode.TreeDragAndDropController<treeNodes> {
export class TabTreeDataProvider implements vscode.TreeDataProvider<treeNodes> {

	// dropMimeTypes = ['application/vnd.code.tree.editor-groups', 'text/uri-list', 'text/plain'];
	// dragMimeTypes = ['application/vnd.code.tree.editor-groups', 'text/uri-list', 'text/plain'];

	private _onDidChangeTreeData: vscode.EventEmitter<treeNodes | undefined | null | void> = new vscode.EventEmitter<treeNodes | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<treeNodes | undefined | null | void> = this._onDidChangeTreeData.event;

	// constructor(context: vscode.ExtensionContext) {}
	constructor() {}
	// constructor() {
	// 	// const tabView = vscode.window.createTreeView('editor-groups', { treeDataProvider: this, showCollapseAll: true, canSelectMany: true, dragAndDropController: this });
	// 	// context.subscriptions.push(tabView);
	// }

	// public async handleDrag(source: treeNodes[], treeDataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {

	// 	// TODO: drag a group to empty space at end, splits it into separate groups?
	// 	let dragValue;

	// 	// if drag a mix of groups and individual tabs?  TODO  loop here
	// 	if (source.every(tab => tab instanceof TreeTab)) {
			
	// 		dragValue = source.map(treeTab => {
	// 			if (treeTab instanceof TreeTab) 
	// 				return { tabLabel: treeTab.label, sourceViewColumn: treeTab.tab.group.viewColumn };
	// 		});
	// 	}

	// 	else if (source.every(group => group instanceof TreeGroup)) {
		
	// 		dragValue = source.map(treeGroup => {

	// 			// let index = 0;

	// 			if (treeGroup instanceof TreeGroup) {         // type guarding just for ts error
	// 				return treeGroup.group.tabs.map(tab => {
	// 					return { tabLabel: tab.label, sourceViewColumn: Number(treeGroup.id) };
	// 				});
	// 			}
	// 		});
	// 		dragValue = dragValue.flat();
	// 	}

	// 	treeDataTransfer.set('application/vnd.code.tree.editor-groups', new vscode.DataTransferItem(dragValue));
	// }

	// public async handleDrop(target: treeNodes | undefined, sources: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {

	// 	const dropped = sources.get('application/vnd.code.tree.editor-groups').value;
	// 	if (!dropped) return;

	// 	// if target === undefined, means then entire treeView and a new editor group will be made at end

	// 	let newViewColumn: number;
	// 	if (target instanceof TreeTab) newViewColumn = target.tab.group.viewColumn;
	// 	else if (target instanceof TreeGroup) newViewColumn = target.group.viewColumn;

	// 	let targetIndex: number;
	// 	// if drop on a TreeTab, put in front of it
	// 	if (target instanceof TreeTab) targetIndex = target.index;
	// 	// get highest index, put last
	// 	else if (target instanceof TreeGroup) targetIndex = target.group.tabs.length;

	// 	dropped.forEach(async item => {
				
	// 		if (typeof item === 'object') {  // ts type guard

	// 			const group = vscode.window.tabGroups.all[item.sourceViewColumn - 1];
		
	// 			// could use tabIndex here TODO
	// 			const thisTab = group.tabs.find( tab => tab.label === item.tabLabel );

	// 			// const moveTabInGroupArgs = 
	// 			// const moveTabOutGroupArgs = 

		
	// 			// move() removed
	// 			// TODO use moveActiveEditor instead, see https://github.com/Microsoft/vscode/issues/8234#issuecomment-234573410
	// 			// TODO: check if no thisTab
	// 			await vscode.window.tabGroups.move(thisTab, newViewColumn, targetIndex++);

	// 			// await vscode.commands.executeCommand('moveActiveEditor', moveTabOutGroupArgs);
	// 			// await vscode.commands.executeCommand('moveActiveEditor', moveTabInGroupArgs);
	// 		}
	// 	});

	// 	this.refresh();
	// }

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: treeNodes): treeNodes {
		return element;
	}

	// getChildren(key: TreeGroup | undefined): (TreeTab[] | TreeGroup[]) {
	getChildren(key: TreeGroup | undefined): (treeNodes[]) {

		const groups = vscode.window.tabGroups.all;

		if (!key) {
			return groups.map(group => new TreeGroup(group));
		}

		// works well, sorted and pins go first
		// const sorted = sorter.byLabelAlphabetically(groups[Number(key.id)]);
		// return sorted.map(tab => new TreeTab(tab));

		// still need  to put pinned tabs first even if unsorted
		const pinsFirst = sorter.putPinnedTabsFirst(groups[Number(key.id) - 1 ]);
		// return groups[Number(key.id)].tabs.map(tab => new Tab(tab));  // no pinsFirst
		return pinsFirst.map(tab => new TreeTab(tab));
	}

	getParent(key: TreeTab): TreeGroup | undefined {
		if (key instanceof TreeGroup) return undefined;
		return new TreeGroup(key.tab.group);   // (key instanceof Tab)
	}
}


export class TreeGroup extends vscode.TreeItem {

	constructor( public readonly group: vscode.TabGroup	) {
		super(`Group-${group.viewColumn}`, vscode.TreeItemCollapsibleState.Collapsed);

		this.id = String(group.viewColumn);
		this.tooltip = new vscode.MarkdownString(`Group-${group.viewColumn}`, true);
	}
	contextValue = 'TreeGroup';
}


export class TreeTab extends vscode.TreeItem {

	constructor( public readonly tab: vscode.Tab, public index: number = 0 ) {
		super(tab.label, vscode.TreeItemCollapsibleState.None);

		// this.index = tab.group.tabs.findIndex(groupTab => groupTab === tab);
		this.index = tab.group.tabs.findIndex(groupTab => groupTab === tab);

		// id's must be unique within whole tree
		this.id = `${tab?.label}-${tab.group.viewColumn}`;

		this.tooltip = new vscode.MarkdownString(`${tab.label}`, true);

		if (tab.isPinned && tab.isDirty) this.iconPath = new vscode.ThemeIcon("pinned-dirty", new vscode.ThemeColor("tab.activeModifiedBorder"));
		else if (tab.isPinned) this.iconPath = new vscode.ThemeIcon("pinned", new vscode.ThemeColor("tab.activeModifiedBorder"));
		else if (tab.isDirty)	this.iconPath = new vscode.ThemeIcon("close-dirty", new vscode.ThemeColor("tab.activeModifiedBorder"));
	}
	// index = this.tab;
	contextValue = 'TreeTab';
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

		// no longer required after onDidChangeTabs.changed ?
		// vscode.workspace.onDidChangeTextDocument(event => {
		// 	if (view.visible) myTreeProvider.refresh();
		// });
		// above includes onDidSaveTextDocument, onDidRenameFiles, onDidOpenTextDocument and onDidCloseTextDocument

		// no longer required after onDidChangeTabs.changed ?
		// vscode.window.onDidChangeTextEditorViewColumn(event => {
		// 	if (view.visible) myTreeProvider.refresh();
		// });