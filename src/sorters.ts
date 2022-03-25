import * as vscode from 'vscode';
import { Tab } from './editorManagerTree'
import * as path from 'path';


export function byLabelAlphabetically(group: vscode.TabGroup): vscode.Tab[] { 

	const sorted = Object.values(group.tabs).sort(function(a, b) {
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
