import { Payload, NodeType } from './payload';
import { z } from 'zod';
// Define a schema for validation
const NodeSchema = z.object({
    id: z.string(),
    type: z.enum([NodeType.AGENT, NodeType.TOOL]),
    prompt: z.string().optional(),
    function: z.string().optional(),
    apiUrl: z.string().optional(),
    fileUrl: z.string().optional(),
});

const EdgeSchema = z.object({
    source: z.string(),
    target: z.string(),
    condition: z.record(z.string(), z.string()).optional(), // Figure this out
});

const PayloadSchema = z.object({
    nodes: z.array(NodeSchema),
    edges: z.array(EdgeSchema),
});

function extractJsonPayload(llmOutput: string): string {
    // Find the JSON payload in the LLM's output
    const jsonStart = llmOutput.indexOf('%') + 1;
    const jsonEnd = llmOutput.lastIndexOf('%') - 1;
    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No valid JSON found in the output');
    }
    return llmOutput.slice(jsonStart, jsonEnd + 1);
}

function validateAndConstructPayload(jsonString: string): Payload {
    try {
        const parsedJson = JSON.parse(jsonString);
        console.log('Parsed JSON:', parsedJson);
        const validatedPayload = PayloadSchema.parse(parsedJson);

        // Convert the validated payload to our Payload type
        const payload: Payload = {
            nodes: validatedPayload.nodes.map(node => ({
                ...node,
                type: node.type as NodeType, // This cast is safe because we've validated with zod
            })),
            edges: validatedPayload.edges,
        };

        return payload;
    } catch (error) {
        console.error('Error validating or constructing payload:', error);
        throw error;
    }
}

export function processLLMOutput(llmOutput: string): Payload {
    const jsonPayload = extractJsonPayload(llmOutput);
    console.log('Extracted JSON:', jsonPayload);
    return validateAndConstructPayload(jsonPayload);
}

