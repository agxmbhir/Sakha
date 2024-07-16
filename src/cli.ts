import { HumanMessage } from '@langchain/core/messages';
import readline, { createInterface } from 'readline';
import { getGraph } from './llm/customer';
import { buildGraph } from './graph/builder';
import { ChatOpenAI } from '@langchain/openai';
import * as env from 'dotenv';
import { processLLMOutput } from "./graph/parser";
import { SAMPLE_LLM_OUTPUT } from "./graph/prompts/sample";
env.config();
let payload;
// Usage example
try {
    const llmOutput = SAMPLE_LLM_OUTPUT;
    payload = processLLMOutput(llmOutput);
    console.log("Parsed the request")
} catch (error) {
    console.error('Failed to process LLM output:', error);
}


export async function getGraphTest() {
    const model = new ChatOpenAI({ modelName: "gpt-4", temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY });
    const graph = await buildGraph(payload, model);
    return graph.compile();
}

async function main() {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const bot = await getGraphTest();

    async function run() {
        rl.question('User:', (input) => {
            let humanMessage = new HumanMessage(input);
            bot.invoke(humanMessage).then((response) => {
                console.log("Bot:", response[response.length - 1].content);
                run();
            });
        });
    }
    run();
}

main();