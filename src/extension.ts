'use strict';

import * as vscode from 'vscode';
import { EditorManager } from './editorManagerTree';
import * as utilities from './utilites';

// import { TestViewDragAndDrop } from './testViewDragAndDrop';


export async function activate(context: vscode.ExtensionContext) {

	vscode.commands.registerCommand('editor-manager.focusTab', async ([viewColumn, tabIndex]) => {
		// viewColumn is 1-based, tabIndex is 0-based
		const focusGroupCommand = await utilities.getfocusGroupCommand(viewColumn);
		await vscode.commands.executeCommand(focusGroupCommand);
		await vscode.commands.executeCommand('workbench.action.openEditorAtIndex', [tabIndex]);
	});

	new EditorManager(context);
}