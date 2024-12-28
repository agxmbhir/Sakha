graph TD

    %% Node styles
    classDef start fill:#2ECC71,stroke:#27AE60,stroke-width:2px
    classDef end fill:#E74C3C,stroke:#C0392B,stroke-width:2px
    classDef agent fill:#3498DB,stroke:#2980B9,stroke-width:2px
    classDef tool fill:#F1C40F,stroke:#F39C12,stroke-width:2px

    START((Start))
    END((End))

    %% Nodes
    router[router]
    class router agent
    billing[billing]
    class billing agent
    technical[technical]
    class technical agent
    refund_tool>refund_tool]
    class refund_tool tool
    invoice_tool>invoice_tool]
    class invoice_tool tool
    payment_tool>payment_tool]
    class payment_tool tool

    %% Edges
    START --> router
    router -->|billing| billing
    router -->|technical| technical
    router -->|general| END
    billing -->|refund| refund_tool
    billing -->|invoice| invoice_tool
    billing -->|payment| payment_tool
    billing -->|general| END
    refund_tool --> END
    invoice_tool --> END
    payment_tool --> END
    technical --> END

    class START start
    class END end
