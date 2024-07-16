import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as fs from "fs";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "@langchain/openai";


export async function get_vector_store_retriever(file: string) {
    const text = fs.readFileSync(`docs/${file}`, "utf8");
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
    const docs = await textSplitter.createDocuments([text]);

    const vectorStore = HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());
    let retriever = (await vectorStore).asRetriever();
    return retriever;
}