import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import * as env from "dotenv";
env.config();
import { END, MessageGraph, START } from "@langchain/langgraph"
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { AGENT_TEMPLATE, BILLING_SUPPORT_TEMPLATE, REFUND_CONDITIONAL_TEMPLATE_HUMAN, REFUND_CONDITIONAL_TEMPLATE_SYSTEM, SUPPORT_CONDITIONAL_TEMPLATE_HUMAN, SUPPORT_CONDITIONAL_TEMPLATE_SYSTEM, TECHNICAL_SUPPORT_TEMPLATE } from "../graph/prompts/prompts";
import { AIMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
const model = new ChatOpenAI({ modelName: "gpt-4", temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY });

export async function getGraph() {
    const graph = new MessageGraph()
        .addNode("agent", agent)
        .addNode("billingSupport", billingSupport)
        .addNode("technicalSupport", technicalSupport)
        .addNode("refundTool", refundTool);

    graph.addEdge(START, "agent");
    graph.addConditionalEdges(
        "agent",
        supportConditional,
        {
            billing: "billingSupport",
            technical: "technicalSupport",
            conversational: END,
        },

    );
    graph.addEdge("technicalSupport", END);
    graph.addConditionalEdges(
        "billingSupport",
        refundCondtional,
        {
            refund: "refundTool",
            end: END,
        },
    );
    graph.addEdge("refundTool", END);
    console.log("Graph", graph.branches);
    const runnable = graph.compile();
    return runnable;
}

async function agent(state: BaseMessage[]) {
    const SYSTEM_TEMPLATE = AGENT_TEMPLATE;
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_TEMPLATE],
        new MessagesPlaceholder("messages"),
    ]);

    return prompt.pipe(model).invoke({ messages: state });
}

async function billingSupport(state: BaseMessage[]) {
    const SYSTEM_TEMPLATE = BILLING_SUPPORT_TEMPLATE;
    let messages = state;
    // Make the user's question the most recent message in the history.
    // This helps small models stay focused.
    if (messages[messages.length - 1]._getType() === "ai") {
        messages = state.slice(0, -1);
    }

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_TEMPLATE],
        new MessagesPlaceholder("messages"),
    ]);
    return prompt.pipe(model).invoke({ messages });
}

async function technicalSupport(state: BaseMessage[]) {
    const SYSTEM_TEMPLATE = TECHNICAL_SUPPORT_TEMPLATE;

    let messages = state;
    // Make the user's question the most recent message in the history.
    // This helps small models stay focused.
    if (messages[messages.length - 1]._getType() === "ai") {
        messages = state.slice(0, -1);
    }

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_TEMPLATE],
        new MessagesPlaceholder("messages"),
    ]);
    return prompt.pipe(model).invoke({ messages });
}

async function supportConditional(state: BaseMessage[]) {
    const mostRecentMessage = state[state.length - 1];
    const SYSTEM_TEMPLATE = SUPPORT_CONDITIONAL_TEMPLATE_SYSTEM;
    const HUMAN_TEMPLATE = SUPPORT_CONDITIONAL_TEMPLATE_HUMAN;
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_TEMPLATE],
        new MessagesPlaceholder("messages"),
        ["human", HUMAN_TEMPLATE],
    ]);
    const chain = prompt
        .pipe(model)
        .pipe(new StringOutputParser());
    const rawCategorization = await chain.invoke({ messages: state });
    if (rawCategorization.includes("BILLING")) {
        return "billing";
    } else if (rawCategorization.includes("TECHNICAL")) {
        return "technical";
    } else {
        return "conversational";
    }
}

async function refundCondtional(state: BaseMessage[]) {
    const mostRecentMessage = state[state.length - 1];
    const SYSTEM_TEMPLATE = REFUND_CONDITIONAL_TEMPLATE_SYSTEM;
    const HUMAN_TEMPLATE = REFUND_CONDITIONAL_TEMPLATE_HUMAN;
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_TEMPLATE],
        ["human", HUMAN_TEMPLATE],
    ]);
    const chain = prompt
        .pipe(model)
        .pipe(new StringOutputParser());
    const response = await chain.invoke({ text: mostRecentMessage.content });
    if (response.includes("REFUND")) {
        return "refund";
    } else {
        return "end";
    }
}

async function refundTool(state: BaseMessage[]) {

    return new AIMessage("Refund processed!");
}


