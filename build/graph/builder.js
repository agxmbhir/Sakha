"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGraph = void 0;
const langgraph_1 = require("@langchain/langgraph");
const payload_1 = require("./payload");
const node_1 = require("./nodes/node");
async function buildGraph(payload, model) {
    const graph = new langgraph_1.MessageGraph();
    const conditionals = [[]];
    // Create nodes
    for (const node of payload.nodes) {
        let constructedNode;
        switch (node.type) {
            case payload_1.NodeType.AGENT:
                if (node.fileUrl) {
                    constructedNode = await (0, node_1.constructRAGAgentNode)(model, node.prompt, node.fileUrl);
                }
                else {
                    constructedNode = await (0, node_1.constructAgentNode)(model, node.prompt);
                }
                graph.addNode(node.id, constructedNode);
                break;
            case payload_1.NodeType.TOOL:
                constructedNode = await (0, node_1.constructToolNode)({
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
        if (edge.source === langgraph_1.START) {
            // @ts-ignore: Langgraph doesn't construct the types correctly. 
            graph.addEdge(langgraph_1.START, edge.target);
        }
        else if (edge.target === langgraph_1.END) {
            // @ts-ignore: Langgraph doesn't construct the types correctly. 
            graph.addEdge(edge.source, langgraph_1.END);
        }
        else if (edge.condition) {
            // @ts-ignore: Langgraph doesn't construct the types correctly.
            let conditional = await (0, node_1.constructConditional)(model, edge.condition);
            // @ts-ignore: Langgraph doesn't construct the types correctly.
            graph.addConditionalEdges(edge.source, conditional, edge.condition);
        }
        else {
            // @ts-ignore: Langgraph doesn't construct the types correctly. 
            graph.addEdge(edge.source, edge.target);
        }
    }
    console.log(graph.branches);
    return graph;
}
exports.buildGraph = buildGraph;
