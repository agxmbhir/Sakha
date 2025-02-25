"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const builder_1 = require("./builder");
const examples_1 = require("./examples");
const readline_1 = __importDefault(require("readline"));
async function agentCLI() {
    // Initialize readline interface
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    // Initialize agent
    const builder = new builder_1.GraphBuilder({
        model: "gpt-4",
        temperature: 0
    });
    console.log("Initializing agent...");
    const agentId = await builder.createAgent(examples_1.complexSchema);
    const sessionId = await builder.startSession(agentId);
    console.log("Agent ready! Type 'exit' to quit, 'history' to see conversation history, 'path' to see current path\n");
    // Function to display conversation history
    async function showHistory() {
        const session = await builder.getSession(agentId, sessionId);
        console.log("\n=== Conversation History ===");
        session.history.forEach((msg, i) => {
            console.log(`${msg._getType()}: ${msg.content.toString}`);
        });
        console.log("===========================\n");
    }
    async function askQuestion() {
        rl.question('You: ', async (input) => {
            try {
                if (input.toLowerCase() === 'exit') {
                    rl.close();
                    return;
                }
                if (input.toLowerCase() === 'history') {
                    await showHistory();
                    askQuestion();
                    return;
                }
                if (input.toLowerCase() === 'path') {
                    const session = await builder.getSession(agentId, sessionId);
                    console.log('\nPath taken:', session.state.path.join(" -> "));
                    askQuestion();
                    return;
                }
                const response = await builder.sendMessage(agentId, sessionId, input);
                console.log('\nAgent:', response);
                // Show path after each message
                const session = await builder.getSession(agentId, sessionId);
                console.log('\nPath taken:', session.state.path.join(" -> "));
                console.log(); // Empty line for readability
                askQuestion();
            }
            catch (error) {
                console.error('Error:', error);
                askQuestion();
            }
        });
    }
    // Start the interaction
    askQuestion();
}
// Run the test
// Run the CLI
console.log("Starting Retail Support Agent CLI...");
agentCLI().catch(console.error);
