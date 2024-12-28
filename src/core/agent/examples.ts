import { z } from "zod";
import { GraphSchema } from "./types";
import { END, START } from "@langchain/langgraph";
import { ToolConfig } from "./types";

// Refund Tools
export const refundTool: ToolConfig = {
    function: "process_refund",
    description: "Process a refund for a customer order",
    schema: z.object({
        orderId: z.string().describe("Order ID for the refund"),
        amount: z.number().describe("Amount to refund"),
        reason: z.string().describe("Reason for the refund")
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

export const cancelOrderTool: ToolConfig = {
    function: "cancel_order",
    description: "Cancel an existing order",
    schema: z.object({
        orderId: z.string().describe("Order ID to cancel"),
        reason: z.string().describe("Reason for cancellation")
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
export const diagnoseTool: ToolConfig = {
    function: "diagnose_device",
    description: "Run diagnostics on a device",
    schema: z.object({
        deviceId: z.string().describe("Device ID or serial number"),
        issue: z.string().describe("Description of the issue"),
        steps: z.array(z.string()).optional().describe("Steps already tried")
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

export const escalateTool: ToolConfig = {
    function: "escalate_ticket",
    description: "Escalate issue to senior support",
    schema: z.object({
        ticketId: z.string().describe("Ticket ID to escalate"),
        priority: z.enum(["high", "medium", "low"]).describe("Escalation priority"),
        notes: z.string().describe("Notes for senior support")
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
export const generateInvoiceTool: ToolConfig = {
    function: "generate_invoice",
    description: "Generate a new invoice",
    schema: z.object({
        customerId: z.string().describe("Customer ID"),
        items: z.array(z.object({
            name: z.string(),
            quantity: z.number(),
            price: z.number()
        })).describe("Items to invoice"),
        notes: z.string().optional().describe("Additional notes")
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

export const retrieveInvoiceTool: ToolConfig = {
    function: "retrieve_invoice",
    description: "Retrieve an existing invoice",
    schema: z.object({
        invoiceId: z.string().describe("Invoice ID to retrieve"),
        customerId: z.string().optional().describe("Customer ID for verification")
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
export const complexSchema: GraphSchema = {
    name: "CustomerService",
    nodes: [
        {
            id: "alpha",
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
            Available functions:
            - cancel_order: Use to cancel an order (requires orderId and reason)
            - process_refund: Use for refunds (requires orderId, amount, and reason)
            
            DO NOT describe function calls in text. Instead, USE the provided functions directly.
            Ask for any missing information before using functions.
            Only use functions when you have ALL required information.`,
                functions: [refundTool, cancelOrderTool]
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
                functions: [diagnoseTool, escalateTool]
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
                functions: [generateInvoiceTool, retrieveInvoiceTool]
            }
        },

    ],
    edges: [
        { source: START, target: "alpha" },
        {
            source: "alpha",
            condition: {
                type: "router",
                config: {
                    "refund": "refund_agent",
                    "invoice": "invoice_agent",
                    "tech": "tech_agent",
                    "end": END
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
                    "end": END
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
                    "end": END
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
                    "end": END
                }
            },
            target: ""
        },
        {
            source: 'tool_node',
            target: END,
        }
    ]
};