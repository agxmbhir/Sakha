"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complexSchema = exports.retrieveInvoiceTool = exports.generateInvoiceTool = exports.escalateTool = exports.diagnoseTool = exports.cancelOrderTool = exports.refundTool = void 0;
const zod_1 = require("zod");
const langgraph_1 = require("@langchain/langgraph");
// Refund Tools
exports.refundTool = {
    function: "process_refund",
    description: "Process a refund for a customer order",
    schema: zod_1.z.object({
        orderId: zod_1.z.string().describe("Order ID for the refund"),
        amount: zod_1.z.number().describe("Amount to refund"),
        reason: zod_1.z.string().describe("Reason for the refund")
    }),
    handler: async (input) => {
        console.log("[DEBUG] Processing refund:", input);
        return {
            success: true,
            data: {
                refundId: `REF_${Date.now()}`,
                status: 'completed',
                message: `Refund processed for order ${input.orderId} for amount $${input.amount}`
            }
        };
    }
};
exports.cancelOrderTool = {
    function: "cancel_order",
    description: "Cancel an existing order",
    schema: zod_1.z.object({
        orderId: zod_1.z.string().describe("Order ID to cancel"),
        reason: zod_1.z.string().describe("Reason for cancellation")
    }),
    handler: async (input) => {
        console.log("[DEBUG] Cancelling order:", input);
        return {
            success: true,
            data: {
                cancellationId: `CANCEL_${Date.now()}`,
                status: 'cancelled',
                message: `Order ${input.orderId} has been cancelled`
            }
        };
    }
};
// Tech Support Tools
exports.diagnoseTool = {
    function: "diagnose_device",
    description: "Run diagnostics on a device",
    schema: zod_1.z.object({
        deviceId: zod_1.z.string().describe("Device ID or serial number"),
        issue: zod_1.z.string().describe("Description of the issue"),
        steps: zod_1.z.array(zod_1.z.string()).optional().describe("Steps already tried")
    }),
    handler: async (input) => {
        console.log("[DEBUG] Running diagnostics:", input);
        return {
            success: true,
            data: {
                diagnosticId: `DIAG_${Date.now()}`,
                status: 'completed',
                results: `Diagnostic complete for device ${input.deviceId}`,
                recommendations: [
                    "Reset device settings",
                    "Update firmware",
                    "Check connections"
                ]
            }
        };
    }
};
exports.escalateTool = {
    function: "escalate_ticket",
    description: "Escalate issue to senior support",
    schema: zod_1.z.object({
        ticketId: zod_1.z.string().describe("Ticket ID to escalate"),
        priority: zod_1.z.enum(["high", "medium", "low"]).describe("Escalation priority"),
        notes: zod_1.z.string().describe("Notes for senior support")
    }),
    handler: async (input) => {
        console.log("[DEBUG] Escalating ticket:", input);
        return {
            success: true,
            data: {
                escalationId: `ESC_${Date.now()}`,
                status: 'escalated',
                assignedTo: 'Senior Support Team',
                expectedResponse: '24 hours'
            }
        };
    }
};
// Invoice Tools
exports.generateInvoiceTool = {
    function: "generate_invoice",
    description: "Generate a new invoice",
    schema: zod_1.z.object({
        customerId: zod_1.z.string().describe("Customer ID"),
        items: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            quantity: zod_1.z.number(),
            price: zod_1.z.number()
        })).describe("Items to invoice"),
        notes: zod_1.z.string().optional().describe("Additional notes")
    }),
    handler: async (input) => {
        console.log("[DEBUG] Generating invoice:", input);
        const total = input.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        return {
            success: true,
            data: {
                invoiceId: `INV_${Date.now()}`,
                total: total,
                status: 'generated',
                items: input.items,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
        };
    }
};
exports.retrieveInvoiceTool = {
    function: "retrieve_invoice",
    description: "Retrieve an existing invoice",
    schema: zod_1.z.object({
        invoiceId: zod_1.z.string().describe("Invoice ID to retrieve"),
        customerId: zod_1.z.string().optional().describe("Customer ID for verification")
    }),
    handler: async (input) => {
        console.log("[DEBUG] Retrieving invoice:", input);
        return {
            success: true,
            data: {
                invoiceId: input.invoiceId,
                status: 'retrieved',
                details: {
                    amount: 299.99,
                    date: new Date().toISOString(),
                    status: 'paid',
                    items: [
                        { name: "Product A", quantity: 1, price: 299.99 }
                    ]
                }
            }
        };
    }
};
exports.complexSchema = {
    name: "CustomerService",
    nodes: [
        {
            id: "alpha",
            type: 'agent',
            config: {
                systemPrompt: `You are a customer service agent, if the user specifically asks for service, respond with "ROUTE", respond with ROUTE only 
                   if it's an explicit service request, return 
                  if it is anything else respond directly. 
                    ONLY respond with one of these exact words, nothing else.`,
            }
        },
        {
            id: 'beta',
            type: 'agent',
            config: {
                systemPrompt: `You are a customer service agent which makes sure the user is satisfied with the serfice.   ONLY respond with one of these exact words, nothing else.`,
            }
        },
        {
            id: "router",
            type: 'agent',
            config: {
                systemPrompt: `You are a customer service router.
                    For refunds -> respond EXACTLY with "REFUND"
                    For invoices -> respond EXACTLY with "INVOICE"
                    For technical issues -> respond EXACTLY with "TECH"
                    
                    if it is a general question repond directly.
                    ONLY respond with one of these exact words, nothing else.`,
            }
        },
        {
            id: "refund_agent",
            type: 'agent',
            config: {
                systemPrompt: `You are a billing specialist. You can help with refunds and order cancellations.
            Available functions that are bound to you.
            - : Use to cancel an order (requires orderId and reason)
            - : Use for refunds (requires orderId, amount, and reason)
            
            DO NOT describe function calls in text. Instead, USE the provided functions directly.
            Ask for any missing information before using functions.
            Only use functions when you have ALL required information.`,
                functions: [exports.refundTool, exports.cancelOrderTool]
            }
        },
        {
            id: "tech_agent",
            type: 'agent',
            config: {
                systemPrompt: `You are a technical support specialist.
                    For device diagnostics, use diagnose_device function.
                    For escalation to senior support, use escalate_ticket function.
                    
                    Try diagnostics first before escalating.`,
                functions: [exports.diagnoseTool, exports.escalateTool]
            }
        },
        {
            id: "invoice_agent",
            type: 'agent',
            config: {
                systemPrompt: `You are an invoicing specialist.
                    Use generate_invoice for creating new invoices.
                    Use retrieve_invoice for finding existing ones.
                    
                    Gather all necessary information before using functions.`,
                functions: [exports.generateInvoiceTool, exports.retrieveInvoiceTool]
            }
        },
    ],
    edges: [
        { source: langgraph_1.START, target: "alpha" },
        {
            source: "alpha",
            condition: {
                type: "router",
                config: {
                    "route": "router",
                    "end": langgraph_1.END
                }
            },
            target: ""
        },
        {
            source: "router",
            condition: {
                type: "router",
                config: {
                    "refund": "refund_agent",
                    "invoice": "invoice_agent",
                    "tech": "tech_agent",
                    "end": langgraph_1.END
                }
            },
            target: ""
        },
        // Refund agent edges
        {
            source: "refund_agent",
            condition: {
                type: "router",
                config: {
                    "tool_node": "tool_node",
                    "end": langgraph_1.END
                }
            },
            target: ""
        },
        // Tech agent edges
        {
            source: "tech_agent",
            condition: {
                type: "router",
                config: {
                    "tool_node": "tool_node",
                    "end": langgraph_1.END
                }
            },
            target: ""
        },
        // Invoice agent edges
        {
            source: "invoice_agent",
            condition: {
                type: "router",
                config: {
                    "tool_node": "tool_node",
                    "end": langgraph_1.END
                }
            },
            target: ""
        },
        {
            source: 'tool_node',
            target: 'beta',
        },
        {
            source: 'beta',
            target: langgraph_1.END,
        }
    ]
};
