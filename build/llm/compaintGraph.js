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
exports.complaintGraph = void 0;
const messages_1 = require("@langchain/core/messages");
const prompts_1 = require("@langchain/core/prompts");
const openai_1 = require("@langchain/openai");
const function_calling_1 = require("@langchain/core/utils/function_calling");
const utils_1 = require("./utils");
const retriever_1 = require("langchain/tools/retriever");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const langgraph_1 = require("@langchain/langgraph");
const prompts_2 = require("@langchain/core/prompts");
const output_parsers_1 = require("@langchain/core/output_parsers");
const tools_1 = require("langchain/tools");
const zod_1 = require("zod");
const env = __importStar(require("dotenv"));
env.config();
async function complaintGraph() {
    console.log("Open ai", process.env.OPENAI_API_KEY);
    const model = new openai_1.ChatOpenAI({ modelName: "gpt-4", temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY });
    const complaintManagerTool = new tools_1.DynamicStructuredTool({
        name: "Customer_Complaint_Manager",
        description: "A tool used to register customer complaints and send them to the responsible person while notifying the admin.",
        schema: zod_1.z.object({
            complaint: zod_1.z.string(),
            admin: zod_1.z.string(),
            stakeHolderPhone: zod_1.z.string(),
            compaineePhone: zod_1.z.string(),
        }),
        func: async (input) => await submit_complaint(input.complaint, input.admin, input.stakeHolderPhone, input.compaineePhone),
    });
    const retriever = await (0, utils_1.get_vector_store_retriever)("test.txt");
    const queryRetrievalTool = (0, retriever_1.createRetrieverTool)(retriever, {
        name: "Query relevant information",
        description: "Search and return information about the general information about the Rasoi Indane Gas Agency.",
    });
    const employee_db = await (0, utils_1.get_vector_store_retriever)("employee.txt");
    const employeeRetrieverTool = (0, retriever_1.createRetrieverTool)(employee_db, {
        name: "Employee Information",
        description: "Search and return information about the employees and their responsibilities of the Rasoi Indane Gas Agency.",
    });
    const tools = [queryRetrievalTool, complaintManagerTool, employeeRetrieverTool];
    const functions = tools.map((tool) => (0, function_calling_1.convertToOpenAIFunction)(tool));
    const queryRetrievalToolExecutor = new prebuilt_1.ToolExecutor({
        tools: [queryRetrievalTool],
    });
    const complaintManagerToolExecutor = new prebuilt_1.ToolExecutor({
        tools: [complaintManagerTool],
    });
    const employeeRetrieverToolExecutor = new prebuilt_1.ToolExecutor({
        tools: [employeeRetrieverTool],
    });
    model.bind({
        functions
    });
    async function submit_complaint(complaint, admin, stakeHolderPhone, compaineePhone) {
        // if (!client) {
        //     return "Complaint registered successfully";
        // }
        //     await client.sendText(stakeHolderPhone, `A new complaint has been registered: ${complaint} 
        // and the compainee's phone number is ${compaineePhone}`).then((result) => {
        //         console.log("Result: ", result); //return object success
        //     }).catch((error) => { return error; });
        //     await client.sendText(admin, `A new complaint has been registered: ${complaint}
        //  and the stakeholder's phone number is ${stakeHolderPhone}
        //   and the compainee's phone number is ${compaineePhone}`).then((result) => {
        //         console.log("Result: ", result); //return object success
        //     }).then((error) => { return error; });
        return [new messages_1.AIMessage("Complaint registered successfully!")];
    }
    const toolExecutor = new prebuilt_1.ToolExecutor({
        tools,
    });
    /*
      Simple Agent as the initial entry point for the chatbot.
    */
    async function agent(state) {
        console.log("---CALL AGENT---");
        const SYSTEM_PROMPT = `
        You are a customer support agent for Rasoi Indane Gas Agency. Your job is to respond to the user's query, register a complaint, or have a conversation with the user.
        For the user's query, you can query the relevant information by generating a search query to look up in order to get information relevant to the conversation.
        For the complaint, you can register a complaint by generating the complaint parameters and then registering the complaint.
        For the conversation, you can simply have a conversation with the user.
        `;
        const response = await model.invoke(state);
        // We can return just the response because it will be appended to the state.
        return [response];
    }
    /*
        Decides the action to be taken based on the last message in the state.
    */
    async function decide_action(state) {
        console.log("---CALL DECIDE ACTION---");
        const lastMessage = state[state.length - 1];
        const SYSTEM_PROMPT = `
           You are a customer support router for Rasoi Indane Gas Agency. Your job is to decide whether the customer support agent should 
            query relevant information to respond to the user's query 
            OR 
            register a complaint by first generating the complaint parameters and then registering the complaint
            OR
            Just simply have a conversation with the user.
        `;
        const HUMAN_PROMPT = `
           The Previous conversation is an interaction between the user and customer support agent. Extract whether the user has queried for relevant information 
           or wants to register a complaint. 

           if the user has queried for relevant information, respond only with the world "QUERY"
           if the user wants to register a complaint, respond only with the world "COMPLAINT"
           if the user is just having a conversation, respond only with the world "RESPOND"
        `;
        const prompt = prompts_1.ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_PROMPT],
            new prompts_2.MessagesPlaceholder("message"),
            ["human", HUMAN_PROMPT]
        ]);
        const chain = prompt.pipe(model).pipe(new output_parsers_1.StringOutputParser());
        let raw = await chain.invoke({ message: state });
        if (raw.includes("QUERY")) {
            console.log("DECIDED ACTION: QUERY");
            return "query";
        }
        else if (raw.includes("COMPLAINT")) {
            console.log("DECIDED ACTION: COMPLAINT");
            return "complaint";
        }
        else {
            console.log("DECIDED ACTION: RESPOND");
            return "respond";
        }
    }
    async function querySupport(state) {
        var _a, _b, _c, _d;
        console.log("---CALL QUERY RELEVANT INFORMATION---");
        // Based on the continue condition
        // we know the last message involves a function call.
        const lastMessage = state[state.length - 1];
        const action = {
            tool: (_b = (_a = lastMessage.additional_kwargs.function_call) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
            toolInput: JSON.parse((_d = (_c = lastMessage.additional_kwargs.function_call) === null || _c === void 0 ? void 0 : _c.arguments) !== null && _d !== void 0 ? _d : "{}"),
        };
        // We call the tool_executor and get back a response.
        const response = await queryRetrievalTool.invoke(action);
        // We use the response to create a FunctionMessage.
        return [response];
    }
    async function get_complaint_params(state) {
        var _a, _b, _c, _d;
        console.log("---CALL GET COMPLAINT PARAMS---");
        const lastMessage = state[state.length - 1];
        const action = {
            tool: (_b = (_a = lastMessage.additional_kwargs.function_call) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
            toolInput: JSON.parse((_d = (_c = lastMessage.additional_kwargs.function_call) === null || _c === void 0 ? void 0 : _c.arguments) !== null && _d !== void 0 ? _d : "{}"),
        };
        // We call the tool_executor and get back a response.
        const response = await complaintManagerTool.invoke(action);
        // We use the response to create a FunctionMessage.
        return [response];
    }
    async function instagram() {
    }
    { }
    // Compiling the graph; 
    let workflow = new langgraph_1.MessageGraph()
        .addNode("agent", agent)
        .addNode("querySupport", querySupport)
        .addNode("get_complaint_params", get_complaint_params)
        .addNode("register_complaint", complaintManagerToolExecutor);
    workflow.addEdge(langgraph_1.START, "agent");
    workflow.addConditionalEdges('agent', decide_action, {
        query: 'querySupport',
        complaint: 'get_complaint_params',
        respond: langgraph_1.END,
    });
    workflow.addEdge("get_complaint_params", "register_complaint");
    workflow.addEdge("register_complaint", langgraph_1.END);
    workflow.addEdge("querySupport", langgraph_1.END);
    console.log("GRAPH", workflow);
    let graph = workflow.compile();
    return graph;
}
exports.complaintGraph = complaintGraph;
