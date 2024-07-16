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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowPrompt = void 0;
const express_1 = __importDefault(require("express"));
const parser_1 = require("./graph/parser");
const uuid_1 = require("uuid");
const builder_1 = require("./graph/builder");
const openai_1 = require("@langchain/openai");
const env = __importStar(require("dotenv"));
const openai_2 = __importDefault(require("openai"));
const generator_1 = require("./graph/prompts/generator");
env.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// In-memory storage for workflows and conversations
const workflows = {};
const conversations = {};
exports.workflowPrompt = generator_1.GENERATOR_PROMPT;
const client = new openai_2.default();
app.post('/create', async (req, res) => {
    try {
        const { useCase } = req.body;
        if (!useCase) {
            return res.status(400).json({ error: 'Use case is required' });
        }
        const completion = await client.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: exports.workflowPrompt },
                { role: "user", content: useCase }
            ],
            temperature: 0,
        });
        if (!completion.choices || completion.choices.length === 0) {
            return res.status(500).json({ error: 'Failed to generate workflow' });
        }
        const llmOutput = completion.choices[0].message.content;
        console.log('LLM Output:', llmOutput);
        const payload = (0, parser_1.processLLMOutput)(llmOutput || '');
        const model = new openai_1.ChatOpenAI({ modelName: "gpt-4", temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY });
        const graph = await (0, builder_1.buildGraph)(payload, model);
        const workflowId = (0, uuid_1.v4)();
        workflows[workflowId] = { graph, payload };
        conversations[workflowId] = [];
        res.json({ workflowId, payload });
    }
    catch (error) {
        console.error('Error in create endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/interact/:workflowId', async (req, res) => {
    try {
        const { workflowId } = req.params;
        const { message } = req.body;
        if (!workflowId || !message) {
            return res.status(400).json({ error: 'Workflow ID and message are required' });
        }
        const workflow = workflows[workflowId];
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        // Retrieve the conversation history
        let conversation = conversations[workflowId];
        if (!conversation) {
            conversation = [];
            conversations[workflowId] = conversation;
        }
        // Add the new message to the conversation
        conversation.push({ role: 'user', content: message });
        // Process the message through the workflow
        const result = await workflow.graph.invoke({ messages: conversation });
        // Add the response to the conversation history
        conversation.push({ role: 'assistant', content: result.content });
        res.json({ response: result.content });
    }
    catch (error) {
        console.error('Error in interact endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
