import { BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { AGENT_TEMPLATE, SUPPORT_CONDITIONAL_TEMPLATE_SYSTEM } from "../prompts/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { AIMessage } from "@langchain/core/messages";
import axios from "axios";

export async function constructAgentNode(model: ChatOpenAI, template?: string) {
    async function agent(state: BaseMessage[]) {
        const SYSTEM_TEMPLATE = template || AGENT_TEMPLATE;
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_TEMPLATE],
            new MessagesPlaceholder("messages"),
        ]);

        return prompt.pipe(model).invoke({ messages: state });
    }
    return agent;
}

export async function constructRAGAgentNode(model: ChatOpenAI, template?: string, fileUrl?: string) {
    async function agent(state: BaseMessage[]) {
        const SYSTEM_TEMPLATE = template || AGENT_TEMPLATE;
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_TEMPLATE],
            new MessagesPlaceholder("messages"),
        ]);

        return prompt.pipe(model).invoke({ messages: state });
    }
    return agent;
}


export async function constructConditional(model: ChatOpenAI, outputMapping: Record<string, string>) {
    async function conditional(state: BaseMessage[]) {
        const mostRecentMessage = state[state.length - 1];
        const SYSTEM_TEMPLATE = SUPPORT_CONDITIONAL_TEMPLATE_SYSTEM;
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

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_TEMPLATE],
            new MessagesPlaceholder("messages"),
            ["human", HUMAN_TEMPLATE],
        ]);
        const chain = prompt
            .pipe(model)
            .pipe(new StringOutputParser());
        const rawCategorization = await chain.invoke({ messages: state });

        // Lay out the conditional logic here, given the outputMapping
        for (const category in outputMapping) {
            if (rawCategorization.includes(category)) {
                console.log(`DECIDED ACTION: ${category}`);
                return category;
            }
        }
    }
    return conditional
}

export async function constructToolNode(toolConfig: {
    id: string;
    function?: string;
    apiUrl?: string;
}) {
    async function toolNode(state: BaseMessage[]): Promise<AIMessage> {
        if (toolConfig.function) {
            // Handle local function call
            switch (toolConfig.function) {
                case "processRefund":
                    return new AIMessage("Refund processed!");
                // Add other local functions here
                default:
                    throw new Error(`Unknown function: ${toolConfig.function}`);
            }
        } else if (toolConfig.apiUrl) {
            // Handle API call
            try {
                const response = await axios.post(toolConfig.apiUrl, {
                    // You might want to pass relevant data from the state here
                    data: state[state.length - 1].content
                });
                return new AIMessage(`API call successful: ${JSON.stringify(response.data)}`);
            } catch (error) {
                console.error(`API call failed: ${error}`);
                return new AIMessage("API call failed. Please try again later.");
            }
        } else {
            throw new Error("Tool node must have either a function or an apiUrl");
        }
    }

    return toolNode;
}
