import { ChatOpenAI } from "@langchain/openai";
import { MessageGraph, START, END, StateGraph, MemorySaver, StateDefinition } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "langchain/tools";
import { Annotation, } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import {
    GraphEdge, GraphNode, AgentNodeConfig,
    ChatModelConfig, CompiledAgent, AgentSession,
    GraphSchema,
    ToolConfig
} from './types';
import * as env from 'dotenv'
import { Agent } from "http";
import { late } from "zod";
env.config();

// Define our State type
export type StateSchema = {
    messages: BaseMessage[];
    currentNode: string;
    toolCalls: Record<string, any>[];
};

// Define the schema with proper typing
export const StateSchemaDefinition = {
    messages: Annotation<BaseMessage[]>({
        default: () => [],
        reducer: (x: BaseMessage[], y: BaseMessage[] | undefined) => y ? x.concat(y) : x
    }),
    currentNode: Annotation<string>({
        default: () => "alpha",
        reducer: (x: string, y: string | undefined) => y ?? x ?? "alpha"
    }),
    toolCalls: Annotation<Record<string, any>[]>({
        default: () => [],
        reducer: (x: Record<string, any>[], y: Record<string, any>[] | undefined) => y ? x.concat(y) : x
    })
};

export class GraphBuilder {

    private StateSchema = Annotation.Root(StateSchemaDefinition)

    private model: ChatOpenAI;
    private agents: Map<string, CompiledAgent>;

    constructor(defaultModel?: ChatModelConfig) {
        this.agents = new Map();
        this.model = new ChatOpenAI({
            modelName: defaultModel?.model || "gpt-4",
            temperature: defaultModel?.temperature || 0,
            maxTokens: defaultModel?.maxTokens,
        });
    }

    private async buildGraph(schema: GraphSchema): Promise<StateGraph<StateSchema>> {
        const graph = new StateGraph(this.StateSchema);
        let allTools: ToolConfig[] = [];

        for (const node of schema.nodes) {
            if (node.type === 'agent') {
                const agentNode = await this.buildAgentNode(node.id, node.config as AgentNodeConfig);
                graph.addNode(node.id, agentNode);
                if (node.config.functions) {
                    allTools.push(...node.config.functions)
                }
            }
        }
        let tools = this.buildTools(allTools)
        let toolNode = new ToolNode(tools);
        graph.addNode("tool_node", toolNode)

        console.log("[DEBUG] Nodes in the graph:");
        for (const node of schema.nodes) {
            console.log(`[DEBUG] Node ID: ${node.id}, Type: ${node.type}`);
        }

        console.log("[DEBUG] Edges in the graph:");
        for (const edge of schema.edges) {
            console.log(`[DEBUG] Edge from ${edge.source} to ${edge.target}`);
        }
        // Add edges
        for (const edge of schema.edges) {
            if (edge.source === START) {
                //@ts-ignore
                graph.addEdge(START, edge.target);
            } else if (edge.target === END) {
                //@ts-ignore
                graph.addEdge(edge.source, END);
            } else if (edge.condition) {
                graph.addConditionalEdges(
                    //@ts-ignore
                    edge.source,
                    await this.buildConditional(edge.condition),
                    edge.condition.config
                );
            } else {
                //@ts-ignore
                graph.addEdge(edge.source, edge.target);
            }
        }

        return graph;
    }

    private async buildAgentNode(id: string, config: AgentNodeConfig) {
        return async (state: typeof this.StateSchema.State): Promise<Partial<typeof this.StateSchema.State>> => {
            const nodeModel = config.model ? new ChatOpenAI(config.model) : this.model;
            const tools = this.buildTools(config.functions || []);

            // Bind functions if available
            if (tools?.length) {
                const functions = tools.map(tool => convertToOpenAIFunction(tool));
                console.log(`[DEBUG] Binding functions to ${id}:`, functions.map(f => f.name));
                nodeModel.bind({ functions });  // Force function calling
            }

            const prompt = ChatPromptTemplate.fromMessages([
                ["system", config.systemPrompt + "\n\nWhen you need to execute an action, USE THE PROVIDED FUNCTIONS."],
                new MessagesPlaceholder("messages"),
            ]);

            const response = await prompt.pipe(nodeModel).invoke({
                messages: state.messages
            });

            console.log(`[DEBUG] Agent ${id} response:`, {
                content: response.content,
                function_call: response.additional_kwargs?.function_call
            });

            // Check for function calls
            if (response.additional_kwargs?.function_call) {
                const functionCall = response.additional_kwargs.function_call;
                console.log(`[DEBUG] Function call detected:`, functionCall);

                return {
                    messages: [response],
                    currentNode: id,
                    toolCalls: [{
                        tool: functionCall.name,
                        args: JSON.parse(functionCall.arguments)
                    }]
                };
            }

            return {
                messages: [response],
                currentNode: id
            };
        };
    }

    private buildTools(tools: ToolConfig[]): DynamicStructuredTool[] {
        return tools.map(toolConfig => {
            return new DynamicStructuredTool({
                name: toolConfig.function,
                description: toolConfig.description,
                schema: toolConfig.schema,
                func: async (input) => {
                    const result = await toolConfig.handler(input);
                    if (!result.success) {
                        throw new Error(result.error || 'Tool execution failed');
                    }
                    return JSON.stringify(result.data);
                }
            });
        });
    }
    private async buildConditional(condition: { type: 'router', config: Record<string, string> }) {
        return async (state: typeof this.StateSchema.State): Promise<string> => {
            console.log('[DEBUG] Evaluating conditional routing');
            console.log('[DEBUG] State:', state);
            console.log('[DEBUG] Available routes:', condition.config);

            const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
            if (!lastMessage) return Object.keys(condition.config)[0];

            // If there is no function call, then we finish
            if (lastMessage.tool_calls) {
                console.log(`[DEBUG] Found Tool Call ${lastMessage.tool_calls}`);
                return "tool_node";
            }

            // Handle routing commands
            if (lastMessage._getType() === 'ai') {

                const content = lastMessage.content?.toString().toLowerCase().trim();
                console.log(`[DEBUG] Found Content ${content}`);

                // Find matching route ignoring case
                for (const [key, value] of Object.entries(condition.config)) {
                    if (content === key.toLowerCase()) {
                        console.log(`[DEBUG] Found route: ${key} -> ${value}`);
                        return key; // Return the value, not the key
                    }
                }
            }

            return "end";
        };
    }

    // Session management methods
    async createAgent(schema: GraphSchema): Promise<string> {
        const graph = await this.buildGraph(schema);
        const agentId = schema.name + '_' + Date.now();

        this.agents.set(agentId, {
            id: agentId,
            schema: schema,
            graph: graph.compile({
                checkpointer: new MemorySaver()
            }),
            sessions: new Map()
        });

        return agentId;
    }

    async startSession(agentId: string): Promise<string> {
        const agent = this.agents.get(agentId);
        if (!agent) throw new Error(`Agent ${agentId} not found`);

        const sessionId = Date.now().toString();
        agent.sessions.set(sessionId, {
            history: [],
            state: { path: ["alpha"] }
        });

        return sessionId;
    }

    async getSession(agentId: string, sessionId: string): Promise<AgentSession> {
        const agent = this.agents.get(agentId);
        if (!agent) throw new Error(`Agent ${agentId} not found`);

        const session = agent.sessions.get(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        return session;
    }

    async sendMessage(agentId: string, sessionId: string, message: string): Promise<any> {
        const agent = this.agents.get(agentId);
        if (!agent) throw new Error(`Agent ${agentId} not found`);

        const session = agent.sessions.get(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        try {
            // Get existing state with thread_id configuration
            const config = {
                configurable: {
                    thread_id: sessionId  // Using sessionId as thread_id
                }
            };

            const currentState = (await agent.graph.getState(config)).values;
            console.debug("[DEBUG] Current State Values:", currentState);
            const result = await agent.graph.invoke(
                {
                    messages: [...(currentState?.messages || []), new HumanMessage(message)],
                    currentNode: currentState?.currentNode || 'alpha',
                    toolCalls: currentState?.toolCalls || []
                },
                config  // Pass the same config here
            );

            // Update session state
            if (session.state.path) {
                session.state.path.push(result.currentNode);
            }

            return result;
        } catch (error) {
            console.error("[DEBUG] Error in sendMessage:", error);
            throw error;
        }
    }
}