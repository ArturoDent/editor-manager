'use strict';
import * as vscode from 'vscode';
import { EditorManager } from './editorManagerTree';


export async function activate(context: vscode.ExtensionContext) {

	// const editorManager = new EditorManager(context);
	new EditorManager(context);
}