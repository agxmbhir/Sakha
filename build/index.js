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
const mongodb_1 = require("mongodb");
env.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// In-memory storage for active workflows and conversations
const activeWorkflows = {};
const conversations = {};
const mongodb = new mongodb_1.MongoClient(process.env.MONGODB_URI || " ", {
    serverApi: {
        version: mongodb_1.ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
// Connect to MongoDB
let db;
async function connectToMongoDB() {
    try {
        const client = await mongodb.connect();
        db = client.db("Sakha");
        console.log("Connected to MongoDB");
        await mongodb.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    catch (error) {
        console.error("Failed to connect to MongoDB", error);
        process.exit(1);
    }
}
connectToMongoDB();
exports.workflowPrompt = generator_1.GENERATOR_PROMPT;
const gpt = new openai_2.default();
const model = new openai_1.ChatOpenAI({ modelName: "gpt-4", temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY });
app.post('/create', async (req, res) => {
    try {
        const { useCase } = req.body;
        if (!useCase) {
            return res.status(400).json({ error: 'Use case is required' });
        }
        const completion = await gpt.chat.completions.create({
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
        const payload = (0, parser_1.processLLMOutput)(llmOutput || '');
        const graph = await (0, builder_1.buildGraph)(payload, model).catch((error) => {
            console.error('Try Again, Failed to build graph:', error);
            return null;
        });
        const workflowId = (0, uuid_1.v4)();
        // Save payload to MongoDB
        if (db) {
            const authColl = db.collection("auth");
            await authColl.insertOne({ workflowId, payload });
        }
        else {
            console.error('Database not connected');
        }
        res.json({ workflowId, payload });
    }
    catch (error) {
        console.error('Error in create endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/load/:workflowId', async (req, res) => {
    try {
        const { workflowId } = req.params;
        // Check if the workflow is already loaded
        if (activeWorkflows[workflowId]) {
            return res.json({ message: 'Workflow already loaded' });
        }
        // Fetch the workflow from MongoDB
        const storedWorkflow = await db.collection('workflows').findOne({ workflowId });
        if (!storedWorkflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        // Build the graph and store it in memory
        const graph = await (0, builder_1.buildGraph)(storedWorkflow.payload, model);
        activeWorkflows[workflowId] = { graph, payload: storedWorkflow.payload };
        conversations[workflowId] = [];
        res.json({ message: 'Workflow loaded successfully' });
    }
    catch (error) {
        console.error('Error in load endpoint:', error);
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
        const workflow = activeWorkflows[workflowId];
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not loaded. Please load the workflow first.' });
        }
        // Retrieve the conversation history
        let conversation = conversations[workflowId];
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
// Memory management: Unload inactive workflows
const INACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes
setInterval(() => {
    const now = Date.now();
    Object.keys(activeWorkflows).forEach(workflowId => {
        var _a;
        const lastActivity = ((_a = conversations[workflowId]) === null || _a === void 0 ? void 0 : _a.length) > 0
            ? conversations[workflowId][conversations[workflowId].length - 1].timestamp
            : now;
        if (now - lastActivity > INACTIVITY_THRESHOLD) {
            delete activeWorkflows[workflowId];
            delete conversations[workflowId];
            console.log(`Unloaded inactive workflow: ${workflowId}`);
        }
    });
}, 5 * 60 * 1000); // Check every 5 minutes
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// Graceful shutdown
process.on('SIGINT', async () => {
    await mongodb.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});
