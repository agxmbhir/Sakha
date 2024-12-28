import { z } from "zod";
import { GraphSchema } from "./types";
import { END, START } from "@langchain/langgraph";
import { ToolNodeConfig } from "./types";

// Refund Tools
export const refundTool: ToolNodeConfig = {
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

export const cancelOrderTool: ToolNodeConfig = {
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
export const diagnoseTool: ToolNodeConfig = {
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

export const escalateTool: ToolNodeConfig = {
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
export const generateInvoiceTool: ToolNodeConfig = {
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

export const retrieveInvoiceTool: ToolNodeConfig = {
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
                    For order status -> respond EXACTLY with "ORDER"
                    
                    if it is a general question repond directly.
                    ONLY respond with one of these exact words, nothing else.`,
            }
        },
        {
            id: "refund_agent",
            type: 'agent',
            config: {
                systemPrompt: `You are a refund specialist.
                    For refunds you need: orderId, amount, and reason.
                    
                    If customer wants to cancel order, use cancel_order function.
                    If customer wants a refund, use process_refund function.
                    
                    Ask for any missing information.
                    Only use functions when you have ALL required information.`,
                functions: [refundTool, cancelOrderTool]
            }
        },
        {
            id: "refund_tools",
            type: 'tool',
            config: refundTool
        },
        {
            id: "cancel_tools",
            type: 'tool',
            config: cancelOrderTool
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
            id: "tech_tools",
            type: 'tool',
            config: diagnoseTool
        },
        {
            id: "escalation_tools",
            type: 'tool',
            config: escalateTool
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
        {
            id: "invoice_gen_tools",
            type: 'tool',
            config: generateInvoiceTool
        },
        {
            id: "invoice_get_tools",
            type: 'tool',
            config: retrieveInvoiceTool
        }
    ],
    edges: [
        { source: START, target: "alpha" },
        {
            source: "alpha",
            condition: {
                type: "router",
                config: {
                    "REFUND": "refund_agent",
                    "TECH": "tech_agent",
                    "INVOICE": "invoice_agent",
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
                    "process_refund": "refund_tools",
                    "cancel_order": "cancel_tools",
                    "end": END
                }
            },
            target: ""
        },
        { source: "refund_tools", target: "refund_agent" },
        { source: "cancel_tools", target: "refund_agent" },

        // Tech agent edges
        {
            source: "tech_agent",
            condition: {
                type: "router",
                config: {
                    "diagnose_device": "tech_tools",
                    "escalate_ticket": "escalation_tools",
                    "end": END
                }
            },
            target: ""
        },
        { source: "tech_tools", target: "tech_agent" },
        { source: "escalation_tools", target: "tech_agent" },

        // Invoice agent edges
        {
            source: "invoice_agent",
            condition: {
                type: "router",
                config: {
                    "generate_invoice": "invoice_gen_tools",
                    "retrieve_invoice": "invoice_get_tools",
                    "end": END
                }
            },
            target: ""
        },
        { source: "invoice_gen_tools", target: "invoice_agent" },
        { source: "invoice_get_tools", target: "invoice_agent" }
    ]
};