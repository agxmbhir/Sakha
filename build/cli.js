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
exports.getGraphTest = void 0;
const messages_1 = require("@langchain/core/messages");
const readline_1 = require("readline");
const builder_1 = require("./graph/builder");
const openai_1 = require("@langchain/openai");
const env = __importStar(require("dotenv"));
const parser_1 = require("./graph/parser");
const sample_1 = require("./graph/prompts/sample");
env.config();
let payload;
// Usage example
try {
    const llmOutput = sample_1.SAMPLE_LLM_OUTPUT;
    payload = (0, parser_1.processLLMOutput)(llmOutput);
    console.log("Parsed the request");
}
catch (error) {
    console.error('Failed to process LLM output:', error);
}
async function getGraphTest() {
    const model = new openai_1.ChatOpenAI({ modelName: "gpt-4", temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY });
    const graph = await (0, builder_1.buildGraph)(payload, model);
    return graph.compile();
}
exports.getGraphTest = getGraphTest;
async function main() {
    const rl = (0, readline_1.createInterface)({
        input: process.stdin,
        output: process.stdout
    });
    const bot = await getGraphTest();
    async function run() {
        rl.question('User:', (input) => {
            let humanMessage = new messages_1.HumanMessage(input);
            bot.invoke(humanMessage).then((response) => {
                console.log("Bot:", response[response.length - 1].content);
                run();
            });
        });
    }
    run();
}
main();
