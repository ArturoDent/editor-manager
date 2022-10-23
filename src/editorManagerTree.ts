import * as vscode from 'vscode';
import { TabTreeDragDropController } from './dragAnddropController';
import * as sorter from './sorters';
import * as utilities from './utilites';
import { debounce } from "ts-debounce";

type treeNodes = TreeTab | TreeGroup;
export class EditorManager {

	public nameManager: GroupNameManager;

	public tabView: vscode.TreeView<treeNodes>;
	public myTreeProvider: TabTreeDataProvider;
	public myTreeDragController: TabTreeDragDropController;
	public groupState: GroupExpansionStateManager;

	constructor(context: vscode.ExtensionContext) {

		this.nameManager = new GroupNameManager();       // just to set up the array from storage
		// this.nameManager.buildNameArray();
		this.myTreeProvider = new TabTreeDataProvider(this.nameManager);
		this.myTreeDragController = new TabTreeDragDropController(this);
		this.tabView = vscode.window.createTreeView('editor-groups', 
			{ treeDataProvider: this.myTreeProvider, 		
				showCollapseAll: true, 
				canSelectMany: true, 
				dragAndDropController: this.myTreeDragController
			});

			// this.tabView.badge = {tooltip:"my badge tooltip", value: vscode.window.tabGroups.all.length-5};
			// this.tabView.badge = {value: 0, tooltip:''};

		this.groupState = new GroupExpansionStateManager();

		context.subscriptions.push(this.tabView);

		// const checkBoxListener = this.tabView.onDidChangeCheckboxState(async event => {
		// 	// event = {item: Array(n)}, which TreeItem's checkbox was clicked and its state after clicking:0/1
		// 	console.log(event); 
		// });

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
			// refresh needed due to https://github.com/microsoft/vscode/issues/121567 ?
			// await this.myTreeProvider.refresh();
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

		// --------------------  editor-groups.closeTab  -----------------------------------------------
		const closeTab = vscode.commands.registerCommand('editor-groups.closeTab', async (...args) => {

			// filter out TreeGroups (may also be selected, but clicked on a TreeTab close icon)
			args[1] = args[1]?.filter(item => item instanceof TreeTab);

			if (!args[1]) await vscode.window.tabGroups.close(args[0].tab);   // closing only one TreeTab
			else {                                                            // closing multiple TreeTabs
				await Promise.all(args[1].map(async (treeTab) => {
	      	await vscode.window.tabGroups.close(treeTab.tab);
				}));
      	await this.myTreeProvider.refresh();
			}
		});
    context.subscriptions.push(closeTab);
		// ---------------------------------------------------------------------------------------------


		// --------------------  editor-groups.closeGroup  ---------------------------------------------
		const closeGroup = vscode.commands.registerCommand('editor-groups.closeGroup', async (...args) => {

			// filter out TreeTabs (may be from other groups and selected - ignore them since clicked on close Group icon)
			args[1] = args[1]?.filter(item => item instanceof TreeGroup);

			if (!args[1]) await vscode.window.tabGroups.close(args[0].group);  // closing only one TreeGroup
			else {                                                             // closing multiple TreeGroups
				await Promise.all(args[1].map(async (treeGroup) => {
      		await vscode.window.tabGroups.close(treeGroup.group);
				}));
			}
      await this.myTreeProvider.refresh();
		});
    context.subscriptions.push(closeGroup);
		// ---------------------------------------------------------------------------------------------

    
		// --------------------  editor-groups.renameTab  ----------------------------------------------
    const renameTab = vscode.commands.registerCommand('editor-groups.renameTab', async (args) => {

      const tabInfo = utilities.getTabInputUri(args.tab);
      const oldName = tabInfo?.uri.fsPath || tabInfo?.original.fsPath;
			if (!oldName) return;  // can't rename

      let inputBoxOptions = {
        ignoreFocusOut: false,
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
		// ---------------------------------------------------------------------------------------------


		// --------------------  editor-groups.renameGroup  --------------------------------------------
		const renameGroup = vscode.commands.registerCommand('editor-groups.renameGroup', async (args) => {
      const oldName = args.label;
      let inputBoxOptions = {
        ignoreFocusOut: false,
        value: oldName,
        prompt: "Change the name of the selected group."
      };
      
      await vscode.window.showInputBox(inputBoxOptions)
        .then(async newName => {
          if (!newName) return;
					// how to change the name of previous group
					await this.nameManager.changeName(newName, oldName);
          await this.myTreeProvider.refresh();
        });
    });
		context.subscriptions.push(renameGroup);
		// ---------------------------------------------------------------------------------------------
	

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
	// const debouncedChangeTabs = debounce(changeTabs, 1000, {isImmediate: true});


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
		},
		1000, {isImmediate: true})
	);
	context.subscriptions.push(changeTabGroups);


	// fires after onDidExpandElement (twice for group and tab) / onDidCollapseElement (once for group)
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
			}
		},
		1000, {isImmediate: true})
	);
	context.subscriptions.push(viewSelection);
}
    
}

export class TabTreeDataProvider implements vscode.TreeDataProvider<treeNodes> {

	nameManager: GroupNameManager;

	private _onDidChangeTreeData: vscode.EventEmitter<treeNodes | undefined | null | void> = new vscode.EventEmitter<treeNodes | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<treeNodes | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor(nameManager: GroupNameManager) { this.nameManager = nameManager; }

	async refresh(): Promise<void> {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: treeNodes): treeNodes {
		return element;
	}

	getChildren(key: TreeGroup | undefined): (treeNodes[]) {

		const groups = vscode.window.tabGroups.all;

		if (!key) {
			let index = 0;
			return groups.map(group => new TreeGroup(this.nameManager.getName(index++), group));
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
		return new TreeGroup(this.nameManager.getName(key.tab.group.viewColumn), key.tab.group);   // (key instanceof Tab)
	}
}


export class TreeGroup extends vscode.TreeItem {

	constructor( public label: string, public readonly group: vscode.TabGroup	) {

		super(label, vscode.TreeItemCollapsibleState.Expanded);

		this.id = String(group.viewColumn);
		this.tooltip = new vscode.MarkdownString(`viewcolumn = ${group.viewColumn}`, true);
	}
	contextValue = 'TreeGroup';
}


export class TreeTab extends vscode.TreeItem {
// export class TreeTab extends vscode.TreeItem2 {

	constructor( public readonly tab: vscode.Tab, public index: number = 0 ) {
		super(tab.label, vscode.TreeItemCollapsibleState.None);

		this.index = tab.group.tabs.findIndex(groupTab => groupTab === tab);

		// id's must be unique within whole tree
		this.id = `${tab?.label}-${tab.group.viewColumn}`;

		// this.tooltip = new vscode.MarkdownString(`${tab.label}`, true);
		// TODO : handle other tab kinds
		if (tab.input instanceof vscode.TabInputText)
			this.tooltip = new vscode.MarkdownString(`${tab.input.uri.fsPath}`, true);

		if (tab.isPinned && tab.isDirty) this.iconPath = new vscode.ThemeIcon("pinned-dirty", new vscode.ThemeColor("tab.activeModifiedBorder"));
		else if (tab.isPinned) this.iconPath = new vscode.ThemeIcon("pinned", new vscode.ThemeColor("tab.activeModifiedBorder"));
    else if (tab.isDirty) this.iconPath = new vscode.ThemeIcon("close-dirty", new vscode.ThemeColor("tab.activeModifiedBorder"));
    
    // but check group active status, just to set ThemeColor
    else if (tab.isActive && tab.group.isActive) {
			this.iconPath = new vscode.ThemeIcon("arrow-small-right", new vscode.ThemeColor("tab.activeBackground"));
			// this.iconPath = new vscode.ThemeIcon("arrow-small-right", new vscode.ThemeColor("charts.red"));  // this works
			// this.checkboxState = vscode.TreeItemCheckboxState.Checked;
			// this.checkboxState = {state: vscode.TreeItemCheckboxState.Checked, tooltip: "my nifty checkbox tooltip"};
	}

		else if (tab.isActive) {
			this.iconPath = new vscode.ThemeIcon("arrow-small-right", new vscode.ThemeColor("tab.unfocusedActiveBackground"));
		}
    // isPreview?  show in italics?
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
}

export class GroupNameManager {

	// to be loaded from storage or from tabGroups.all.length if no storage
	private nameArray: Array<string> = [];

	constructor() {
		this.buildNameArray();
	};

	private buildNameArray() {
		this.nameArray.length = vscode.window.tabGroups.all.length;
		this.nameArray.fill("Group");
		// default if no storage 'Group-1', etc.
		this.nameArray = this.nameArray.map((element, index) => `Group-${index+1}`);
	}

	public getName(index:number): string {
		if (index > this.nameArray.length - 1) {
			this.addName(`Group-${index+1}`, index);
		}
		return this.nameArray[index];
	}

	// for new groups, default 'Group-n'
	public async addName(newName: string, position:number = this.nameArray.length) {
		this.nameArray.splice(position, 0, newName);
	}

	// default position is the end of the array, for new group rename
	public async setNewName(newName: string, oldName:string, position:number = this.nameArray.length) {
		this.nameArray.splice(position, 0, newName);
	}

	public async changeName(newName: string, oldName:string, position:number = 0) {
		const newPosition = this.nameArray.findIndex(name => name === oldName);
		this.nameArray.splice(newPosition, 1, newName);
	}

	public async removeName(indexToRemove:number, nameToRemove?:string) {
		if (nameToRemove)
			this.nameArray = this.nameArray.filter(name => name !== nameToRemove);
		else this.nameArray.splice(indexToRemove, 1);
	}
}