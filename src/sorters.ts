import * as vscode from 'vscode';
// import { TreeTab } from './editorManagerTree'
// import * as path from 'path';

// always put pinned tabs first?
export function putPinnedTabsFirst(group: vscode.TabGroup): vscode.Tab[] { 

	// and sort them (by label)? TODO
	const sorted = Object.values(group.tabs).sort(function(a, b) {		
		if (a.isPinned && !b.isPinned) return -1;
		if (b.isPinned && !a.isPinned) return 1;
		return 0;  			        // neither is pinned
	});
	return sorted;
}

// always put pinned tabs first?
export function byLabelAlphabetically(group: vscode.TabGroup): vscode.Tab[] { 

	const sorted = Object.values(group.tabs).sort(function(a, b) {
		
		if (a.isPinned && !b.isPinned) return -1;
		if (b.isPinned && !a.isPinned) return 1;

		const labelA = a.label.toLocaleLowerCase();
		const labelB = b.label.toLocaleLowerCase();
		if (labelA < labelB) {
			return -1;
		}
		if (labelA > labelB) {
			return 1;
		}
		return 0;  			// if names are equal
	});

	return sorted;
}

// sort by parent directory first, label second
