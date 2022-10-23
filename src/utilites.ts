import * as vscode from 'vscode';
import { TreeTab } from './editorManagerTree';

type tabInput = {
	uri?: vscode.Uri,
	original?: vscode.Uri,
  modified?: vscode.Uri,
  notebookType?: string,
  viewType?: string,
 	unknown?: boolean,
	terminal?: boolean
};

export function getTabInputUri(tab: vscode.Tab): tabInput {

	if (tab.input instanceof vscode.TabInputText) return { uri: tab.input.uri };  // or {uri: tab.input.uri} ?
  else if (tab.input instanceof vscode.TabInputWebview) return { viewType: tab.input.viewType };
	else if (tab.input instanceof vscode.TabInputNotebook) 
		return { uri: tab.input.uri, notebookType: tab.input.notebookType };
	else if (tab.input instanceof vscode.TabInputCustom)
		return { uri: tab.input.uri, viewType: tab.input.viewType };
	else if (tab.input instanceof vscode.TabInputTextDiff) 
		return { original: tab.input.original, modified: tab.input.modified };
	else if (tab.input instanceof vscode.TabInputNotebookDiff)
		return { original: tab.input.original, modified: tab.input.modified, notebookType: tab.input.notebookType };

		// The tab represents a terminal in the editor area.
	else if (tab.input instanceof vscode.TabInputTerminal) return { terminal: true };

	else return { unknown: true };  // for unknown
}

export async function getMarkdownFileURI(tab: vscode.Tab): Promise<vscode.Uri> {
  
  const previewLabel = tab.label.match(/\[?Preview\]?\s+(.*)/)[1];
  if (previewLabel) {
    const markdownTab = vscode.window.tabGroups.activeTabGroup.tabs.find(tab => tab.label === previewLabel);
		if (markdownTab.input instanceof vscode.TabInputText) return markdownTab.input.uri;
  }
  else return undefined;
}

export async function getMatchingTreeItem(tab: vscode.Tab): Promise<TreeTab> {
	if (tab?.label) return new TreeTab(tab);
}

// export function getMatchingTreeItem(tab: vscode.Tab): TreeTab {
// 	// TODO do this without creating a new TreeTab, loop through and filter?
// 	return new TreeTab(tab);
// 	const activeGroup = tab.group;

export async function getfocusGroupCommand(viewColumn: Number): Promise<string> {

	// viewColumn is 1-based
	switch (viewColumn) {
		case 1:
			return "workbench.action.focusFirstEditorGroup";		
			break;
		case 2:
			return "workbench.action.focusSecondEditorGroup";	
			break;
		case 3:
			return "workbench.action.focusThirdEditorGroup";
			break;
		case 4:
			return "workbench.action.focusFourthEditorGroup";
			break;
		case 5:
			return "workbench.action.focusFifthEditorGroup";
			break;
		case 6:
			return "workbench.action.focusSixthEditorGroup";
			break;
		case 7:
			return "workbench.action.focusSeventhEditorGroup";
			break;
		case 8:
			return "workbench.action.focusEighthEditorGroup";
			break;

		default:
			return "";
			break;
	}
}

export function buidTabKindCommand(tab: vscode.Tab): vscode.Command {

	const tabCommand = { title: "", command: "", arguments: [] };

	tabCommand.title = "";

	
	// if (tab.Input instanceof vscode.TabKInputText) {
	// 	// might have to get and focus editorGroup first
	// 	// const index = 12;
	// 	// tabCommand.command = 'workbench.action.openEditorAtIndex';
	// 	// tabCommand.arguments = [index];

	// 	tabCommand.command = 'vscode.open';
	// 	tabCommand.arguments = [tab.Input?.uri, { viewColumn: tab.group.viewColumn }];
	// }

	// // e.g., markdown preview
	// else if (tab.Input instanceof vscode.TabInputWebview) {
	// 	// viewType = "mainThreadWebview-markdown.preview"
	// 	// debugger;
	// }

	// // label = "bash"
	// else if (tab.Input instanceof vscode.TabInputTerminal) {
	// 	// tabCommand.command = 'workbench.action.createTerminalEditor';

	// 	// what does the below command do?
	// 	// tabCommand.command = 'workbench.action.terminal.moveToEditorInstance';

	// 	// what does the below command do?
	// 	tabCommand.command = 'workbench.action.terminal.focusAtIndex2';
	// 	tabCommand.arguments[0] = { viewColumn: tab.group.viewColumn };
	// }

	// // 
	// else if (tab.Input instanceof vscode.TabInputTextDiff) {
	// 	// readonly original: Uri;
	// 	// readonly modified: Uri;
	// 	// debugger;
	// 	tabCommand.command = '';
	// 	// tabCommand.arguments = [[tab.Input?.uri, { viewColumn: tab.group.viewColumn }]];
	// }

	// else if (tab.Input === undefined) {  // unknown?

	// 	if (tab.label === "Keyboard Shortcuts") tabCommand.command = 'workbench.action.openGlobalKeybindings';
	// 	else if (tab.label === "Settings") tabCommand.command = 'workbench.action.openSettings2';
	// }

	// // split in group?


	return tabCommand;
}