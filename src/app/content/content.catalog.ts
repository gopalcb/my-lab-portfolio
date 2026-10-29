import { ContentItem, ContentKind, ContentSettings } from './content.models';

export const CONTENT_SETTINGS: ContentSettings = {
  endpoint: 'https://d10qhbfu5fjd8s.cloudfront.net/gb-portfolio/get-content',
};

// Temporarily hidden from navigation; documents and direct links remain available.
export const HIDDEN_PROJECT_IDS = new Set(['glue-fuzzy-matcher', 'eks-microservices-lab', 'codex-multi-agent']);

export const LOCAL_CATALOG: Record<ContentKind, readonly ContentItem[]> = {
  projects: [
    { id: 'visual-agent-builder', title: 'Runtime Controller', summary: 'From visual instructions to project-scoped Codex execution, saved results and run history.', htmlUrl: 'projects/visual-agent-builder.html' },
    { id: 'what-burning-436m-tokens-taught-me', title: 'What Burning 436M Tokens Taught Me', apiTitle: 'Do More Agents Mean Better Work?', summary: 'A measured audit of agent token usage, repeated context and the limits of workflow complexity.', htmlUrl: 'projects/agent-workflow-token-experiment.html' },
    { id: 'aws-observability', title: 'OpenTelemetry implementation lab', summary: 'A staged OpenTelemetry lab for tracing services, logs, metrics, and failure evidence.', htmlUrl: 'projects/aws-observability.html' },
    { id: 'my-customized-agents-and-runtime', title: 'Customizing agents and runtime', summary: 'Personal workflows, tools and validation around Codex.', htmlUrl: 'projects/agents-and-runtime.html' },
    { id: 'glue-fuzzy-matcher', title: 'Glue fuzzy matcher pipeline', summary: 'A provisional Spark and RapidFuzz matching architecture.', htmlUrl: 'projects/glue-fuzzy-matcher.html' },
    { id: 'eks-microservices-lab', title: 'EKS microservices lab', summary: 'EventHub architecture, resource contracts and staged operations lab.', htmlUrl: 'projects/eks-microservices-lab.html' },
    { id: 'codex-multi-agent', title: 'Codex multi-agent systems', summary: 'Opt-in local collaboration and a planned Bedrock Agents bridge.', htmlUrl: 'projects/codex-multi-agent.html' },
  ],
  read: [
    { id: 'eks-architecture', title: 'EKS architecture', summary: 'What exists today and the target platform, services and data flows.', topic: 'EKS MICROSERVICES', htmlUrl: 'read/eks-architecture.html' },
    { id: 'kubernetes-networking', title: 'Kubernetes networking', summary: 'VPC routes, CNI, Services, NLB, NGINX and mesh traffic.', topic: 'EKS MICROSERVICES', htmlUrl: 'read/kubernetes-networking.html' },
    { id: 'implementation-and-delivery', title: 'Build, delivery & Linux', summary: 'Terraform, Docker, ECR, GitOps delivery and Linux operations.', topic: 'EKS MICROSERVICES', htmlUrl: 'read/implementation-and-delivery.html' },
    { id: 'testing-and-debugging', title: 'Testing & debugging', summary: 'Layered diagnostics, failure drills and evidence-led recovery.', topic: 'EKS MICROSERVICES', htmlUrl: 'read/testing-and-debugging.html' },
    { id: 'multi-agent-work-process', title: 'Multi-agent work process', summary: 'Opt-in activation, bounded ownership, durable inboxes and result review.', topic: 'MULTI-AGENT SYSTEMS', htmlUrl: 'read/multi-agent-work-process.html' },
    { id: 'bedrock-agent-integration', title: 'Bedrock agent integration', summary: 'The planned remote agent boundary, invocation contract and recovery design.', topic: 'MULTI-AGENT SYSTEMS', htmlUrl: 'read/bedrock-agent-integration.html' },
    { id: 'codex-workspace-setup', title: 'Workspace setup', summary: 'Set up the current GB Systems Codex workspace and verify each layer.', topic: 'CODEX WORKSPACE', htmlUrl: 'read/codex-workspace-setup.html' },
    { id: 'codex-tools-workflows-skills', title: 'Tools, workflows & skills', summary: 'How current project procedures and tools turn a request into verified work.', topic: 'CODEX WORKSPACE', htmlUrl: 'read/codex-tools-workflows-skills.html' },
    { id: 'codex-memory-and-logging', title: 'Memory & logging', summary: 'Recall, task records, checkpoints, indexes and factual activity logging.', topic: 'CODEX WORKSPACE', htmlUrl: 'read/codex-memory-and-logging.html' },
  ],
};
