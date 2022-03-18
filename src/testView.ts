import * as vscode from 'vscode';

export class TestView {


	constructor(context: vscode.ExtensionContext) {

		const view = vscode.window.createTreeView('editor-groups', { treeDataProvider: aNodeWithIdTreeDataProvider(), showCollapseAll: true });
		context.subscriptions.push(view);
		vscode.commands.registerCommand('testView.reveal', async () => {
			const key = await vscode.window.showInputBox({ placeHolder: 'Type the label of the item to reveal' });
			if (key) {
				await view.reveal({ key }, { focus: true, select: false, expand: true });
			}
		});
		// vscode.commands.registerCommand('testView.changeTitle', async () => {
		vscode.commands.registerCommand('editor-manager.helloWorld', async () => {
			// const groupTree = buildEditorGroupTree();
			// const title = await vscode.window.showInputBox({ prompt: 'Type the new title for the Test View', placeHolder: view.title });
			// if (title) {
			// 	view.title = title;
			// }
		});
	}
}

// const groupTree = buildEditorGroupTree();

// const tree = {
// 	'a': {
// 		'aa': {
// 			'aaa': {
// 				'aaaa': {
// 					'aaaaa': {
// 						'aaaaaa': {

// 						}
// 					}
// 				}
// 			}
// 		},
// 		'ab': {}
// 	},
// 	'b': {
// 		'ba': {},
// 		'bb': {}
// 	}
// };
const nodes = {};

	// let  defaultArgs = { restrictFind: "document", isRegex: false, cursorMoveSelect: "", matchWholeWord: false, matchCase: false };
	// Object.assign(defaultArgs, args);

// function buildEditorGroupTree() {
  
//   // let tree = {};
//   let tree = [];
//   // let thisGroup = {};
//   let thisGroup = [];
//   const groups =  vscode.window.tabGroups.groups;
	
//   groups.forEach((group) => {
//     const groupName = `Group${group.viewColumn}`;
//     // thisGroup[groupName] = {};
//     tree[groupName] = [];
    
//     group.tabs.forEach(tab => { 
//       return tree[groupName][`${tab.label}`] = `${tab.label}`;
//     });
//   });
  
//   // Object.assign(tree, thisGroup);
//   return tree;
// } 

function aNodeWithIdTreeDataProvider(): vscode.TreeDataProvider<{ key: string }> {
	return {
		getChildren: (element: { key: string }): { key: string }[] => {
			return getChildren(element ? element.key : undefined).map(key => {
				return getNode(key)});
		},
		getTreeItem: (element: { key: string }): vscode.TreeItem => {
			const treeItem = getTreeItem(element.key);
			// id must be unique across tree, so append the group's viewColumn to it.
			// treeItem.id = element.key;
			return treeItem;
		},
		// implement for reveal functionality
		getParent: ({ key }: { key: string }): { key: string } => {
      const parentKey = key.substring(0, key.length - 1);
      // if (parentKey) return new Key(parentKey);
      // else return void 0;
			return parentKey ? new Key(parentKey) : void 0;
		}
	};
}

function getChildren(key: string|undefined): string[] {
	const groups =  vscode.window.tabGroups.groups;
	if (!key) {
		return Object.keys(groups);
	}

	// return the key as well, so it can be used in the getNode and Key constructor
	return groups[key].tabs.map(tab => tab.label);
}

function getTreeItem(key: string): vscode.TreeItem {
	const treeElement = getTreeElement(key);
	// An example of how to use codicons in a MarkdownString in a tree item tooltip.
	const tooltip = treeElement.tabs ? new vscode.MarkdownString(`$(zap) Tooltip for Group-${Number(key)+1}`, true)
									                 : new vscode.MarkdownString(`$(zap) Tooltip for ${key}`, true);
	return {
		// label: key.label,
		label: treeElement.tabs ? `Group-${treeElement.viewColumn}` : key,
		id: treeElement.tabs ? `Group-${treeElement.viewColumn}` : `${key}-${treeElement?.groupColumn}`,
		iconPath: new vscode.ThemeIcon("close-dirty"),
		tooltip,
		// resourceUri: key.resource,
		collapsibleState: treeElement.tabs ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
	};
}

// returns a tabGroup or a Tab
function getTreeElement(element: any): any {
	let parent;
	// let parent =  vscode.window.tabGroups.groups;

	if (element.parentGroup) {
		parent = element.parentGroup;
		const thisTab = parent.tabs.find(tab => tab.label === element);
		return { thisTab, groupColumn: parent.viewColumn };
	}

	parent =  vscode.window.tabGroups.groups;
	let isGroup = parent.find(group => (group.viewColumn - 1) === Number(element));
	if (isGroup) return parent[element];

	// let isGroup = parent.find(group => (group.viewColumn - 1) === Number(element));
	// if (isGroup) return parent[element];

	// const thisGroup = parent.find(group => group.tabs.find(tab => tab.label === element));
	// const thisTab = thisGroup.tabs.find(tab => tab.label === element)

	// if (!thisTab) {
	// 	return null;
	// }

	// return { thisTab, groupColumn: parent.viewColumn };
}

function getNode(key: string): { key: string } {
	if (!nodes[key]) {
		nodes[key] = new Key(key);
	}
	return nodes[key];
}

class Key {
	constructor(readonly key: string) { }
}
