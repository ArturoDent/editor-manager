'use strict';

import * as vscode from 'vscode';
// import { TestViewDragAndDrop } from './testViewDragAndDrop';
// import { EditorTree } from './EditorTree';
import { EditorTabProvider, Tab, Group } from './editorManagerTree';
import * as utilities from './utilites';

export async function activate(context: vscode.ExtensionContext) {

	const editorTabProvider = new EditorTabProvider();
	vscode.window.registerTreeDataProvider('editor-groups', editorTabProvider);
	vscode.commands.registerCommand('editor-groups.refreshTree', () => editorTabProvider.refresh());
	// vscode.commands.registerCommand('extension.openPackageOnNpm', moduleName => vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`https://www.npmjs.com/package/${moduleName}`)));
	vscode.commands.registerCommand('editor-groups.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	vscode.commands.registerCommand('editor-groups.deleteEntry', (entry: Tab|Group) => {
		vscode.window.showInformationMessage(`Successfully called delete entry.`)
	});
	
	// vscode.commands.registerCommand('nodeDependencies.editEntry', (node: Dependency) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));

	vscode.window.tabGroups.onDidChangeTab(event => {
		editorTabProvider.refresh();
		const treeItem = utilities.getMatchingTreeItem(event);
		editorTabProvider.reveal(treeItem, {expand: true, focus: true, select: true});
	});

	vscode.window.onDidChangeActiveTextEditor(event => {
		editorTabProvider.refresh();
		// const treeItem = utilities.getMatchingTreeItem(event.document, event.viewColumn);
		// editorTabProvider.reveal(treeItem, {expand: true, focus: false, select: true});
	});
	vscode.workspace.onDidChangeTextDocument(event => editorTabProvider.refresh());
		// above includes onDidSaveTextDocument, onDidRenameFiles, onDidOpenTextDocument and onDidCloseTextDocument

	vscode.window.onDidChangeTextEditorViewColumn(event => editorTabProvider.refresh());

	// vscode.commands.executeCommand("workbench.view.extension.editorManager");

	// onDidChangeSelection  TreeView

	// Drag and Drop proposed API sample
	// This check is for older versions of VS Code that don't have the most up-to-date tree drag and drop API proposal.
	// if (typeof vscode.DataTransferItem === 'function') {
	// 	new TestViewDragAndDrop(context);
	// }
}