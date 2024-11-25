import * as vscode from "vscode";
import { eventEmitter } from "../events/eventEmitter";
import { AIProvider } from "../service/base";
import { AppMessage, ChatMessage } from "../types/Message";
import { loggingProvider } from "./loggingProvider";
import { check } from "./parser";
const Parser = require("web-tree-sitter")

let abortController = new AbortController();

export class ChatViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "vscomp-chat-view";

	private _disposables: vscode.Disposable[] = [];

	constructor(
		private readonly _aiProvider: AIProvider,
		private readonly _context: vscode.ExtensionContext
	) {}

	dispose() {
		this._disposables.forEach((d) => d.dispose());
		this._disposables = [];
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		token: vscode.CancellationToken
	) {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this._context.extensionUri,
				vscode.Uri.joinPath(
					this._context.extensionUri,
					"node_modules/vscode-codicons"
				),
			],
		};

		webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

		token.onCancellationRequested((e) => {
			abortController.abort();
			eventEmitter._onQueryComplete.fire();
		});

		this._disposables.push(
			webviewView.webview.onDidReceiveMessage((data: AppMessage) => {
				if (!data) {
					return;
				}

				const { command, value } = data;

				switch (command) {
					case "chat": {
						this.handleChatMessage({ value, webviewView });
						break;
					}
					case "parallelize": {
						this.handleParallelize({ value, webviewView });
						break;
					}
					case "cancel": {
						abortController.abort();
						break;
					}
					case "clipboard": {
						vscode.env.clipboard.writeText(value as string);
						break;
					}
					case "copyToFile": {
						this.sendContentToNewDocument(value as string);
						break;
					}
					case "clear": {
						this._aiProvider.clearChatHistory();
						break;
					}
					case "ready": {
						webviewView.webview.postMessage({
							command: "init",
							value: {
								workspaceFolder: getActiveWorkspace(),
								theme: vscode.window.activeColorTheme.kind,
							},
						});
						break;
					}
					case "log": {
						this.log(value);
						break;
					}
				}
			}),
			vscode.window.onDidChangeActiveColorTheme(
				(theme: vscode.ColorTheme) => {
					webviewView.webview.postMessage({
						command: "setTheme",
						value: theme.kind,
					});
				}
			)
		);
	}

	private async sendContentToNewDocument(content: string) {
		const newFile = await vscode.workspace.openTextDocument({
			content,
		});
		vscode.window.showTextDocument(newFile);
	}

	private async handleParallelize({
		value,
		webviewView,
	}: Pick<AppMessage, "value"> & { webviewView: vscode.WebviewView }) {
		abortController = new AbortController();

		let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return undefined;
        }
		let { document, selection } = editor;
		let tutorial: string = "";
		Parser.init().then(async() => {
			const language = await Parser.Language.load(vscode.Uri.joinPath(this._context.extensionUri, 'out', `tree-sitter-${document.languageId}.wasm`).fsPath);
			const parser = new Parser;
			parser.setLanguage(language);
			let tree = parser.parse(editor.document.getText(selection));
			tutorial = check(tree, false);
			console.log(tutorial);
			
			await this.streamParallelizeResponse(
				tutorial as string,
				webviewView
			);
		});
	}

	private async streamParallelizeResponse(
		tutorial: string,
		webviewView: vscode.WebviewView
	) {

		eventEmitter._onQueryStart.fire();

		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			return undefined;
		}
		let selection = editor.selection;
		let code = editor.document.getText(selection)
		if(code === "") {
			webviewView.webview.postMessage({
				command: "response",
				value: "You need to select some code first!\n",
			});
		} else {
			let prompt = "You need to parallelize the following C code using OpenMP:\n\`\`\`\n" + editor.document.getText(selection) + "\n\`\`\`\nHere are some parallelizing experiences:\n";
			var response = "";
			if(tutorial !== "false") {
				console.log(tutorial);
				response = await this._aiProvider.parallelize(prompt, tutorial, abortController.signal);
			} else {
				response = "Sorry, we can not parallelize this loop.";
			}

			webviewView.webview.postMessage({
				command: "response",
				value: response,
			});
		}

		eventEmitter._onQueryComplete.fire();

		webviewView.webview.postMessage({
			command: "done",
			value: null,
		});
	}

	private async handleChatMessage({
		value,
		webviewView,
	}: Pick<AppMessage, "value"> & { webviewView: vscode.WebviewView }) {
		abortController = new AbortController();

		await this.streamChatResponse(
			value as string,
			webviewView
		);
	}

	private async streamChatResponse(
		prompt: string,
		webviewView: vscode.WebviewView
	) {
		let ragContext = "";

		eventEmitter._onQueryStart.fire();

		const response = this._aiProvider.chat(
			prompt,
			ragContext,
			abortController.signal
		);

		for await (const chunk of response) {
			webviewView.webview.postMessage({
				command: "response",
				value: chunk,
			});
		}

		eventEmitter._onQueryComplete.fire();

		webviewView.webview.postMessage({
			command: "done",
			value: null,
		});
	}

	private getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._context.extensionUri,
				"out",
				"index.es.js"
			)
		);

		const codiconsUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._context.extensionUri,
				"node_modules",
				"@vscode/codicons",
				"dist",
				"codicon.css"
			)
		);

		const nonce = getNonce();

		return `<!DOCTYPE html>
        <html lang="en" style="height: 100%">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline';">
			<title>VscOMP</title>
			<link rel="stylesheet" href="${codiconsUri}" nonce="${nonce}">
          </head>
          <body style="height: 100%">
            <div id="root" style="height: 100%"></div>
            <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
          </body>
        </html>`;
	}

	private log = (value: unknown) => {
		loggingProvider.logInfo(JSON.stringify(value ?? ""));
	};
}

function getActiveWorkspace() {
	const defaultWorkspace = "default";

	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		return (
			vscode.workspace.getWorkspaceFolder(activeEditor.document.uri)
				?.name ?? defaultWorkspace
		);
	}

	return vscode.workspace.workspaceFolders?.[0].name ?? defaultWorkspace;
}

function getNonce() {
	let text = "";
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}