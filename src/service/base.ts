import * as vscode from "vscode";
import { Settings } from "../types/Settings";
import { Ollama } from "./ollama/ollama";
import { OpenAI } from "./openai/openai";

export function GetAllSettings(): vscode.WorkspaceConfiguration {
	return vscode.workspace.getConfiguration("VscOMP");
}

export function GetProviderFromSettings(): AIProvider {
	const config = vscode.workspace.getConfiguration("VscOMP");

	const aiProvider = config
		.get<Settings["aiProvider"]>("Provider")
		?.toLocaleLowerCase()
		.trim();

	if (aiProvider === "openai") {
		return new OpenAI();
	}

	return new Ollama();
}

export interface AIProvider {
	clearChatHistory(): void;
	chat(
		prompt: string,
		ragContent: string,
		signal: AbortSignal
	): AsyncGenerator<string>;
	parallelize(
		prompt: string,
		ragContent: string,
		signal: AbortSignal
	): Promise<string>;
}
