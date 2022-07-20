import * as vscode from 'vscode';
import { EditorManager, TabTreeDataProvider, TreeTab, TreeGroup } from './editorManagerTree';
import * as utilities from './utilites';

type treeNodes = TreeTab | TreeGroup;

type droppedItem = {
  source: "TreeTab" | "TreeGroup",
  tabLabel?: string,
  tabUri?: string,
  tabActive?: boolean,
  tabActiveIndex?: number,
  tabPreview?: boolean,
  sourceViewColumn: number,
  sourceIndex?: number  
};


export class TabTreeDragDropController implements vscode.TreeDragAndDropController<treeNodes> {
  
  private editorManager: EditorManager;
	private tabTreeDataProvider: TabTreeDataProvider;
  
  constructor(editorManager: EditorManager) {
    this.editorManager = editorManager;
		this.tabTreeDataProvider = this.editorManager.myTreeProvider;
  }
  
	dropMimeTypes = ['application/vnd.code.tree.editor-groups', 'text/uri-list', 'text/plain'];
	dragMimeTypes = ['application/vnd.code.tree.editor-groups', 'text/uri-list', 'text/plain'];

	public async handleDrag(source: treeNodes[], treeDataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {

		// TODO: drag a group to empty space at end, splits it into separate groups?
		let dragValue;

		// if drag a mix of groups and individual tabs?  TODO  loop here
		dragValue = source.map(node => {
			
			if (node instanceof TreeTab) {
			
						// TODO for different kinbd.input's
				let uri: vscode.Uri;
				if (node.tab.input instanceof vscode.TabInputText) uri = node.tab.input.uri;
        
        const activeTabIndex = node.tab.group.tabs.findIndex(tab => tab.isActive);

        return {
          source: "TreeTab", tabLabel: node.label, tabUri: uri, tabActive: node.tab.isActive, tabActiveIndex: activeTabIndex,
          tabPreview: node.tab.isPreview, sourceViewColumn: node.tab.group.viewColumn, sourceIndex: node.index
        };
			}

			else if (node instanceof TreeGroup) {  
				return { source: "TreeGroup", sourceViewColumn: node.group.viewColumn };
			}
		});


		// if (source.every(tab => tab instanceof TreeTab)) {
			
		// 	dragValue = source.map(treeTab => {
		// 		if (treeTab instanceof TreeTab) {

		// 			// TODO for different kinbd.input's
		// 			let uri: vscode.Uri;
		// 			if (treeTab.tab.input instanceof vscode.TabInputText) uri = treeTab.tab.input.uri;

		// 			return { source: "TreeTab", tabLabel: treeTab.label, tabUri: uri, tabActive: treeTab.tab.isActive, sourceViewColumn: treeTab.tab.group.viewColumn, sourceIndex: treeTab.index };
		// 		}
		// 	});
		// }

		// else if (source.every(group => group instanceof TreeGroup)) {
		
		// 	dragValue = source.map(treeGroup => {

		// 		if (treeGroup instanceof TreeGroup) {         // type guarding just for ts error
		// 			return treeGroup.group.tabs.map(tab => {
		// 				let sourceIndex = tab.group.tabs.findIndex(groupTab => groupTab === tab);
		// 				// TODO
		// 				let uri: vscode.Uri;
		// 				if (tab.input instanceof vscode.TabInputText) uri = tab.input.uri;
		// 				// else uri = undefined??

		// 				return { source: "TreeGroup", tabLabel: tab.label, tabUri: uri, tabActive: tab.isActive, sourceViewColumn: Number(treeGroup.id), sourceIndex: sourceIndex };
		// 			});
		// 		}
		// 	});
		// 	dragValue = dragValue.flat();
		// }

		treeDataTransfer.set('application/vnd.code.tree.editor-groups', new vscode.DataTransferItem(dragValue));
	}

	public async handleDrop(target: treeNodes | undefined, sources: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {

		let droppedFiles: string;
		let droppedTreeNodes: Array<droppedItem> = [];

		const droppedFilesDataTransferItem = sources.get('text/uri-list');
    if (droppedFilesDataTransferItem) droppedFiles = await droppedFilesDataTransferItem.asString();
    
		// droppedFiles is just a newline-separated string of uri's like:
		// "file:///c%3A/Users/Mark/Documents/phptopdf-READ-ME.txt\nfile:///c%3A/Users/Mark/Documents/token%20vsts.txt"

		// if (droppedFiles) {}

		const droppedTreeNodesDataTransferItem = sources.get('application/vnd.code.tree.editor-groups');
		if (!droppedTreeNodesDataTransferItem) return;
		else droppedTreeNodes = droppedTreeNodesDataTransferItem.value;

		let targetViewColumn: number;

		if (target instanceof TreeTab) targetViewColumn = target.tab.group.viewColumn;

		// else if (target instanceof TreeGroup) {
		// 	if (droppedTreeNodes.some(dragItem => dragItem.source === "TreeGroup")) {
		// 		// must do this for each dropped item / move below
		// 		if (target.group.viewColumn > droppedTreeNodes[0].sourceViewColumn) 
		// 			targetViewColumn = vscode.window.tabGroups.all.length;
		// 	}
		//  	 else targetViewColumn = target.group.viewColumn;
		// }

		// target === undefined
		else if (!target) {
			// if (droppedTreeNodes.some(dragItem => dragItem.source === "TreeGroup")) targetViewColumn = vscode.window.tabGroups.all.length;
		 	 targetViewColumn = vscode.window.tabGroups.all.length + 1;
		}
	
		let targetIndex: number;
		// if drop on a TreeTab, put in front of it
		if (target instanceof TreeTab) targetIndex = target.index;
		// get highest index, put last
		else if (target instanceof TreeGroup) targetIndex = target.group.tabs.length; 
		else if (!target) targetIndex = 0;

		// let moveTabOutGroupArgs: {to: "position", by: "group", value: number};
		// let moveTabInGroupArgs:  {to: "position", by: "tab",   value: number};

		const activeTabMap = new Map();
    const activeGroupColumn: number = vscode.window.tabGroups.all.find(group => group.isActive).viewColumn;
    
		vscode.window.tabGroups.all.map (tabGroup => tabGroup.tabs.map(tab => {
			// don't add an active tab that moved?
			// use dropped[n].sourceIndex here
      if (tab.input instanceof vscode.TabInputText && tab.isActive && !droppedTreeNodes?.find(item => {
				if (tab.input instanceof vscode.TabInputText) tab.input.uri.toString() === item.tabUri;
			}))
        activeTabMap.set(tabGroup.viewColumn, tab);
		}));
    
		const activeTab = vscode.window.tabGroups.all[0].activeTab;

		droppedTreeNodes.map(async (item: droppedItem) => {

			if (target instanceof TreeTab) targetViewColumn = target.tab.group.viewColumn;

			// else if (target instanceof TreeGroup) {
			// 	if (droppedTreeNodes.some(dragItem => dragItem.source === "TreeGroup")) {
			// 		// must do this for each dropped item / move below
			// 		if (target.group.viewColumn > item.sourceViewColumn) 
			// 			targetViewColumn = vscode.window.tabGroups.all.length;
			// 	}
			// 		else targetViewColumn = target.group.viewColumn;
			// }
	
			// target === undefined
			else if (!target) {
				// if (droppedTreeNodes.some(dragItem => dragItem.source === "TreeGroup")) targetViewColumn = vscode.window.tabGroups.all.length;
				targetViewColumn = vscode.window.tabGroups.all.length + 1;
			}

			// const activeTab = vscode.window.tabGroups.all[targetViewColumn - 1].activeTab;
				
			if (item.source = "TreeTab") {
        await moveTab(item, targetViewColumn, targetIndex++).then(async onfulfilled => {
					const index = vscode.window.tabGroups.all[targetViewColumn - 1].tabs.findIndex(tab => tab.label === activeTab.label);
					// make this thenable?
					await vscode.commands.executeCommand('workbench.action.openEditorAtIndex', index);
					// .then(async onfulfilled => {

					// 	await this.tabTreeDataProvider.refresh();
					// 	// await this.editorManager.tabView.reveal(new TreeTab(activeTab));
					// });

    			await this.tabTreeDataProvider.refresh();
					// await this.editorManager.tabView.reveal(new TreeTab(activeTab));
				});
			}

		});

		// const index = vscode.window.tabGroups.all[targetViewColumn - 1].tabs.findIndex(tab => tab.label === activeTab.label);
		// // make this thenable?
		// await vscode.commands.executeCommand('workbench.action.openEditorAtIndex', index);

		// queueMicrotask(this.tabTreeDataProvider.refresh());   // does this help? 
    // this.tabTreeDataProvider.refresh();

    // this.editorManager.enableTabAndViewWatchers();
	}
}

async function moveTab(item, targetViewColumn: number, targetIndex: number): Promise<void> {

  // if a markdown preview, for example
  if (!item.tabUri) {
    
    await vscode.commands.executeCommand('workbench.action.openEditorAtIndex', [item.sourceIndex]);
    
    // const moveTabBetweenGroupArgs = {to: "position", by: "group", value: targetViewColumn};  // 'value' is 1-based
    // await vscode.commands.executeCommand('moveActiveEditor', moveTabBetweenGroupArgs);
    
    const moveTabInGroupArgs = {to: "position", by: "tab", value: targetIndex + 1};  // 'value' is 1-based
    await vscode.commands.executeCommand('moveActiveEditor', moveTabInGroupArgs);
  }
  
  else {
		const openOptions = { preserveFocus: false, preview: item.tabPreview, viewColumn: targetViewColumn };
		await vscode.commands.executeCommand('vscode.open', item.tabUri, openOptions);
		
		const moveTabInGroupArgs = {to: "position", by: "tab", value: targetIndex + 1};  // 'value' is 1-based
		await vscode.commands.executeCommand('moveActiveEditor', moveTabInGroupArgs);

		if (item.sourceViewColumn !== targetViewColumn) {
			const sourceGroup = vscode.window.tabGroups.all[item.sourceViewColumn - 1]; // 'all' array is 0-based
			const thisTab = sourceGroup.tabs[item.sourceIndex];
		
			// below unless Shift/Ctrl + drag ? TODO
			await vscode.window.tabGroups.close(thisTab, false);
		}
  }
}

		// // TODO restore active group and all active tabs in each group here
		// activeTabMap.forEach(async (value: vscode.Tab, key: number) => {
		// 	// const focusGroupCommand = await utilities.getfocusGroupCommand(activeGroupColumn);
		// 	// const focusGroupCommand = await utilities.getfocusGroupCommand(key);
		// 	// await vscode.commands.executeCommand(focusGroupCommand);

		// 	// await vscode.commands.executeCommand('workbench.action.openEditorAtIndex', [value.tabIndex]);
		// 	// let showOptions: vscode.TextDocumentShowOptions =  { viewColumn: key, preserveFocus: false, preview: value.isPreview };
		// 	// await vscode.window.showTextDocument(value.input?.uri, showOptions);
      
    //     const openOptions = { preserveFocus: true, preview: value.isPreview, viewColumn: key};
    //     await vscode.commands.executeCommand('vscode.open', value.input.uri, openOptions);
		// });

		// const focusGroupCommand = await utilities.getfocusGroupCommand(activeGroupColumn);
		// await vscode.commands.executeCommand(focusGroupCommand);