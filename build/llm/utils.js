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
exports.get_vector_store_retriever = void 0;
const text_splitter_1 = require("langchain/text_splitter");
const fs = __importStar(require("fs"));
const hnswlib_1 = require("@langchain/community/vectorstores/hnswlib");
const openai_1 = require("@langchain/openai");
async function get_vector_store_retriever(file) {
    const text = fs.readFileSync(`docs/${file}`, "utf8");
    const textSplitter = new text_splitter_1.RecursiveCharacterTextSplitter({ chunkSize: 1000 });
    const docs = await textSplitter.createDocuments([text]);
    const vectorStore = hnswlib_1.HNSWLib.fromDocuments(docs, new openai_1.OpenAIEmbeddings());
    let retriever = (await vectorStore).asRetriever();
    return retriever;
}
exports.get_vector_store_retriever = get_vector_store_retriever;
