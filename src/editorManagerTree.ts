import * as vscode from 'vscode';
import { TabTreeDragDropController } from './dragAnddropController';
import * as sorter from './sorters';
import * as utilities from './utilites';
import { debounce } from "ts-debounce";

type treeNodes = TreeTab | TreeGroup;


export class EditorManager {

	public tabView: vscode.TreeView<treeNodes>;
	public myTreeProvider: TabTreeDataProvider;
	public myTreeDragController: TabTreeDragDropController;
	public groupState: GroupExpansionStateManager;

	constructor(context: vscode.ExtensionContext) {

		this.myTreeProvider = new TabTreeDataProvider();
		this.myTreeDragController = new TabTreeDragDropController(this);
		this.tabView = vscode.window.createTreeView('editor-groups', { treeDataProvider: this.myTreeProvider, showCollapseAll: true, canSelectMany: true, 
																																		dragAndDropController: this.myTreeDragController });
		this.groupState = new GroupExpansionStateManager();

		context.subscriptions.push(this.tabView);

		const viewExpand = this.tabView.onDidExpandElement(async event => {
			if (event.element instanceof TreeGroup) this.groupState.setIsExpanded(event.element.group.viewColumn, true);
			// need below - else onDidChangeSelection does not always fire
			if (event.element instanceof TreeGroup && event.element.group.isActive) {
				try {
					await this.tabView.reveal(new TreeTab(event.element.group.activeTab));
				} catch {
					console.log("tabView catch onDidExpandElement group active");
				}
			}
			// need below because the Group treeItem is focused on expansion even if not the activeGroup 
			else if (event.element instanceof TreeGroup && !event.element.group.isActive) {
				const activeGroup = vscode.window.tabGroups.activeTabGroup;
				if (this.groupState.getIsExpanded(activeGroup.viewColumn)) {
					try {
						await this.tabView.reveal(new TreeTab(event.element.group.activeTab));
					} catch {
						// noop
						console.log("tabView catch onDidExpandElement group  not active");
					}
				}
			}
		});
		context.subscriptions.push(viewExpand);


		const viewCollapse = this.tabView.onDidCollapseElement(event => {
			if (event.element instanceof TreeGroup) this.groupState.setIsExpanded(event.element.group.viewColumn, false);
		});
		context.subscriptions.push(viewCollapse);


		// for menu view/title button command
		const refreshCommand = vscode.commands.registerCommand('editor-groups.refreshTree', async () => {
      await this.myTreeProvider.refresh();
		});
		context.subscriptions.push(refreshCommand);

		const closeTab = vscode.commands.registerCommand('editor-groups.closeTab', async (args) => {
      await vscode.window.tabGroups.close(args.tab);
      await this.myTreeProvider.refresh();
		});
    context.subscriptions.push(closeTab);
    
    const renameTab = vscode.commands.registerCommand('editor-groups.renameTab', async (args) => {

      const oldName = args.tab.input.uri.fsPath;
      
      let inputBoxOptions = {
        ignoreFocusOut: true,
        value: oldName,
        prompt: "Make changes to the fileName above.  "
      };
      
      await vscode.window.showInputBox(inputBoxOptions)
        .then(async newName => {
          if (!newName) return;
          const newNameUri = vscode.Uri.file(newName);
          await vscode.workspace.fs.rename(args.tab.input.uri, newNameUri, { overwrite: false });
          await this.myTreeProvider.refresh();
        });
    });
      
		context.subscriptions.push(renameTab);

	const changeTabs = vscode.window.tabGroups.onDidChangeTabs(
		debounce( async ({opened, closed, changed}) => {
			// find the isActive one and reveal that one only
			// could there be a tab added to 2+ groups and so more activeTabs? 
			const activeTab = opened.concat(changed).filter(tab => tab.isActive)[0];

			if (activeTab) {

				if (this.tabView.visible && this.groupState.getIsExpanded(activeTab.group.viewColumn)) {
					const treeItem = await utilities.getMatchingTreeItem(activeTab);
					try {
						await this.tabView.reveal(treeItem);
					} catch {
						// noop
						console.log("view catch onDidChangeTabs");
					}
				}
			}
			// if only change focus, does this need to run?
			await this.myTreeProvider.refresh();
		},
		1000, {isImmediate: true})
	);
	
	context.subscriptions.push(changeTabs);
	// const devouncedChangeTabs = debounce(changeTabs, 1000, {isImmediate: true});


	const changeTabGroups = vscode.window.tabGroups.onDidChangeTabGroups(
		debounce( async ({opened, closed, changed}) => {
			if (this.tabView.visible && this.groupState.getIsExpanded(changed[0].viewColumn)) {

				const treeItem = await utilities.getMatchingTreeItem(changed[0].activeTab);
				try {
					await this.tabView.reveal(treeItem);
				} catch {
					// noop
					console.log("view catch onDidChangeTabGroups");
				}
			}
			// is the below needed?
			// myTreeProvider.refresh();
		},
		1000, {isImmediate: true})
	);
	context.subscriptions.push(changeTabGroups);


	// fires after onDidExpandElement
	const viewSelection = this.tabView.onDidChangeSelection(
		debounce( async event => {
			if (event.selection[0] instanceof TreeTab) {
				
				const tab = event.selection[0].tab;
				const openOptions = { preserveFocus: true, preview: tab.isPreview, viewColumn: tab.group.viewColumn};
				// check if a uri, might be viewtype, etc., instead
				if (tab.input instanceof vscode.TabInputText)
					await vscode.commands.executeCommand('vscode.open', tab.input.uri, openOptions);

					// "mainThreadWebview-markdown.preview" and tab.label: 'Preview README.md' or '[Preview] README.md' for a locked preview
				else if (tab.input instanceof vscode.TabInputWebview && tab.input.viewType === "mainThreadWebview-markdown.preview") { 
					console.log("here");
					
					// get the uri of the matching label
					const sourceURI = await utilities.getMarkdownFileURI(tab);
					await vscode.commands.executeCommand('markdown.showPreview', sourceURI);
				}
				await this.myTreeProvider.refresh();
			}
		},
		1000, {isImmediate: true})
	);
	context.subscriptions.push(viewSelection);
}
    
}

export class TabTreeDataProvider implements vscode.TreeDataProvider<treeNodes> {

	private _onDidChangeTreeData: vscode.EventEmitter<treeNodes | undefined | null | void> = new vscode.EventEmitter<treeNodes | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<treeNodes | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor() {}

	async refresh(): Promise<void> {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: treeNodes): treeNodes {
		return element;
	}

	getChildren(key: TreeGroup | undefined): (treeNodes[]) {

		const groups = vscode.window.tabGroups.all;

		if (!key) {
			return groups.map(group => new TreeGroup(group));
		}

		// works well, sorted and pins go first
		// const sorted = sorter.byLabelAlphabetically(groups[Number(key.id)]);
		// return sorted.map(tab => new TreeTab(tab));

		// still need  to put pinned tabs first even if UNSORTED
		const pinsFirst = sorter.putPinnedTabsFirst(groups[Number(key.id) - 1 ]);
		// return groups[Number(key.id)].tabs.map(tab => new Tab(tab));  // if no pinsFirst
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
		// else if (tab.isPinned) this.iconPath = vscode.ThemeIcon.Folder;
    else if (tab.isDirty) this.iconPath = new vscode.ThemeIcon("close-dirty", new vscode.ThemeColor("tab.activeModifiedBorder"));
    
    // but check group active status, just to set ThemeColor
    else if (tab.isActive && tab.group.isActive) this.iconPath = new vscode.ThemeIcon("arrow-right", new vscode.ThemeColor("tab.activeBackground"));
    else if (tab.isActive) this.iconPath = new vscode.ThemeIcon("arrow-right", new vscode.ThemeColor("tab.unfocusedActiveBackground"));
    
    // isPreview?
	}
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