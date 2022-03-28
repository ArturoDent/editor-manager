import * as vscode from 'vscode';
import { Tab } from './editorManagerTree';


export async function getMatchingTreeItem(tab: vscode.Tab): Promise<Tab> {
	return new Tab(tab);
}

// export async function realActiveTabs(): Promise<void> {
// 	const groups = vscode.window.tabGroups.groups;

// }