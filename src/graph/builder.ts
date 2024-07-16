import { MessageGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { Payload, NodeType, Node, Edge } from './payload';
import {
    constructAgentNode,
    constructRAGAgentNode,
    constructConditional,
    constructToolNode
} from './nodes/node';


export async function buildGraph(payload: Payload, model: ChatOpenAI): Promise<MessageGraph> {
    const graph = new MessageGraph();
    const conditionals: Node[][] = [[]]
    // Create nodes
    for (const node of payload.nodes) {
        let constructedNode;
        switch (node.type) {
            case NodeType.AGENT:
                if (node.fileUrl) {
                    constructedNode = await constructRAGAgentNode(model, node.prompt, node.fileUrl);
                } else {
                    constructedNode = await constructAgentNode(model, node.prompt);
                }
                graph.addNode(node.id, constructedNode);
                break;
            case NodeType.TOOL:
                constructedNode = await constructToolNode({
                    id: node.id,
                    function: node.function,
                    apiUrl: node.apiUrl
                });
                graph.addNode(node.id, constructedNode);
                break;
        }
    }

    // Add edges
    for (const edge of payload.edges) {
        if (edge.source === START) {
            // @ts-ignore: Langgraph doesn't construct the types correctly. 
            graph.addEdge(START, edge.target);
        } else if (edge.target === END) {
            // @ts-ignore: Langgraph doesn't construct the types correctly. 
            graph.addEdge(edge.source, END);
        } else if (edge.condition) {
            // @ts-ignore: Langgraph doesn't construct the types correctly.
            let conditional = await constructConditional(
                model,
                edge.condition
            )
            // @ts-ignore: Langgraph doesn't construct the types correctly.
            graph.addConditionalEdges(edge.source, conditional, edge.condition);
        } else {
            // @ts-ignore: Langgraph doesn't construct the types correctly. 
            graph.addEdge(edge.source, edge.target);
        }
    }

    console.log(graph.branches);
    return graph;
}