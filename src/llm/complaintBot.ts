// import { ChatPromptTemplate } from '@langchain/core/prompts';
// import { DynamicStructuredTool } from '@langchain/core/tools';
// import { createRetrieverTool } from 'langchain/tools/retriever';
// import { createToolCallingAgent, AgentExecutor, initializeAgentExecutorWithOptions, } from "langchain/agents";
// import { ChainTool } from 'langchain/tools';
// import * as venom from 'venom-bot';
// import { z } from 'zod';
// import { HumanMessage, AIMessage } from "@langchain/core/messages";
// import type { BaseMessage } from "@langchain/core/messages";
// import { BaseRetriever } from "@langchain/core/retrievers";
// import { MessagesPlaceholder } from "@langchain/core/prompts";
// import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
// import { createHistoryAwareRetriever } from 'langchain/chains/history_aware_retriever';
// import { createRetrievalChain } from 'langchain/chains/retrieval';
// import { Runnable, type RunnableInterface, RunnableConfig } from "@langchain/core/runnables";
// import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
// import * as fs from 'fs';
// import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
// import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
// import { BaseChatBot } from './base';
// // @ts-ignore
// const model = new ChatOpenAI(("gpt-4"));
// model.apiKey = process.env.OPENAI_API_KEY;

// export const complaintBotPrompt = ChatPromptTemplate.fromMessages([
//     [
//         "system",
//         `Answer the user's questions based in a short and brief manner with only relevant information on the following context make sure the answer is really brief
//         and also register the user's complaints and sending them to the responsible person while notifying the admin. 
//         {context}
//         To register a complaint, ask the user for confirmation and then send the complaint to the responsible person while notifying the admin.
//         Find the responsible employee for the complaint from the Employee_and_responsibility_retriever_tool
//           `,
//     ],
//     new MessagesPlaceholder("chat_history"),
//     // Add agent scratchpad
//     ["ai", "{agent_scratchpad}"],
//     ["user", "{input}"],
// ]);

// export class ComplaintBot {
//     runnable: RunnableInterface;
//     vectorStoreRetriever: BaseRetriever;
//     chats: Chat[] = [];
//     whatsappClient: venom.Whatsapp;
//     model: ChatOpenAI;

//     public constructor(whatsappClient: venom.Whatsapp = null) {
//         this.whatsappClient = whatsappClient;
//         this.model = model;
//         this.model.apiKey = process.env.OPENAI_API_KEY;
//         this.whatsappClient = whatsappClient;
//     };


//     public async initialize(file: string = "test.txt") {
//     }


//     new_chat() {
//         if (!this.runnable) {
//             this.initialize();
//         }
//         const chat = new Chat(this);
//         console.log("Runnable: ", this.runnable);
//         chat.setRunnable(this.runnable); // Ensure the chat uses the correct runnable
//         this.chats.push(chat);
//         return chat;
//     }

//     /*
//     Helper function to initialize the vector store.
//    */
//     async initialize_vector_store_retriever(file: string) {
//         const text = fs.readFileSync(`docs/${file}`, "utf8");
//         const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
//         const docs = await textSplitter.createDocuments([text]);

//         const vectorStore = HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());
//         let retriever = (await vectorStore).asRetriever();
//         this.vectorStoreRetriever = retriever;
//         return retriever;
//     }


//     /**
//      * A function to construct the complaint manager tool.
//      */

//     private get_complaint_manager_tool(): DynamicStructuredTool {
//         let complaint_manager_tool = new DynamicStructuredTool({
//             name: "Customer_Complaint_Manager",
//             description: "A tool used to register customer complaints and send them to the responsible person while notifying the admin.",
//             schema: z.object({
//                 complaint: z.string(),
//                 admin: z.string(),
//                 stakeHolderPhone: z.string(),
//                 compaineePhone: z.string(),
//             }),
//             func: async (input) =>
//                 await submit_complaint(this.whatsappClient, input.complaint, input.admin, input.stakeHolderPhone, input.compaineePhone),
//         });
//         return complaint_manager_tool;
//     }
// }

// /* 
//    A function to submit a complaint to the responsible person and notify the admin.
// */
// async function submit_complaint(client: venom.Whatsapp, complaint: string, admin: string, stakeHolderPhone: string, compaineePhone: string): Promise<string> {
//     if (!client) {
//         return "Complaint registered successfully";
//     }
//     await client.sendText(stakeHolderPhone, `A new complaint has been registered: ${complaint} 
//     and the compainee's phone number is ${compaineePhone}`).then((result) => {
//         console.log("Result: ", result); //return object success
//     }).catch((error) => { return error; });

//     await client.sendText(admin, `A new complaint has been registered: ${complaint}
//      and the stakeholder's phone number is ${stakeHolderPhone}
//       and the compainee's phone number is ${compaineePhone}`).then((result) => {
//         console.log("Result: ", result); //return object success
//     }).then((error) => { return error; });

//     return "Complaint registered successfully!";
// }


// export class Chat {
//     history: BaseMessage[] = [];
//     ChatBot: ComplaintBot;
//     private runnable: RunnableInterface;

//     constructor(bot: ComplaintBot) {
//         this.ChatBot = bot;
//         this.runnable = bot.runnable; // Default to bot's runnable
//     }

//     setRunnable(runnable: RunnableInterface) {
//         this.runnable = runnable;
//     }

//     public async get_response(input: string) {
//         const response = await this.runnable.invoke({
//             input: input,
//             chat_history: this.history,
//         });
//         this.history.push(new HumanMessage(input));
//         this.history.push(new AIMessage(response));
//         console.log(response);
//         return response;
//     }
// }
