import * as vscode from "vscode";
import { ChatViewProvider } from "./providers/chatViewProvider.js";
import { ConfigViewProvider } from "./providers/configViewProvider.js";
import { ActivityStatusBar } from "./providers/statusBarProvider.js";
import {
	GetAllSettings,
	GetProviderFromSettings,
} from "./service/base.js";

let statusBarProvider: ActivityStatusBar;

export async function activate(context: vscode.ExtensionContext) {
	const aiProvider = GetProviderFromSettings();

	statusBarProvider = new ActivityStatusBar();

	const settings = GetAllSettings();

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			ConfigViewProvider.viewType,
			new ConfigViewProvider(context.extensionUri, settings)
		)
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("VscOMP")) {
				vscode.commands.executeCommand("workbench.action.reloadWindow");
			}
		})
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			ChatViewProvider.viewType,
			new ChatViewProvider(aiProvider, context),
			{
				webviewOptions: {
					retainContextWhenHidden: true,
				},
			}
		)
	);
}

export function deactivate() {
	if (statusBarProvider) {
		statusBarProvider.dispose();
	}
}
