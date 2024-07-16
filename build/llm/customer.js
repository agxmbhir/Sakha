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
exports.getGraph = void 0;
const openai_1 = require("@langchain/openai");
const env = __importStar(require("dotenv"));
env.config();
const langgraph_1 = require("@langchain/langgraph");
const prompts_1 = require("@langchain/core/prompts");
const prompts_2 = require("@langchain/core/prompts");
const prompts_3 = require("../graph/prompts/prompts");
const messages_1 = require("@langchain/core/messages");
const output_parsers_1 = require("@langchain/core/output_parsers");
const model = new openai_1.ChatOpenAI({ modelName: "gpt-4", temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY });
async function getGraph() {
    const graph = new langgraph_1.MessageGraph()
        .addNode("agent", agent)
        .addNode("billingSupport", billingSupport)
        .addNode("technicalSupport", technicalSupport)
        .addNode("refundTool", refundTool);
    graph.addEdge(langgraph_1.START, "agent");
    graph.addConditionalEdges("agent", supportConditional, {
        billing: "billingSupport",
        technical: "technicalSupport",
        conversational: langgraph_1.END,
    });
    graph.addEdge("technicalSupport", langgraph_1.END);
    graph.addConditionalEdges("billingSupport", refundCondtional, {
        refund: "refundTool",
        end: langgraph_1.END,
    });
    graph.addEdge("refundTool", langgraph_1.END);
    console.log("Graph", graph.branches);
    const runnable = graph.compile();
    return runnable;
}
exports.getGraph = getGraph;
async function agent(state) {
    const SYSTEM_TEMPLATE = prompts_3.AGENT_TEMPLATE;
    const prompt = prompts_1.ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_TEMPLATE],
        new prompts_2.MessagesPlaceholder("messages"),
    ]);
    return prompt.pipe(model).invoke({ messages: state });
}
async function billingSupport(state) {
    const SYSTEM_TEMPLATE = prompts_3.BILLING_SUPPORT_TEMPLATE;
    let messages = state;
    // Make the user's question the most recent message in the history.
    // This helps small models stay focused.
    if (messages[messages.length - 1]._getType() === "ai") {
        messages = state.slice(0, -1);
    }
    const prompt = prompts_1.ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_TEMPLATE],
        new prompts_2.MessagesPlaceholder("messages"),
    ]);
    return prompt.pipe(model).invoke({ messages });
}
async function technicalSupport(state) {
    const SYSTEM_TEMPLATE = prompts_3.TECHNICAL_SUPPORT_TEMPLATE;
    let messages = state;
    // Make the user's question the most recent message in the history.
    // This helps small models stay focused.
    if (messages[messages.length - 1]._getType() === "ai") {
        messages = state.slice(0, -1);
    }
    const prompt = prompts_1.ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_TEMPLATE],
        new prompts_2.MessagesPlaceholder("messages"),
    ]);
    return prompt.pipe(model).invoke({ messages });
}
async function supportConditional(state) {
    const mostRecentMessage = state[state.length - 1];
    const SYSTEM_TEMPLATE = prompts_3.SUPPORT_CONDITIONAL_TEMPLATE_SYSTEM;
    const HUMAN_TEMPLATE = prompts_3.SUPPORT_CONDITIONAL_TEMPLATE_HUMAN;
    const prompt = prompts_1.ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_TEMPLATE],
        new prompts_2.MessagesPlaceholder("messages"),
        ["human", HUMAN_TEMPLATE],
    ]);
    const chain = prompt
        .pipe(model)
        .pipe(new output_parsers_1.StringOutputParser());
    const rawCategorization = await chain.invoke({ messages: state });
    if (rawCategorization.includes("BILLING")) {
        return "billing";
    }
    else if (rawCategorization.includes("TECHNICAL")) {
        return "technical";
    }
    else {
        return "conversational";
    }
}
async function refundCondtional(state) {
    const mostRecentMessage = state[state.length - 1];
    const SYSTEM_TEMPLATE = prompts_3.REFUND_CONDITIONAL_TEMPLATE_SYSTEM;
    const HUMAN_TEMPLATE = prompts_3.REFUND_CONDITIONAL_TEMPLATE_HUMAN;
    const prompt = prompts_1.ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_TEMPLATE],
        ["human", HUMAN_TEMPLATE],
    ]);
    const chain = prompt
        .pipe(model)
        .pipe(new output_parsers_1.StringOutputParser());
    const response = await chain.invoke({ text: mostRecentMessage.content });
    if (response.includes("REFUND")) {
        return "refund";
    }
    else {
        return "end";
    }
}
async function refundTool(state) {
    return new messages_1.AIMessage("Refund processed!");
}
