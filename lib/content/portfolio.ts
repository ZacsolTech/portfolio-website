import type { PortfolioItem } from "./types";

export const portfolio: PortfolioItem[] = [
  {
    slug: "opply-ai",
    title: "Opply AI — Student Email Assistant",
    client: "Opply",
    sector: "Education",
    metric: "Email to ranked opportunities",
    category: "web",
    summary:
      "An AI-powered SaaS assistant that integrates with Gmail and WhatsApp to extract, rank, and track academic and professional opportunities.",
    description: [
      "An AI-powered SaaS assistant that integrates with Gmail and WhatsApp to extract, rank, and track academic and professional opportunities for students.",
      "Direct Gmail integration handles automated email processing and sync. Manual batch uploads parse with real-time progress over WebSockets. LangChain and Mistral AI tool-calling pipelines extract structured data, then a profile-fit ranking system matches opportunities to eligibility — with high-priority alerts pushed to WhatsApp via Twilio.",
      "Unstructured inbox noise becomes a structured opportunity pipeline. Structured LLM tool-calling schemas keep extraction grounded. Async backend jobs keep the product interactive under load. Deployed on Vercel and Render.",
    ],
    thumbnail: "/projects/opply/thumbnail.png",
    images: [
      {
        caption: "Opportunity inbox",
        alt: "Opply AI dashboard showing extracted student opportunities from email",
        src: "/projects/opply/1.png",
      },
      {
        caption: "Ranking & fit",
        alt: "Opply profile fit ranking view for academic and professional opportunities",
        src: "/projects/opply/2.png",
      },
      {
        caption: "Extraction pipeline",
        alt: "Opply email processing and structured opportunity extraction view",
        src: "/projects/opply/3.png",
      },
      {
        caption: "WhatsApp alerts",
        alt: "Opply high-priority opportunity alerts delivered via WhatsApp",
        src: "/projects/opply/4.png",
      },
    ],
    stack: [
      "React",
      "FastAPI",
      "LangChain",
      "Mistral AI",
      "Twilio API",
      "SQLModel",
      "WebSockets",
    ],
    relatedServices: ["ai-automation", "web-development", "custom-software"],
    timeline: "Vercel + Render",
  },
  {
    slug: "plant-disease",
    title: "Plant Disease Classification",
    client: "Agri research",
    sector: "Agriculture",
    metric: "Explainable disease detection",
    category: "data",
    summary:
      "Deep learning system for plant disease detection using transfer learning, with visual interpretability and production-ready deployment.",
    description: [
      "A deep learning system for plant disease detection using transfer learning, with visual interpretability and a production-ready inference app.",
      "The CNN combines VGG16 and Inception with transfer learning. Grad-CAM heatmaps explain which regions drove each prediction. A Streamlit app serves real-time inference on uploaded leaf images.",
      "High classification accuracy across disease categories. Grad-CAM gives end users transparent model reasoning. The Streamlit deployment delivers instant inference in production.",
    ],
    thumbnail: "/projects/plant/thumbnail.png",
    images: [
      {
        caption: "Inference app",
        alt: "Streamlit plant disease classification app with uploaded leaf image",
        src: "/projects/plant/1.png",
      },
      {
        caption: "Grad-CAM",
        alt: "Grad-CAM heatmap showing model attention for plant disease prediction",
        src: "/projects/plant/2.png",
      },
    ],
    stack: ["Python", "TensorFlow", "VGG16", "Inception", "Grad-CAM", "Streamlit"],
    relatedServices: ["data-science", "ai-automation"],
    timeline: "Streamlit",
  },
  {
    slug: "ai-content-generation",
    title: "AI content generation pipeline",
    client: "Crypto Geek / multi-brand",
    sector: "Media",
    metric: "Data → script → published video",
    category: "automation",
    summary:
      "An n8n multi-agent pipeline that pulls live market data, runs technical, fundamental and strategy analysis, then generates and publishes AI avatar videos.",
    description: [
      "A scheduled n8n workflow that turns raw market and news data into finished short-form video content — without a daily production team in the loop.",
      "Each morning the pipeline pulls Binance spot and futures feeds (price, OHLCV, order book, open interest, funding, long/short and taker ratios), CoinGecko fundamentals, Fear & Greed, CryptoCompare news and Cointelegraph RSS. A prepare step packs that into structured context for three parallel AI agents: technical analysis, fundamental analysis and trading strategy. Their outputs merge, an avatar is selected by day, and two script agents write distinct video scripts.",
      "Scripts are formatted into HeyGen payloads, videos are created via the HeyGen API, then a wait-and-poll loop retrieves final URLs once rendering completes. The same system powers crypto market Shorts and has been reused for fitness and Instagram-style vertical content — proof the pipeline is brand-agnostic, not a one-off script.",
    ],
    thumbnail: "/projects/ai-content-generation/main.png",
    images: [
      {
        caption: "Full n8n workflow",
        alt: "n8n AI content generation workflow canvas from schedule trigger through HeyGen video output",
        src: "/projects/ai-content-generation/main.png",
      },
      {
        caption: "Data collection",
        alt: "n8n nodes fetching Binance, CoinGecko, Fear and Greed and crypto news APIs",
        src: "/projects/ai-content-generation/data-collection.png",
      },
      {
        caption: "Multi-agent scripts",
        alt: "Technical, fundamental and trading strategy AI agents merging into video script generators",
        src: "/projects/ai-content-generation/script.png",
      },
      {
        caption: "HeyGen render loop",
        alt: "HeyGen API create video nodes with status polling and wait loops",
        src: "/projects/ai-content-generation/generate-and-post.png",
      },
      {
        caption: "Crypto Geek YouTube",
        alt: "Crypto Geek YouTube channel with AI-generated Shorts thumbnails",
        src: "/projects/ai-content-generation/example-crypto-yt.png",
      },
      {
        caption: "Kiri Gym YouTube",
        alt: "Kiri Gym YouTube channel showing fitness content produced by the same pipeline",
        src: "/projects/ai-content-generation/example-gym-yt.png",
      },
      {
        caption: "Instagram output",
        alt: "Instagram profile showing vertical posts generated by the AI content pipeline",
        src: "/projects/ai-content-generation/example-insta.png",
      },
    ],
    stack: [
      "n8n",
      "HeyGen API",
      "OpenAI / LLMs",
      "Binance API",
      "CoinGecko",
      "JavaScript",
      "RSS / news APIs",
    ],
    relatedServices: [
      "content-automation",
      "ai-automation",
      "business-process-automation",
    ],
    timeline: "n8n + HeyGen",
  },
  {
    slug: "ai-support-agent",
    title: "AI support agent",
    client: "Meridian Retail",
    sector: "Retail",
    metric: "68% of tickets deflected",
    category: "ai",
    summary:
      "A knowledge-backed support agent that answers common questions, escalates with context, and captures unresolved leads.",
    description: [
      "Meridian Retail’s support volume outgrew headcount. Agents spent the first minutes of every ticket re-finding policy answers that already lived in scattered docs.",
      "We shipped a retrieval-backed support agent that answers from a governed knowledge base, escalates to humans with full context, and captures unresolved intents as leads. An evaluation set keeps answer quality from drifting after launch.",
      "In production, the agent deflects roughly two-thirds of inbound tickets with a median first response under thirty seconds — owned by one knowledge team, not a bot farm.",
    ],
    images: [
      {
        caption: "Agent workspace",
        alt: "Support agent workspace with analytics dashboard on screen",
        src: "/projects/ai-support-agent/01.jpg",
      },
      {
        caption: "Escalation trail",
        alt: "Operations dashboard used for ticket escalation and review",
        src: "/projects/ai-support-agent/02.jpg",
      },
      {
        caption: "Knowledge coverage",
        alt: "Team reviewing knowledge coverage on a shared workspace screen",
        src: "/projects/ai-support-agent/03.jpg",
      },
    ],
    stack: ["Next.js", "Gemini", "pgvector", "PostgreSQL", "Resend"],
    relatedServices: ["ai-automation", "web-development"],
    timeline: "10 weeks",
  },
  {
    slug: "field-service-operations",
    title: "Field-service operations platform",
    client: "Halcyon Logistics",
    sector: "Logistics",
    metric: "Dispatch time down 41%",
    category: "web",
    summary:
      "Dispatch, routing and proof-of-work for 300 technicians across four regions.",
    description: [
      "Dispatchers built daily schedules by hand. Technicians worked from paper job packs. Proof of completion reached billing days later, and exceptions disappeared into chat threads.",
      "We delivered a web dispatch console and mobile field app: skills-aware assignment, live job status, photo proof-of-work, and a same-day feed into invoicing. Regional managers see capacity without waiting for a Friday export.",
      "Three hundred technicians moved off paper in fourteen weeks. Dispatch time dropped 41%, with proof of work reaching billing the same day.",
    ],
    images: [
      {
        caption: "Dispatch console",
        alt: "Dispatch board with technician capacity and live job assignments",
      },
      {
        caption: "Field app",
        alt: "Mobile field app showing job details and photo proof-of-work capture",
      },
      {
        caption: "Billing feed",
        alt: "Same-day proof feed into invoicing with exception queue",
      },
    ],
    stack: ["Next.js", "React Native", "Node.js", "PostgreSQL", "Redis"],
    relatedServices: [
      "custom-software",
      "mobile-app-development",
      "web-development",
    ],
    timeline: "14 weeks",
  },
  {
    slug: "order-capture-inventory",
    title: "Multi-channel order capture & inventory",
    client: "Verdant Supply",
    sector: "Retail",
    metric: "Zero lost orders in 6 months",
    category: "automation",
    summary:
      "Orders from chat and email channels flow straight into stock, invoicing and delivery tracking.",
    description: [
      "Wholesale orders arrived in chat threads and inboxes. Staff re-typed them into inventory. Busy weeks meant missed lines in the scroll — and stock truth disagreed with what sales had promised.",
      "We built an intake pipeline that turns channel messages into structured orders, checks stock, raises invoices, and pushes delivery status back to the customer. Exceptions land in a human queue instead of failing silently.",
      "From discovery to production in nine weeks. Six months later: zero lost orders and one source of stock truth across sales and warehouse.",
    ],
    images: [
      {
        caption: "Channel intake",
        alt: "Order intake pipeline converting chat and email into structured orders",
      },
      {
        caption: "Stock check",
        alt: "Inventory confirmation screen before order commitment",
      },
      {
        caption: "Exception queue",
        alt: "Human exception queue for orders that need review",
      },
    ],
    stack: ["Node.js", "PostgreSQL", "workflow engine", "Next.js"],
    relatedServices: [
      "business-process-automation",
      "custom-software",
      "ai-automation",
    ],
    timeline: "9 weeks",
  },
  {
    slug: "document-data-extractor",
    title: "Document data extractor",
    client: "Bancroft Finance",
    sector: "Fintech",
    metric: "Invoice fields in seconds",
    category: "ai",
    summary:
      "Invoice extraction with confidence scores and human review before finance systems are updated.",
    description: [
      "AP staff re-keyed invoices into the ledger. Error rates climbed with volume, and month-end turned into a reconciliation festival.",
      "We shipped an extraction pipeline with confidence scores, human review for low-confidence fields, and a clean export into the existing finance system.",
      "Structured fields land in seconds. Low-confidence values never reach the ledger without a person in the loop.",
    ],
    images: [
      {
        caption: "Upload & extract",
        alt: "Document upload screen with invoice extraction in progress",
      },
      {
        caption: "Confidence review",
        alt: "Human review UI highlighting low-confidence extracted fields",
      },
      {
        caption: "Finance export",
        alt: "Export confirmation into the finance system API",
      },
    ],
    stack: ["Python", "Gemini", "Next.js", "PostgreSQL"],
    relatedServices: ["ai-automation", "business-process-automation"],
    timeline: "8 weeks",
  },
];
