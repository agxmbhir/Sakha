"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processLLMOutput = void 0;
const payload_1 = require("./payload");
const zod_1 = require("zod");
// Define a schema for validation
const NodeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum([payload_1.NodeType.AGENT, payload_1.NodeType.TOOL]),
    prompt: zod_1.z.string().optional(),
    function: zod_1.z.string().optional(),
    apiUrl: zod_1.z.string().optional(),
    fileUrl: zod_1.z.string().optional(),
});
const EdgeSchema = zod_1.z.object({
    source: zod_1.z.string(),
    target: zod_1.z.string(),
    condition: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(), // Figure this out
});
const PayloadSchema = zod_1.z.object({
    nodes: zod_1.z.array(NodeSchema),
    edges: zod_1.z.array(EdgeSchema),
});
function extractJsonPayload(llmOutput) {
    // Find the JSON payload in the LLM's output
    const jsonStart = llmOutput.indexOf('%') + 1;
    const jsonEnd = llmOutput.lastIndexOf('%') - 1;
    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No valid JSON found in the output');
    }
    return llmOutput.slice(jsonStart, jsonEnd + 1);
}
function validateAndConstructPayload(jsonString) {
    try {
        const parsedJson = JSON.parse(jsonString);
        console.log('Parsed JSON:', parsedJson);
        const validatedPayload = PayloadSchema.parse(parsedJson);
        // Convert the validated payload to our Payload type
        const payload = {
            nodes: validatedPayload.nodes.map(node => (Object.assign(Object.assign({}, node), { type: node.type }))),
            edges: validatedPayload.edges,
        };
        return payload;
    }
    catch (error) {
        console.error('Error validating or constructing payload:', error);
        throw error;
    }
}
function processLLMOutput(llmOutput) {
    const jsonPayload = extractJsonPayload(llmOutput);
    console.log('Extracted JSON:', jsonPayload);
    return validateAndConstructPayload(jsonPayload);
}
exports.processLLMOutput = processLLMOutput;
