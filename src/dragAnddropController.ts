import * as vscode from 'vscode';
import { EditorManager, TabTreeDataProvider, TreeTab, TreeGroup, GroupNameManager } from './editorManagerTree';
import * as utilities from './utilites';

type treeNodes = TreeTab | TreeGroup;

// add fields for other tab types TODO
type droppedItem = {
  source: "TreeTab" | "TreeGroup",
	sourceViewColumn: number,
  sourceIndex?: number,
  tabLabel?: string,
  tabUri?: vscode.Uri,
  tabActive?: boolean,
  tabActiveIndex?: number,
  tabPreview?: boolean  
};


export class TabTreeDragDropController implements vscode.TreeDragAndDropController<treeNodes> {
  
  private editorManager: EditorManager;
	private tabTreeDataProvider: TabTreeDataProvider;
	private groupNameManager: GroupNameManager;
  
  constructor(editorManager: EditorManager) {
    this.editorManager = editorManager;
		this.tabTreeDataProvider = this.editorManager.myTreeProvider;
		this.groupNameManager = this.editorManager.nameManager;
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
		else if (target instanceof TreeGroup)  targetViewColumn = target.group.viewColumn;
		// target === undefined
		else if (!target) targetViewColumn = vscode.window.tabGroups.all.length + 1;
	
		let targetIndex: number;
		// if drop on a TreeTab, put in front of it
		if (target instanceof TreeTab) targetIndex = target.index;
		// get highest index, put last
		else if (target instanceof TreeGroup) targetIndex = target.group.tabs.length; 
		else if (!target) targetIndex = 0;

		let activeTabs: Array<vscode.Tab>;
		// TODO if active group closed set activeGroupColumn to previous
    const activeGroupColumn: number = vscode.window.tabGroups.all.find(group => group.isActive).viewColumn;
    
		let allActiveTabs = vscode.window.tabGroups.all.flatMap(tabGroup => tabGroup.tabs.filter(tab => tab.isActive ));
		activeTabs = allActiveTabs.filter(tab => !droppedTreeNodes?.find(node => {
			// return node.tabActive && node.tabUri === tab.input.uri;
			return (tab.input instanceof vscode.TabInputText && node.tabActive && node.tabUri === tab.input.uri);
		}));
		
		
		for await (const item of droppedTreeNodes) {

			if (item.source === "TreeTab") {
        await moveTab(item, targetViewColumn, targetIndex++);
			}

			else if (item.source === "TreeGroup") {
				const groupIndex = item.sourceViewColumn - 1;
				const tabsInGroup = vscode.window.tabGroups.all[groupIndex].tabs;

				for (const tab of tabsInGroup) {
					const sourceIndex = tab.group.tabs.findIndex(groupTab => groupTab === tab);
					// handle other tab types here? TODO
					let uri: vscode.Uri;
					if (tab.input instanceof vscode.TabInputText) uri = tab.input.uri;
					const droppedTab: droppedItem = {
						source: "TreeTab", tabLabel: tab.label, tabUri: uri, tabActive: tab.isActive,
						tabPreview: tab.isPreview, sourceViewColumn: tab.group.viewColumn, sourceIndex
					};
					await moveTab(droppedTab, targetViewColumn, targetIndex++);
				}
				// is this necessary?  make own function
				const groupToClose = vscode.window.tabGroups.all[item.sourceViewColumn - 1];
				await vscode.window.tabGroups.close(groupToClose, false);

				await this.groupNameManager.removeName(item.sourceViewColumn - 1);
			}
		};
		// restore active tabs here 
		await restoreActiveTabs(activeTabs);
		// restore active group
		await restoreActiveGroup(activeGroupColumn);
		await this.tabTreeDataProvider.refresh();
	}
	
}

async function moveTab(item: any, targetViewColumn: number, targetIndex: number): Promise<void> {

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
		await vscode.commands.executeCommand('vscode.open', item.tabUri, openOptions);  // this is failing silently

		if (item.sourceViewColumn !== targetViewColumn) {
			const moveTabBetweenGroupArgs = {to: "position", by: "group", value: targetViewColumn};  // 'value' is 1-based
			await vscode.commands.executeCommand('moveActiveEditor', moveTabBetweenGroupArgs);
		}
		
		const moveTabInGroupArgs = {to: "position", by: "tab", value: targetIndex + 1};  // 'value' is 1-based
		await vscode.commands.executeCommand('moveActiveEditor', moveTabInGroupArgs);

		// if not moving within same group
		// if last tab in group?
		if (item.sourceViewColumn !== targetViewColumn) {
			const sourceGroup = vscode.window.tabGroups.all[item.sourceViewColumn - 1]; // 'all' array is 0-based
			const thisTab = sourceGroup.tabs[item.sourceIndex];
		
			// below unless Shift/Ctrl + drag ? TODO
			await vscode.window.tabGroups.close(thisTab, false);
		}
  }
}


async function restoreActiveTabs(activeTabs: Array<vscode.Tab>):Promise<void>  {

	for await (const tab of activeTabs) {

		const focusGroupCommand = await utilities.getfocusGroupCommand(tab.group.viewColumn);
		await vscode.commands.executeCommand(focusGroupCommand);

		const activeTabIndex = tab.group.tabs.findIndex(tab => tab.isActive);
		await vscode.commands.executeCommand('workbench.action.openEditorAtIndex', [activeTabIndex]);

		let showOptions: vscode.TextDocumentShowOptions =  { viewColumn: tab.group.viewColumn, preserveFocus: false, preview: tab.isPreview };
		// await vscode.window.showTextDocument(tab.input?.uri, showOptions);  // need this, just commented because of the uri problem
	}
}


// TODO if active group closed set activeGroupColumn to previous
async function restoreActiveGroup(activeGroupColumn: number) {
	const focusGroupCommand = await utilities.getfocusGroupCommand(activeGroupColumn);
	await vscode.commands.executeCommand(focusGroupCommand);
}