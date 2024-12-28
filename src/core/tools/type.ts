// tools/types.ts
import { z } from "zod";
import { BaseMessage } from "@langchain/core/messages";

export interface ToolContext {
    messages: BaseMessage[];
    state: Record<string, any>;
}

export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
}

export interface BaseTool {
    name: string;
    description: string;
    schema: z.ZodObject<any>;
    handler: (input: any, context?: ToolContext) => Promise<ToolResult>;
}

