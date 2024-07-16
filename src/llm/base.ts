// import * as venom from "venom-bot";
// import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
// import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
// import { HumanMessage, AIMessage } from "@langchain/core/messages";
// import { ChatPromptTemplate } from "@langchain/core/prompts";
// import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
// import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// import { Runnable, type RunnableInterface, RunnableConfig } from "@langchain/core/runnables";
// import { BaseRetriever } from "@langchain/core/retrievers";
// import { pull } from "langchain/hub";
// import * as fs from "fs";
// import { Document } from "@langchain/core/documents";
// import dotenv from "dotenv";
// import { createRetrievalChain } from "langchain/chains/retrieval";
// import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
// import { MessagesPlaceholder } from "@langchain/core/prompts";
// import type { BaseMessage } from "@langchain/core/messages";

// dotenv.config();
// // @ts-ignore
// const model = new ChatOpenAI(("gpt-4"));
// model.apiKey = process.env.OPENAI_API_KEY;

// /*
//  Simple Prompts for Query and Answer 
// */
// const prompt = ChatPromptTemplate.fromMessages([
//     [
//         "system",
//         "Answer the user's questions based in a short and brief manner with only relevant information on the following context: {context}.",
//     ],
//     new MessagesPlaceholder("chat_history"),
//     ["user", "{input}"],
// ]);

// const retrieverPrompt = ChatPromptTemplate.fromMessages([
//     new MessagesPlaceholder("chat_history"),
//     ["user", "{input}"],
//     [
//         "user",
//         "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
//     ],
// ]);


// // Base class for all chatbots. 
// export class BaseChatBot {
//     model: ChatOpenAI;
//     runnable: RunnableInterface;
//     vectorStoreRetriever: BaseRetriever;
//     chats: Chat[] = [];
//     whatsappClient: venom.Whatsapp;
//     prompt: ChatPromptTemplate;
//     retrieverPrompt: ChatPromptTemplate;


//     public constructor(whatsappClient: venom.Whatsapp = null) {
//         this.model = model;
//         this.model.apiKey = process.env.OPENAI_API_KEY;
//         this.prompt = prompt;
//         this.retrieverPrompt = retrieverPrompt;
//         this.whatsappClient = whatsappClient;
//     }

//     new_chat() {
//         const chat = new Chat(this);
//         this.chats.push(chat);
//         return chat;
//     }

//     /*
//       Intialize the retriever with the specified file. 
//     */
//     public async initialize(file: string = "test.txt") {
//         let vectorStoreRetriever
//         if (!this.vectorStoreRetriever) {
//             vectorStoreRetriever = await this.initialize_vector_store_retriever(file);
//         } else {
//             vectorStoreRetriever = this.vectorStoreRetriever;
//         }

//         let model = this.model;
//         const combineDocsChain = await createStuffDocumentsChain({
//             llm: model,
//             prompt: this.prompt,
//         });
//         const history_aware_retriever = await createHistoryAwareRetriever({
//             llm: model,
//             retriever: vectorStoreRetriever,
//             rephrasePrompt: this.retrieverPrompt,
//         });
//         const retrievalChain = await createRetrievalChain({
//             combineDocsChain,
//             retriever: history_aware_retriever,
//         });
//         this.runnable = retrievalChain;
//     }

//     /*
//       Helper function to initialize the vector store.
//      */
//     async initialize_vector_store_retriever(file: string) {
//         const text = fs.readFileSync(`docs/${file}`, "utf8");
//         const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
//         const docs = await textSplitter.createDocuments([text]);

//         const vectorStore = HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());
//         let retriever = (await vectorStore).asRetriever();
//         this.vectorStoreRetriever = retriever;
//         return retriever;
//     }
// }


// /*
//     a class to manage the chat history and the chatbot.
// */
// export class Chat {
//     history: BaseMessage[] = [];
//     ChatBot: BaseChatBot;
//     private runnable: RunnableInterface;

//     constructor(bot: BaseChatBot) {
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

