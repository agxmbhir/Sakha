import { END, START } from "@langchain/langgraph";
import {
    AGENT_TEMPLATE,
    BILLING_SUPPORT_TEMPLATE,
    TECHNICAL_SUPPORT_TEMPLATE,
} from "../graph/prompts/prompts";


export enum NodeType {
    AGENT = "agent",
    TOOL = "tool",
    CONDITIONAL = "conditional"
}

export type Node = {
    id: string;
    type: NodeType;
    prompt?: string;         // For AGENT and CONDITIONAL
    fileUrl?: string;        // For AGENT (turns it into a RAG node)
    function?: string;       // For TOOL
    apiUrl?: string;         // For TOOL (turns it into an API call)
}

export type Edge = {
    source: string;
    target: string;
    condition?: Record<string, string>;
}

export type Payload = {
    nodes: Node[];
    edges: Edge[];
}


export const customerSupportPayload: Payload = {
    nodes: [
        {
            id: "agent",
            type: NodeType.AGENT,
            prompt: AGENT_TEMPLATE
        },
        {
            id: "billingSupport",
            type: NodeType.AGENT,
            prompt: BILLING_SUPPORT_TEMPLATE
        },
        {
            id: "technicalSupport",
            type: NodeType.AGENT,
            prompt: TECHNICAL_SUPPORT_TEMPLATE
        },
        {
            id: "refundTool",
            type: NodeType.TOOL,
            function: "processRefund"
        }
    ],
    edges: [
        { source: START, target: "agent" },
        {
            source: "agent", target: "supportConditional", condition:
            {
                billing: "billingSupport",
                technical: "technicalSupport",
                conversational: END,
            }
        },
        {
            source: "billingSupport", target: "refundConditional",
            condition:
            {
                refund: "refundTool",
                conversation: END
            }
        },
        { source: "technicalSupport", target: END },
        { source: "refundTool", target: END }
    ]
};

console.log(JSON.stringify(customerSupportPayload, null, 2));