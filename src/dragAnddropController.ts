import * as vscode from 'vscode';
import {EditorManager, TabTreeDataProvider, TreeTab, TreeGroup } from './editorManagerTree';
import * as utilities from './utilites'


type treeNodes = TreeTab | TreeGroup;

export class TabTreeDragDropController implements vscode.TreeDragAndDropController<treeNodes> {

	constructor(context: vscode.ExtensionContext) {}

	dropMimeTypes = ['application/vnd.code.tree.editor-groups', 'text/uri-list', 'text/plain'];
	dragMimeTypes = ['application/vnd.code.tree.editor-groups', 'text/uri-list', 'text/plain'];

	tabTreeDataProvider = new TabTreeDataProvider();

	public async handleDrag(source: treeNodes[], treeDataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {

		// TODO: drag a group to empty space at end, splits it into separate groups?
		let dragValue;

		// if drag a mix of groups and individual tabs?  TODO  loop here
		dragValue = source.map(node => {
			
			if (node instanceof TreeTab) {
			
						// TODO for different kinbd.input's
				let uri: vscode.Uri;
				if (node.tab.input instanceof vscode.TabInputText) uri = node.tab.input.uri;

				return { source: "TreeTab", tabLabel: node.label, tabUri: uri, tabActive: node.tab.isActive, sourceViewColumn: node.tab.group.viewColumn, sourceIndex: node.index };
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
		let droppedTreeNodes = [];

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

		else if (target instanceof TreeGroup) {
			if (droppedTreeNodes.some(dragItem => dragItem.source === "TreeGroup")) {
				// must do this for each dropped item / move below
				if (target.group.viewColumn > droppedTreeNodes[0].sourceViewColumn) 
					targetViewColumn = vscode.window.tabGroups.all.length;
			}
		 	 else targetViewColumn = target.group.viewColumn;
		}

		// target === undefined
		else if (!target) {
			if (droppedTreeNodes.some(dragItem => dragItem.source === "TreeGroup")) targetViewColumn = vscode.window.tabGroups.all.length;
		 	 else targetViewColumn = vscode.window.tabGroups.all.length + 1;
		}
	
		let targetIndex: number;
		// if drop on a TreeTab, put in front of it
		if (target instanceof TreeTab) targetIndex = target.index;
		// get highest index, put last
		else if (target instanceof TreeGroup) targetIndex = target.group.tabs.length;
		else if (!target) targetIndex = 0;

		let moveTabOutGroupArgs: {to: "position", by: "group", value: number};
		let moveTabInGroupArgs:  {to: "position", by: "tab",   value: number};

		let index = 0;
		const activeTabMap = new Map();
		const activeGroupColumn: number = vscode.window.tabGroups.all.find(group => group.isActive).viewColumn;
		vscode.window.tabGroups.all.map (tabGroup => tabGroup.tabs.map(tab => {
			// don't add an active tab that moved?
			// use dropped[n].sourceIndex here
			if (tab.isActive && !droppedTreeNodes.find(item => tab.input.uri === item.tabUri)) activeTabMap.set(tabGroup.viewColumn, tab);
		}));

		// showTextDocument(uri: , options?: TextDocumentShowOptions): Thenable<TextEditor>
		// let showOptions: vscode.TextDocumentShowOptions =  {viewColumn: targetViewColumn, preserveFocus: true}

		droppedTreeNodes.forEach(async item => {
				
			// if (typeof item === 'object') {  // ts type guard
			if (item.source = "TreeTab") {

				// disable these here TODO ?
				// await this.disposeEventWatcher(changeViewSelection);
				// const editorManager = new EditorManager(context);
				// await new EditorManager(this.context).disableTabAndViewWatchers();
				// await this.disposeEventWatcher(changeTabGroups);

				const sourceGroup = vscode.window.tabGroups.all[item.sourceViewColumn - 1];
				const thisTab = sourceGroup.tabs[item.sourceIndex];

				// if (thisTab?.isActive) {

					// if (targetViewColumn !== item.sourceViewColumn)   {  // position is 1-based 

					// 	moveTabOutGroupArgs = {to: "position", by: "group", value: targetViewColumn};
					// 	await vscode.commands.executeCommand('moveActiveEditor', moveTabOutGroupArgs);
					// }
						
					//            // position is 1-based
					// moveTabInGroupArgs = {to: "position", by: "tab", value: targetIndex++ + 1};
					// await vscode.commands.executeCommand('moveActiveEditor', moveTabInGroupArgs);

					// below unless Shift/Ctrl + drag ? TODO
					// await vscode.window.tabGroups.close(thisTab);
				// }
				// else {
					// below unless Shift/Ctrl + drag ? TODO
					await vscode.window.tabGroups.close(thisTab);

					// no index option - always puts it last TODO
					// test if Workbench > Editor: Reveal If Open is enabled TODO
					// preserveFocus: false makes it the active editor and the targetGroup active

					let showOptions: vscode.TextDocumentShowOptions =  { viewColumn: targetViewColumn, preserveFocus: false, preview: thisTab.isPreview };
					await vscode.window.showTextDocument(item.tabUri, showOptions);
					moveTabInGroupArgs = {to: "position", by: "tab", value: targetIndex++ + 1};  // 'value' is 1-based
					await vscode.commands.executeCommand('moveActiveEditor', moveTabInGroupArgs);
				// }

				// for  moveActiveEditor, see https://github.com/Microsoft/vscode/issues/8234#issuecomment-234573410
				// TODO: check if no thisTab
				// await vscode.window.tabGroups.move(thisTab, targetViewColumn, targetIndex++);
			// }
		}
	});

		// TODO restore active group and all active tabs in each group here
		// activeTabMap.forEach(async (value, key: number) => {
		// 	// const focusGroupCommand = await utilities.getfocusGroupCommand(activeGroupColumn);
		// 	const focusGroupCommand = await utilities.getfocusGroupCommand(key);
		// 	await vscode.commands.executeCommand(focusGroupCommand);

		// 	await vscode.commands.executeCommand('workbench.action.openEditorAtIndex', [value.tabIndex]);
		// 	let showOptions: vscode.TextDocumentShowOptions =  { viewColumn: key, preserveFocus: false, preview: value.isPreview };
		// 	// await vscode.window.showTextDocument(value.kind?.uri, showOptions);
		// });

		// const focusGroupCommand = await utilities.getfocusGroupCommand(activeGroupColumn);
		// await vscode.commands.executeCommand(focusGroupCommand);

		// this.tabTreeDataProvider.refresh();
	}
}