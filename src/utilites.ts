import * as vscode from 'vscode';
import { Tab } from './editorManagerTree';


export async function getMatchingTreeItem(tab: vscode.Tab): Promise<Tab> {
	return new Tab(tab);
}

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

	// if (tab.kind instanceof vscode.TabKindText) {
	// 	// might have to get and focus editorGroup first
	// 	// const index = 12;
	// 	// tabCommand.command = 'workbench.action.openEditorAtIndex';
	// 	// tabCommand.arguments = [index];

	// 	tabCommand.command = 'vscode.open';
	// 	tabCommand.arguments = [tab.kind?.uri, { viewColumn: tab.group.viewColumn }];
	// }

	// // e.g., markdown preview
	// else if (tab.kind instanceof vscode.TabKindWebview) {
	// 	// viewType = "mainThreadWebview-markdown.preview"
	// 	// debugger;
	// }

	// // label = "bash"
	// else if (tab.kind instanceof vscode.TabKindTerminal) {
	// 	// tabCommand.command = 'workbench.action.createTerminalEditor';

	// 	// what does the below command do?
	// 	// tabCommand.command = 'workbench.action.terminal.moveToEditorInstance';

	// 	// what does the below command do?
	// 	tabCommand.command = 'workbench.action.terminal.focusAtIndex2';
	// 	tabCommand.arguments[0] = { viewColumn: tab.group.viewColumn };
	// }

	// // 
	// else if (tab.kind instanceof vscode.TabKindTextDiff) {
	// 	// readonly original: Uri;
	// 	// readonly modified: Uri;
	// 	// debugger;
	// 	tabCommand.command = '';
	// 	// tabCommand.arguments = [[tab.kind?.uri, { viewColumn: tab.group.viewColumn }]];
	// }

	// else if (tab.kind === undefined) {

	// 	if (tab.label === "Keyboard Shortcuts") tabCommand.command = 'workbench.action.openGlobalKeybindings';
	// 	else if (tab.label === "Settings") tabCommand.command = 'workbench.action.openSettings2';
	// }

	// // split in group?


	return tabCommand;
}