"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphBuilder = exports.StateSchemaDefinition = void 0;
const openai_1 = require("@langchain/openai");
const langgraph_1 = require("@langchain/langgraph");
const prompts_1 = require("@langchain/core/prompts");
const prompts_2 = require("@langchain/core/prompts");
const messages_1 = require("@langchain/core/messages");
const tools_1 = require("langchain/tools");
const langgraph_2 = require("@langchain/langgraph");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const function_calling_1 = require("@langchain/core/utils/function_calling");
const env = __importStar(require("dotenv"));
env.config();
// Define the schema with proper typing
exports.StateSchemaDefinition = {
    messages: (0, langgraph_2.Annotation)({
        default: () => [],
        reducer: (x, y) => y ? x.concat(y) : x
    }),
    currentNode: (0, langgraph_2.Annotation)({
        default: () => 'alpha',
        reducer: (x, y) => { var _a; return (_a = y !== null && y !== void 0 ? y : x) !== null && _a !== void 0 ? _a : "alpha"; }
    }),
    toolCalls: (0, langgraph_2.Annotation)({
        default: () => [],
        reducer: (x, y) => y ? x.concat(y) : x
    })
};
class GraphBuilder {
    constructor(defaultModel) {
        this.StateSchema = langgraph_2.Annotation.Root(exports.StateSchemaDefinition);
        this.agents = new Map();
        this.model = new openai_1.ChatOpenAI({
            modelName: (defaultModel === null || defaultModel === void 0 ? void 0 : defaultModel.model) || "gpt-4",
            temperature: (defaultModel === null || defaultModel === void 0 ? void 0 : defaultModel.temperature) || 0,
            maxTokens: defaultModel === null || defaultModel === void 0 ? void 0 : defaultModel.maxTokens,
        });
    }
    async buildGraph(schema) {
        const graph = new langgraph_1.StateGraph(this.StateSchema);
        let allTools = [];
        for (const node of schema.nodes) {
            if (node.type === 'agent') {
                const agentNode = await this.buildAgentNode(node.id, node.config);
                graph.addNode(node.id, agentNode);
                if (node.config.functions) {
                    allTools.push(...node.config.functions);
                }
            }
        }
        let tools = this.buildTools(allTools);
        let toolNode = new prebuilt_1.ToolNode(tools);
        graph.addNode("tool_node", toolNode);
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
            if (edge.source === langgraph_1.START) {
                //@ts-ignore
                graph.addEdge(langgraph_1.START, edge.target);
            }
            else if (edge.target === langgraph_1.END) {
                //@ts-ignore
                graph.addEdge(edge.source, langgraph_1.END);
            }
            else if (edge.condition) {
                graph.addConditionalEdges(
                //@ts-ignore
                edge.source, await this.buildConditional(edge.condition), edge.condition.config);
            }
            else {
                //@ts-ignore
                graph.addEdge(edge.source, edge.target);
            }
        }
        return graph;
    }
    // private async buildAgentNode(id: string, config: AgentNodeConfig) {
    //     return async (state: typeof this.StateSchema.State): Promise<Partial<typeof this.StateSchema.State>> => {
    //         const nodeModel = config.model ? new ChatOpenAI(config.model) : this.model;
    //         const tools = this.buildTools(config.functions || []);
    //         if (tools?.length) {
    //             const functions = tools.map(tool => convertToOpenAIFunction(tool));
    //             console.log(`[DEBUG] Binding functions to ${id}:`, functions.map(f => f.name));
    //             // Force the model to use function calling
    //             nodeModel.bind({
    //                 functions,
    //                 function_call: { name: functions[0].name }
    //             });
    //             const enhancedPrompt = ChatPromptTemplate.fromMessages([
    //                 ["system", `${config.systemPrompt}\n\n` +
    //                     `You MUST use the provided functions via function calls.\n` +
    //                     `Do not write out function calls as text.\n` +
    //                     `Do not describe function calls.\n` +
    //                     `Use the function calling API directly.\n`
    //                 ],
    //                 new MessagesPlaceholder("messages"),
    //             ]);
    //             const response = await enhancedPrompt.pipe(nodeModel).invoke({
    //                 messages: state.messages
    //             });
    //             console.log(`[DEBUG] Agent ${id} response:`, {
    //                 content: response.content,
    //                 function_call: response.additional_kwargs?.function_call
    //             });
    //             // Check for function calls
    //             if (response.additional_kwargs?.function_call) {
    //                 const functionCall = response.additional_kwargs.function_call;
    //                 return {
    //                     messages: [response],
    //                     currentNode: id,
    //                     toolCalls: [{
    //                         tool: functionCall.name,
    //                         toolInput: JSON.parse(functionCall.arguments)
    //                     }]
    //                 };
    //             }
    //             return {
    //                 messages: [response],
    //                 currentNode: id
    //             };
    //         } else {
    //             // Original logic for nodes without functions
    //             const prompt = ChatPromptTemplate.fromMessages([
    //                 ["system", config.systemPrompt],
    //                 new MessagesPlaceholder("messages"),
    //             ]);
    //             const response = await prompt.pipe(nodeModel).invoke({
    //                 messages: state.messages
    //             });
    //             return {
    //                 messages: [response],
    //                 currentNode: id
    //             };
    //         }
    //     };
    // }
    async buildAgentNode(id, config) {
        return async (state) => {
            var _a;
            const nodeModel = config.model ? new openai_1.ChatOpenAI(config.model) : this.model;
            const tools = this.buildTools(config.functions || []);
            if (tools === null || tools === void 0 ? void 0 : tools.length) {
                console.log(`[DEBUG] Building agent node ${id} with ${tools.length} tools`);
                console.log(`[DEBUG] Available tools:`, tools.map(t => ({
                    name: t.name,
                    schema: t.schema,
                    description: t.description
                })));
                const functions = tools.map(tool => (0, function_calling_1.convertToOpenAIFunction)(tool));
                console.log(`[DEBUG] Converted functions:`, functions.map(f => ({
                    name: f.name,
                    parameters: f.parameters,
                    description: f.description
                })));
                // Force function calling for nodes with functions
                const modelWithForcedFunctions = nodeModel.bindTools(tools);
                const enhancedPrompt = prompts_1.ChatPromptTemplate.fromMessages([
                    ["system", `${config.systemPrompt || ""}\n\n` +
                            `You MUST use the available functions to complete your task.\n` +
                            `Use ONLY the functions provided.\n` +
                            `Format outputs as specific function calls.\n` +
                            `DO NOT provide explanations, just call the function.\n` +
                            `Available functions: ${functions.map(f => f.name).join(', ')}\n`
                    ],
                    new prompts_2.MessagesPlaceholder("messages"),
                ]);
                console.log(`[DEBUG] Invoking model with new message:`, state.messages[state.messages.length - 1]);
                const response = await enhancedPrompt.pipe(modelWithForcedFunctions).invoke({
                    messages: state.messages
                });
                // Check for function calls
                if ((_a = response.additional_kwargs) === null || _a === void 0 ? void 0 : _a.tool_calls) {
                    const toolCalls = response.additional_kwargs.tool_calls;
                    return {
                        messages: [response],
                        currentNode: id,
                        toolCalls: toolCalls
                    };
                }
                console.log(`[DEBUG] No tool calls found in response, returning regular message`);
                return {
                    messages: [response],
                    currentNode: id
                };
            }
            else {
                console.log(`[DEBUG] Node ${id} has no tools configured`);
                // For nodes without functions, use original prompt
                const prompt = prompts_1.ChatPromptTemplate.fromMessages([
                    ["system", config.systemPrompt || ""],
                    new prompts_2.MessagesPlaceholder("messages"),
                ]);
                const response = await prompt.pipe(nodeModel).invoke({
                    messages: state.messages
                });
                return {
                    messages: [response],
                    currentNode: id
                };
            }
        };
    }
    buildTools(tools) {
        return tools.map(toolConfig => {
            return new tools_1.DynamicStructuredTool({
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
    async buildConditional(condition) {
        return async (state) => {
            var _a;
            console.log('[DEBUG] Evaluating conditional routing');
            console.log('[DEBUG] Current Node State:', state.currentNode);
            console.log('[DEBUG] Available routes:', condition.config);
            const lastMessage = state.messages[state.messages.length - 1];
            if (!lastMessage)
                return Object.keys(condition.config)[0];
            // Check for tool calls in the state
            if (lastMessage.additional_kwargs.tool_calls) {
                console.log(`[DEBUG] Found Tool Calls, routing to tool_node:`);
                return "tool_node";
            }
            // Handle routing commands
            if (lastMessage._getType() === 'ai') {
                const content = (_a = lastMessage.content) === null || _a === void 0 ? void 0 : _a.toString().toLowerCase().trim();
                console.log(`[DEBUG] Found Content ${content}`);
                // Find matching route ignoring case
                for (const [key, value] of Object.entries(condition.config)) {
                    if (content === key.toLowerCase()) {
                        console.log(`[DEBUG] Found route: ${key} -> ${value}`);
                        return key.toLowerCase(); // Return the value, not the key
                    }
                }
            }
            return "end";
        };
    }
    // Session management methods
    async createAgent(schema) {
        const graph = await this.buildGraph(schema);
        const agentId = schema.name + '_' + Date.now();
        this.agents.set(agentId, {
            id: agentId,
            schema: schema,
            graph: graph.compile({
                checkpointer: new langgraph_1.MemorySaver()
            }),
            sessions: new Map()
        });
        return agentId;
    }
    async startSession(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent)
            throw new Error(`Agent ${agentId} not found`);
        const sessionId = Date.now().toString();
        agent.sessions.set(sessionId, {
            history: [],
            state: { path: ["alpha"] }
        });
        return sessionId;
    }
    async getSession(agentId, sessionId) {
        const agent = this.agents.get(agentId);
        if (!agent)
            throw new Error(`Agent ${agentId} not found`);
        const session = agent.sessions.get(sessionId);
        if (!session)
            throw new Error(`Session ${sessionId} not found`);
        return session;
    }
    async sendMessage(agentId, sessionId, message) {
        const agent = this.agents.get(agentId);
        if (!agent)
            throw new Error(`Agent ${agentId} not found`);
        const session = agent.sessions.get(sessionId);
        if (!session)
            throw new Error(`Session ${sessionId} not found`);
        try {
            // Get existing state with thread_id configuration
            const config = {
                configurable: {
                    thread_id: sessionId // Using sessionId as thread_id
                }
            };
            const currentState = (await agent.graph.getState(config)).values;
            let currentStateExists = currentState ? true : false;
            console.log(`[DEBUG] Does the currentState exist ${currentStateExists}`);
            console.debug("[DEBUG] Current State Values:", currentState === null || currentState === void 0 ? void 0 : currentState.currentNode);
            console.log("Finding the current state values.");
            const result = await agent.graph.invoke({
                messages: [...((currentState === null || currentState === void 0 ? void 0 : currentState.messages) || []), new messages_1.HumanMessage(message)],
                currentNode: (currentState === null || currentState === void 0 ? void 0 : currentState.currentNode) || 'alpha',
                toolCalls: (currentState === null || currentState === void 0 ? void 0 : currentState.toolCalls) || []
            }, config // Pass the same config here
            );
            // Update session state
            if (session.state.path) {
                session.state.path.push(result.currentNode);
            }
            return result;
        }
        catch (error) {
            console.error("[DEBUG] Error in sendMessage:", error);
            throw error;
        }
    }
}
exports.GraphBuilder = GraphBuilder;
