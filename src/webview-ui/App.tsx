import { useEffect, useState } from "react";
import { VscClearAll } from "react-icons/vsc";
import styled from "styled-components";
import { AppMessage, ChatMessage} from "../types/Message";
import ChatEntry from "./ChatEntry";
import { ChatInput } from "./ChatInput";
import { ChatResponseList } from "./ChatList";
import { localMemState } from "./utilities/localMemState";
import { vscode } from "./utilities/vscode";

const Main = styled.main`
	height: 100%;
	display: flex;
	flex-direction: column;
`;

const ChatToolbar = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

let currentMessage = "";

interface AppState {
	chatHistory: Record<string, ChatMessage[]>;
}

let appState: AppState;
let activeWorkspace: string;

const App = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [activeMessage, setActiveMessage] = useState<
		ChatMessage | undefined
	>();

	useEffect(() => {
		vscode.postMessage({
			command: "ready",
		});
	}, []);

	useEffect(() => {
		if (!appState) {
			return;
		}

		let { chatHistory } = appState;

		if (!chatHistory) {
			chatHistory = {};
		}

		chatHistory[activeWorkspace] = [...messages];

		const updatedState = {
			...appState,
			chatHistory: { ...chatHistory },
		} satisfies AppState;

		vscode.setState(updatedState);
	}, [messages]);

	useEffect(() => {
		window.addEventListener("message", handleResponse);

		return () => {
			window.removeEventListener("message", handleResponse);
		};
	}, []);

	const handleResponse = (event: MessageEvent<AppMessage>) => {
		const { data } = event;
		const { command, value } = data;

		switch (command) {
			case "response":
				if (!value) {
					return;
				}

				currentMessage += value as string;
				setActiveMessage((activeMessage) => {
					return {
						loading: true,
						from: "assistant",
						...activeMessage,
						message: currentMessage,
					} satisfies ChatMessage;
				});
				break;
			case "done":
				commitMessageToHistory();
				break;
			case "context":
				setActiveMessage((activeMessage) => {
					return {
						loading: true,
						from: "assistant",
						...activeMessage,
						message: currentMessage,
					} satisfies ChatMessage;
				});
				break;
			case "init":
				const { workspaceFolder, theme } = value as {
					workspaceFolder: string;
					theme: number;
				};
				localMemState.setState("theme", theme);

				activeWorkspace = workspaceFolder;

				appState = vscode.getState() as AppState;

				const { chatHistory } = appState;

				if (!chatHistory) {
					return;
				}

				if (chatHistory[activeWorkspace]) {
					setMessages(chatHistory[activeWorkspace]);
				}
				break;
			case "setTheme":
				const newTheme = value as number;
				localMemState.setState("theme", newTheme);
		}
	};

	const commitMessageToHistory = () => {
		const tempMessage = structuredClone(currentMessage.toString());
		setMessages((messages) => {
			const newHistory: ChatMessage[] = [
				...messages,
				{
					from: "assistant",
					message: tempMessage,
					loading: false,
				},
			];

			return newHistory;
		});

		clearMessage();
	};

	const cancelAIResponse = () => {
		clearMessage();
		vscode.postMessage({
			command: "cancel",
		});
	};

	const clearMessage = () => {
		setLoading(false);
		setActiveMessage(() => {
			return {
				from: "assistant",
				context: undefined,
				message: "",
				loading: false,
			};
		});

		currentMessage = "";
	};

	const fetchAIResponse = (text: string) => {
		currentMessage = "";

		vscode.postMessage({
			command: "chat",
			value: text,
		});
	};

	const handleChatSubmitted = (input: string) => {
		fetchAIResponse(input);

		setMessages((messages) => [
			...messages,
			{
				from: "user",
				message: input,
				context: undefined,
			},
		]);

		setLoading(true);
	};

	const handleParallelizeSubmitted = () => {
		handleClearChat();
		vscode.postMessage({
			command: "parallelize",
			value: "none",
		});
		setLoading(true);
	};

	const handleClearChat = () => {
		currentMessage = "";
		setActiveMessage(undefined);
		setMessages([]);

		if (activeWorkspace && appState) {
			let { chatHistory } = appState;

			if (!chatHistory) {
				chatHistory = {};
			}

			chatHistory[activeWorkspace] = [];

			vscode.setState({
				...appState,
				chatHistory,
			});
		}

		vscode.postMessage({
			command: "clear",
		});
	};

	return (
		<Main>
			<ChatToolbar>
				<h2>VscOMP</h2>
				<VscClearAll
					size={24}
					role="presentation"
					title="Clear chat history"
					onClick={handleClearChat}
				/>
			</ChatToolbar>
			<ChatResponseList messages={messages}>
				{loading && (
					<ChatEntry
						from="assistant"
						message={activeMessage?.message || ""}
						loading={loading}
					/>
				)}
			</ChatResponseList>
			<ChatInput
				loading={loading}
				onChatSubmitted={handleChatSubmitted}
				onChatCancelled={cancelAIResponse}
				onParallelizeSubmitted={handleParallelizeSubmitted}
			/>
		</Main>
	);
};

export default App;
