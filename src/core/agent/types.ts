import { BaseMessage } from "@langchain/core/messages";
import { START, END, StateGraph, CompiledStateGraph, StateDefinition, StateType } from "@langchain/langgraph";
import { z } from "zod";
import { StateSchema, StateSchemaDefinition } from "./builder";

// Basic model config
export interface ChatModelConfig {
    model: string;
    temperature: number;
    maxTokens?: number;
}

// Tool result interface
export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
}

// Tool configuration 
export interface ToolConfig {
    function: string;
    description: string;
    schema: z.ZodObject<any>;
    handler: (input: any) => Promise<ToolResult>;
}

// Config for agent nodes
export interface AgentNodeConfig {
    systemPrompt: string;
    model?: ChatModelConfig;
    functions?: ToolConfig[]; // Functions available to this agent
}

// Edge configuration
export interface GraphEdge {
    source: typeof START | string;
    target: typeof END | string;
    condition?: {
        type: 'router';
        config: Record<string, string>;
    };
}

// Node definition - can be agent or tool
export interface GraphNode {
    id: string;
    type: 'agent' | 'tool';
    config: AgentNodeConfig
}

// Main schema definition
export interface GraphSchema {
    name: string;
    description?: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
}

// Runtime types
export interface AgentSession {
    history: BaseMessage[];
    state: {
        path: string[];
        [key: string]: any;
    };
}

export interface CompiledAgent {
    id: string;
    schema: GraphSchema;
    graph: CompiledStateGraph<StateSchema, Partial<StateSchema>, typeof START, StateDefinition, StateDefinition, StateDefinition>;
    sessions: Map<string, AgentSession>;
}