import {
	VSCodeButton,
	VSCodeDivider,
	VSCodeDropdown,
	VSCodeOption,
} from "@vscode/webview-ui-toolkit/react";
import { useState } from "react";
import {
	AiProvidersList,
	defaultOllamaSettings,
	defaultOpenAISettings,
} from "../types/Settings";
import { InitSettings } from "./App";
import { ActionPanel, Container, DropDownContainer, VSCodeTextField } from "./Config.styles";
import { OllamaSettingsView } from "./OllamaSettingsView";
import { OpenAISettingsView } from "./OpenAISettingsView";
import { vscode } from "./utilities/vscode";

export const AiProvider = ({
	aiProvider,
	ollama,
	openai,
	ollamaModels,
}: InitSettings) => {
	const [currentAiProvider, setAiProvider] = useState(aiProvider);
	const [ollamaSettings, setOllamaSettings] = useState(
		ollama ?? defaultOllamaSettings
	);
	const [openAISettings, setOpenAISettings] = useState(
		openai ?? defaultOpenAISettings
	);
	const handleProviderChange = (e: any) => {
		setAiProvider(e.target.value);
	};

	const cancel = () => {
		setAiProvider(aiProvider);
		switch (currentAiProvider) {
			case "Ollama":
				setOllamaSettings(ollama ?? defaultOllamaSettings);
				break;
			case "OpenAI":
				setOpenAISettings(openai ?? defaultOpenAISettings);
				break;
		}
	};

	const reset = () => {
		switch (currentAiProvider) {
			case "Ollama":
				setOllamaSettings(defaultOllamaSettings);
				break;
			case "OpenAI":
				setOpenAISettings(defaultOpenAISettings);
				break;
		}
	};

	const handleClick = () => {
		if (currentAiProvider === "Ollama") {
			vscode.postMessage({
				command: "updateAndSetOllama",
				value: ollamaSettings,
			});
			return;
		}

		if (currentAiProvider === "OpenAI") {
			vscode.postMessage({
				command: "updateAndSetOpenAI",
				value: openAISettings,
			});
			return;
		}
	};

	return (
		<Container>
			<DropDownContainer>
				<label htmlFor="ai-provider">AI Provider:</label>
				<VSCodeDropdown
					id="ai-provider"
					value={currentAiProvider}
					onChange={handleProviderChange}
					style={{ minWidth: "100%" }}
				>
					{AiProvidersList.map((ab) => (
						<VSCodeOption key={ab}>{ab}</VSCodeOption>
					))}
				</VSCodeDropdown>
			</DropDownContainer>

			<VSCodeDivider />
			{currentAiProvider === "Ollama" && (
				<OllamaSettingsView
					{...ollamaSettings}
					ollamaModels={ollamaModels}
					onChange={setOllamaSettings}
				/>
			)}
			{currentAiProvider === "OpenAI" && (
				<OpenAISettingsView
					{...openAISettings}
					onChange={setOpenAISettings}
				/>
			)}
			<ActionPanel>
				<VSCodeButton onClick={handleClick}>Save</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={cancel}>
					Cancel
				</VSCodeButton>
				<VSCodeButton appearance="secondary" onClick={reset}>
					Reset
				</VSCodeButton>
			</ActionPanel>
		</Container>
	);
};
