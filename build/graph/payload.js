"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerSupportPayload = exports.NodeType = void 0;
const langgraph_1 = require("@langchain/langgraph");
const prompts_1 = require("../graph/prompts/prompts");
var NodeType;
(function (NodeType) {
    NodeType["AGENT"] = "agent";
    NodeType["TOOL"] = "tool";
    NodeType["CONDITIONAL"] = "conditional";
})(NodeType = exports.NodeType || (exports.NodeType = {}));
exports.customerSupportPayload = {
    nodes: [
        {
            id: "agent",
            type: NodeType.AGENT,
            prompt: prompts_1.AGENT_TEMPLATE
        },
        {
            id: "billingSupport",
            type: NodeType.AGENT,
            prompt: prompts_1.BILLING_SUPPORT_TEMPLATE
        },
        {
            id: "technicalSupport",
            type: NodeType.AGENT,
            prompt: prompts_1.TECHNICAL_SUPPORT_TEMPLATE
        },
        {
            id: "refundTool",
            type: NodeType.TOOL,
            function: "processRefund"
        }
    ],
    edges: [
        { source: langgraph_1.START, target: "agent" },
        {
            source: "agent", target: "supportConditional", condition: {
                billing: "billingSupport",
                technical: "technicalSupport",
                conversational: langgraph_1.END,
            }
        },
        {
            source: "billingSupport", target: "refundConditional",
            condition: {
                refund: "refundTool",
                conversation: langgraph_1.END
            }
        },
        { source: "technicalSupport", target: langgraph_1.END },
        { source: "refundTool", target: langgraph_1.END }
    ]
};
console.log(JSON.stringify(exports.customerSupportPayload, null, 2));
