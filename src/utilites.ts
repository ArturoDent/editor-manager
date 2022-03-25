import * as vscode from 'vscode';
import { Tab } from './editorManagerTree';


export function getMatchingTreeItem(tab: vscode.Tab ): Tab { 

	// const activeLabel = tab.label;
	// const parentGroup = tab.group;
	// const path = tab.kind.uri.path;

	// console.log(tab);

	return new Tab(tab);
}