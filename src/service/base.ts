import * as vscode from "vscode";
import { loggingProvider } from "../providers/loggingProvider";
import { InteractionSettings, Settings } from "../types/Settings";
import { Ollama } from "./ollama/ollama";
import { OpenAI } from "./openai/openai";

export function GetAllSettings(): vscode.WorkspaceConfiguration {
	return vscode.workspace.getConfiguration("VscOMP");
}

export function GetInteractionSettings(): InteractionSettings {
	const config = vscode.workspace.getConfiguration("VscOMP");

	const interactionSettings = config.get<Settings["interactionSettings"]>(
		"InteractionSettings"
	)!;

	if (interactionSettings) {
		return interactionSettings;
	}

	return {
		codeMaxTokens: -1,
		chatContextWindow: 4096,
		chatMaxTokens: 4096,
	};
}

export function GetProviderFromSettings(): AIProvider {
	const config = vscode.workspace.getConfiguration("VscOMP");

	const aiProvider = config
		.get<Settings["aiProvider"]>("Provider")
		?.toLocaleLowerCase()
		.trim();

	loggingProvider.logInfo(`AI Provider: ${aiProvider} found.`);

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
