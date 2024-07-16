"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructToolNode = exports.constructConditional = exports.constructRAGAgentNode = exports.constructAgentNode = void 0;
const prompts_1 = require("@langchain/core/prompts");
const prompts_2 = require("@langchain/core/prompts");
const prompts_3 = require("../prompts/prompts");
const output_parsers_1 = require("@langchain/core/output_parsers");
const messages_1 = require("@langchain/core/messages");
const axios_1 = __importDefault(require("axios"));
async function constructAgentNode(model, template) {
    async function agent(state) {
        const SYSTEM_TEMPLATE = template || prompts_3.AGENT_TEMPLATE;
        const prompt = prompts_1.ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_TEMPLATE],
            new prompts_2.MessagesPlaceholder("messages"),
        ]);
        return prompt.pipe(model).invoke({ messages: state });
    }
    return agent;
}
exports.constructAgentNode = constructAgentNode;
async function constructRAGAgentNode(model, template, fileUrl) {
    async function agent(state) {
        const SYSTEM_TEMPLATE = template || prompts_3.AGENT_TEMPLATE;
        const prompt = prompts_1.ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_TEMPLATE],
            new prompts_2.MessagesPlaceholder("messages"),
        ]);
        return prompt.pipe(model).invoke({ messages: state });
    }
    return agent;
}
exports.constructRAGAgentNode = constructRAGAgentNode;
async function constructConditional(model, outputMapping) {
    async function conditional(state) {
        const mostRecentMessage = state[state.length - 1];
        const SYSTEM_TEMPLATE = prompts_3.SUPPORT_CONDITIONAL_TEMPLATE_SYSTEM;
        // Dynamically generate the HUMAN_TEMPLATE based on outputMapping
        let routingInstructions = Object.entries(outputMapping)
            .map(([key, value]) => `Depending on the user's request, route the user to the optimal team.
            if want to route the user to the ${value} team, respond only with the word "${key}".`)
            .join('\n');
        const HUMAN_TEMPLATE = `The previous conversation is an interaction between a customer support representative and a user.
Extract whether the representative is routing the user to a specific team, or whether they are just responding conversationally.
 ${routingInstructions}
Otherwise, respond only with the word "RESPOND".
Remember, only respond with one of the above words.`;
        const prompt = prompts_1.ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_TEMPLATE],
            new prompts_2.MessagesPlaceholder("messages"),
            ["human", HUMAN_TEMPLATE],
        ]);
        const chain = prompt
            .pipe(model)
            .pipe(new output_parsers_1.StringOutputParser());
        const rawCategorization = await chain.invoke({ messages: state });
        // Lay out the conditional logic here, given the outputMapping
        for (const category in outputMapping) {
            if (rawCategorization.includes(category)) {
                console.log(`DECIDED ACTION: ${category}`);
                return category;
            }
        }
    }
    return conditional;
}
exports.constructConditional = constructConditional;
async function constructToolNode(toolConfig) {
    async function toolNode(state) {
        if (toolConfig.function) {
            // Handle local function call
            switch (toolConfig.function) {
                case "processRefund":
                    return new messages_1.AIMessage("Refund processed!");
                // Add other local functions here
                default:
                    throw new Error(`Unknown function: ${toolConfig.function}`);
            }
        }
        else if (toolConfig.apiUrl) {
            // Handle API call
            try {
                const response = await axios_1.default.post(toolConfig.apiUrl, {
                    // You might want to pass relevant data from the state here
                    data: state[state.length - 1].content
                });
                return new messages_1.AIMessage(`API call successful: ${JSON.stringify(response.data)}`);
            }
            catch (error) {
                console.error(`API call failed: ${error}`);
                return new messages_1.AIMessage("API call failed. Please try again later.");
            }
        }
        else {
            throw new Error("Tool node must have either a function or an apiUrl");
        }
    }
    return toolNode;
}
exports.constructToolNode = constructToolNode;
