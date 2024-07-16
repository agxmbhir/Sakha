export const SAMPLE_LLM_OUTPUT = `1. Schema Definition:

Nodes:

a. Frontline Support Agent: This is the AGENT node that initially interacts with the customer and handles basic queries. If the customer has a billing or technical issue, it routes them to the appropriate AGENT node. It also handles general conversational responses.

b. Billing Support Agent: This is an AGENT node that helps the customer with any billing related queries. It has the ability to initiate the refund process if necessary.

c. Technical Support Agent: This AGENT node handles all technical issues related queries.

d. Refund Initiation Agent: A separate AGENT node is created to handle the refunds so workflow is better managed and trackable.

Edges:

a. Start to Frontline Support Agent: This edge is the start of the workflow and targets the Frontline Support Agent.

b. Frontline Support Agent to Billing/Technical Support Agent: This edge routes the customer query to either the Billing Support Agent or the Technical Support Agent, based on the type of issue reported by the customer.

c. Billing Support Agent to Refund Initiation Agent: This edge is activated if the Billing Support Agent deems a refund necessary.

d. Any Agent to End: These edges return to the End state which signifies the end of the workflow after any AGENT has completed their task.

2. JSON Payload:

%
{
    "nodes": [
        {
            "id": "frontlineSupport",
            "type": "agent",
            "prompt": "You are frontline support staff for a company. Be concise in your responses. You can chat with customers and help them with basic questions, but if the customer has a billing or technical problem, do not try to answer the question directly. Instead, guide them to the appropriate department."
        },
        {
            "id": "billingSupport",
            "type": "agent",
            "prompt": "You are an expert billing support specialist. Help the user to the best of your ability, but be concise. You have the ability to authorize refunds, if necessary, transfer the user to the refund agent. Assume the refund agent has all necessary information about the customer and their order. You do not need to ask the user for more information."
        },
        {
            "id": "technicalSupport",
            "type": "agent",
            "prompt": "You are an expert at diagnosing technical issues. Help the user to the best of your ability, but be concise."
        },
        {
            "id": "refundInitiation",
            "type": "agent",
            "prompt": "You are an agent responsible for initiating refunds. Use the information provided to complete the refund process smoothly."
        }
    ],
    "edges": [
        {
            "source": "__start__",
            "target": "frontlineSupport"
        },
        {
            "source": "frontlineSupport",
            "target": "supportRouting",
            "condition": {
                "billing": "billingSupport",
                "technical": "technicalSupport",
                "conversational": "__end__"
            }
        },
        {
            "source": "billingSupport",
            "target": "refundRouting",
            "condition": {
                "refund": "refundInitiation",
                "conversational": "__end__"
            }
        },
        {
            "source": "technicalSupport",
            "target": "__end__"
        },
        {
            "source": "refundInitiation",
            "target": "__end__"
        }
    ]
}%
`