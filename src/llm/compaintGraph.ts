
// import {
//     AIMessage,
//     BaseMessage,
//     FunctionMessage,
// } from "@langchain/core/messages";
// import { ChatPromptTemplate } from "@langchain/core/prompts";
// import { ChatOpenAI } from "@langchain/openai";
// import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
// import { get_vector_store_retriever } from "./utils";
// import { createRetrieverTool } from "langchain/tools/retriever";
// import { ToolExecutor } from "@langchain/langgraph/prebuilt";
// import { END, MessageGraph, START } from "@langchain/langgraph";
// import { MessagesPlaceholder } from "@langchain/core/prompts";
// import { StringOutputParser } from "@langchain/core/output_parsers";
// import { DynamicStructuredTool } from "langchain/tools";
// import { z } from "zod";
// import * as env from "dotenv";
// env.config();

// export async function complaintGraph() {
//     console.log("Open ai", process.env.OPENAI_API_KEY);
//     const model = new ChatOpenAI({ modelName: "gpt-4", temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY });

//     const complaintManagerTool = new DynamicStructuredTool({
//         name: "Customer_Complaint_Manager",
//         description: "A tool used to register customer complaints and send them to the responsible person while notifying the admin.",
//         schema: z.object({
//             complaint: z.string(),
//             admin: z.string(),
//             stakeHolderPhone: z.string(),
//             compaineePhone: z.string(),
//         }),

//         func: async (input) =>
//             await submit_complaint(input.complaint, input.admin, input.stakeHolderPhone, input.compaineePhone),
//     });

//     const retriever = await get_vector_store_retriever("test.txt");
//     const queryRetrievalTool = createRetrieverTool(
//         retriever,
//         {
//             name: "Query relevant information",
//             description:
//                 "Search and return information about the general information about the Rasoi Indane Gas Agency.",
//         },
//     );

//     const employee_db = await get_vector_store_retriever("employee.txt");
//     const employeeRetrieverTool = createRetrieverTool(
//         employee_db,
//         {
//             name: "Employee Information",
//             description:
//                 "Search and return information about the employees and their responsibilities of the Rasoi Indane Gas Agency.",
//         },
//     );

//     const tools = [queryRetrievalTool, complaintManagerTool, employeeRetrieverTool];
//     const functions = tools.map((tool) => convertToOpenAIFunction(tool));

//     const queryRetrievalToolExecutor = new ToolExecutor({
//         tools: [queryRetrievalTool],
//     });
//     const complaintManagerToolExecutor = new ToolExecutor({
//         tools: [complaintManagerTool],
//     });
//     const employeeRetrieverToolExecutor = new ToolExecutor({
//         tools: [employeeRetrieverTool],
//     });

//     model.bind({
//         functions
//     })


//     async function submit_complaint(complaint: string, admin: string, stakeHolderPhone: string, compaineePhone: string): Promise<any> {
//         // if (!client) {
//         //     return "Complaint registered successfully";
//         // }
//         //     await client.sendText(stakeHolderPhone, `A new complaint has been registered: ${complaint} 
//         // and the compainee's phone number is ${compaineePhone}`).then((result) => {
//         //         console.log("Result: ", result); //return object success
//         //     }).catch((error) => { return error; });

//         //     await client.sendText(admin, `A new complaint has been registered: ${complaint}
//         //  and the stakeholder's phone number is ${stakeHolderPhone}
//         //   and the compainee's phone number is ${compaineePhone}`).then((result) => {
//         //         console.log("Result: ", result); //return object success
//         //     }).then((error) => { return error; });

//         return [new AIMessage("Complaint registered successfully!")];
//     }


//     const toolExecutor = new ToolExecutor({
//         tools,
//     });
//     /* 
//       Simple Agent as the initial entry point for the chatbot.
//     */
//     async function agent(state: Array<BaseMessage>) {
//         console.log("---CALL AGENT---");
//         const SYSTEM_PROMPT = `
//         You are a customer support agent for Rasoi Indane Gas Agency. Your job is to respond to the user's query, register a complaint, or have a conversation with the user.
//         For the user's query, you can query the relevant information by generating a search query to look up in order to get information relevant to the conversation.
//         For the complaint, you can register a complaint by generating the complaint parameters and then registering the complaint.
//         For the conversation, you can simply have a conversation with the user.
//         `
//         const response = await model.invoke(state);
//         // We can return just the response because it will be appended to the state.
//         return [response];
//     }

//     /*
//         Decides the action to be taken based on the last message in the state.
//     */
//     async function decide_action(state: Array<BaseMessage>): Promise<any> {
//         console.log("---CALL DECIDE ACTION---");
//         const lastMessage = state[state.length - 1];
//         const SYSTEM_PROMPT = `
//            You are a customer support router for Rasoi Indane Gas Agency. Your job is to decide whether the customer support agent should 
//             query relevant information to respond to the user's query 
//             OR 
//             register a complaint by first generating the complaint parameters and then registering the complaint
//             OR
//             Just simply have a conversation with the user.
//         `
//         const HUMAN_PROMPT = `
//            The Previous conversation is an interaction between the user and customer support agent. Extract whether the user has queried for relevant information 
//            or wants to register a complaint. 

//            if the user has queried for relevant information, respond only with the world "QUERY"
//            if the user wants to register a complaint, respond only with the world "COMPLAINT"
//            if the user is just having a conversation, respond only with the world "RESPOND"
//         `

//         const prompt = ChatPromptTemplate.fromMessages([
//             ["system", SYSTEM_PROMPT],
//             new MessagesPlaceholder("message"),
//             ["human", HUMAN_PROMPT]
//         ]);

//         const chain = prompt.pipe(model).pipe(new StringOutputParser());
//         let raw = await chain.invoke({ message: state });
//         if (raw.includes("QUERY")) {
//             console.log("DECIDED ACTION: QUERY");
//             return "query";
//         } else if (raw.includes("COMPLAINT")) {
//             console.log("DECIDED ACTION: COMPLAINT");
//             return "complaint";
//         } else {
//             console.log("DECIDED ACTION: RESPOND");
//             return "respond";
//         }
//     }

//     async function querySupport(state: Array<BaseMessage>): Promise<any[]> {
//         console.log("---CALL QUERY RELEVANT INFORMATION---");
//         // Based on the continue condition
//         // we know the last message involves a function call.
//         const lastMessage = state[state.length - 1];
//         const action = {
//             tool: lastMessage.additional_kwargs.function_call?.name ?? "",
//             toolInput: JSON.parse(
//                 lastMessage.additional_kwargs.function_call?.arguments ?? "{}",
//             ),
//         };
//         // We call the tool_executor and get back a response.
//         const response = await queryRetrievalTool.invoke(action);
//         // We use the response to create a FunctionMessage.
//         return [response];
//     }


//     async function get_complaint_params(state: Array<BaseMessage>): Promise<any[]> {
//         console.log("---CALL GET COMPLAINT PARAMS---");
//         const lastMessage = state[state.length - 1];
//         const action = {
//             tool: lastMessage.additional_kwargs.function_call?.name ?? "",
//             toolInput: JSON.parse(
//                 lastMessage.additional_kwargs.function_call?.arguments ?? "{}",
//             ),
//         };
//         // We call the tool_executor and get back a response.
//         const response = await complaintManagerTool.invoke(action);
//         // We use the response to create a FunctionMessage.
//         return [response];
//     }

//     async function instagram() {

//     }

//     { }
//     // Compiling the graph; 
//     let workflow = new MessageGraph()
//         .addNode("agent", agent)
//         .addNode("querySupport", querySupport)
//         .addNode("get_complaint_params", get_complaint_params)
//         .addNode("register_complaint", complaintManagerToolExecutor)

//     workflow.addEdge(START, "agent");
//     workflow.addConditionalEdges(
//         'agent',
//         decide_action,
//         {
//             query: 'querySupport',
//             complaint: 'get_complaint_params',
//             respond: END,
//         }
//     )
//     workflow.addEdge("get_complaint_params", "register_complaint");
//     workflow.addEdge("register_complaint", END);
//     workflow.addEdge("querySupport", END);

//     console.log("GRAPH", workflow);
//     let graph = workflow.compile();

//     return graph;
// }