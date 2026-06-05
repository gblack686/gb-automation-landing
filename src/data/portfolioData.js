import { Cloud, Code, Video, Workflow, Network, FileText, GitPullRequest, Users } from 'lucide-react';

export const portfolioItems = [
  {
    id: 'aws-admin',
    unit: 'AWS-OPS-01',
    name: 'AWS Admin',
    Icon: Cloud,
    role: 'Cloud Operations & Reporting',
    tagline: 'Slack-Accessible AWS Management',
    features: [
      'View logs & generate reports',
      'Create CDK stacks',
      'Deploy microservices'
    ],
    capabilities: [
      'Slack Integration',
      'User Context',
      'Knowledge Base'
    ],
    description: 'Full-context AWS operations agent with Slack accessibility, intelligent log viewing, automated report generation, and CDK stack creation capabilities. Streamline your cloud operations with natural language commands.',
    technologies: ['AWS', 'Slack', 'CDK', 'CloudWatch', 'Lambda'],
    useCases: [
      'Real-time log analysis via Slack',
      'Automated infrastructure reporting',
      'On-demand microservice deployment',
      'CloudWatch metrics monitoring'
    ],
    image: 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?q=80&w=1000&auto=format&fit=crop',
    detailedInfo: {
      architecture: 'Multi-agent system with specialized subagents for different AWS services, orchestrated through a central Slack interface for seamless operations.',
      integrations: ['Slack', 'AWS CloudWatch', 'AWS CDK', 'AWS Lambda', 'EventBridge'],
      benefits: [
        'Reduce manual AWS console navigation by 80%',
        'Instant access to logs and metrics from Slack',
        'Automated compliance reporting',
        'User-level context for personalized operations'
      ],
      deployment: 'AWS Lambda + EventBridge for scheduled tasks, integrated with Slack workspace for real-time interactions.'
    }
  },
  {
    id: 'aws-developer',
    unit: 'DEV-CDK-02',
    name: 'AWS Developer',
    Icon: Code,
    role: 'Feature Development & Validation',
    tagline: 'Plan-Implement-Validate Pipeline',
    features: [
      'Detailed implementation plans',
      'Feature development pipeline',
      'Automated validation'
    ],
    capabilities: [
      'Stateful Memory',
      'AWS Best Practices',
      'Human-in-Loop Gates'
    ],
    description: 'Comprehensive development agent that creates detailed implementation plans, executes feature development with AWS best practices, and validates through human-in-the-loop checkpoints. Your stateful development partner.',
    technologies: ['AWS CDK', 'Cognito', 'Lambda', 'API Gateway', 'DynamoDB'],
    useCases: [
      'End-to-end feature implementation',
      'AWS CDK infrastructure as code',
      'Compliance-driven development',
      'Secure multi-tenant architectures'
    ],
    image: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=1000&auto=format&fit=crop',
    detailedInfo: {
      architecture: 'Orchestrated development pipeline with planning, implementation, and validation stages. Maintains stateful context across development sessions for continuity.',
      integrations: ['AWS CDK', 'AWS Cognito', 'Git', 'Linear', 'Jira', 'Slack'],
      benefits: [
        'Reduce feature development time by 60%',
        'Ensure AWS best practices compliance',
        'Maintain stateful context across development sessions',
        'Isolated agent permissions via Cognito'
      ],
      deployment: 'Self-hosted with isolated Cognito permissions per agent instance. Integrates with existing task management systems.'
    }
  },
  {
    id: 'google-content-creator',
    unit: 'VEO-GEN-03',
    name: 'Google Content Creator',
    Icon: Video,
    role: 'Multi-Modal Content Generation',
    tagline: 'AI-Powered Creative Studio',
    features: [
      'Google Veo 3.1 video generation',
      'Custom style guides',
      'Avatar & photo creation'
    ],
    capabilities: [
      'Nano Banana Pro',
      'Slack/Telegram Access',
      'Creative Prompting'
    ],
    description: 'Advanced content generation system powered by Google Cloud, creating videos, images, and avatars with consistent brand styling through Veo 3.1 and custom creative prompting. Your creative studio in the cloud.',
    technologies: ['Google Veo 3.1', 'Imagen 3', 'Vertex AI', 'FFmpeg', 'Cloud Storage'],
    useCases: [
      'Marketing video generation',
      'Brand-consistent social media content',
      'Automated avatar and visual asset creation',
      'Short-form video production'
    ],
    image: 'https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/917d6f93-fb36-439a-8c48-884b67b35381_1600w.jpg',
    detailedInfo: {
      architecture: 'Multi-modal orchestrator with specialized subagents for video, image, and style consistency. Powered by Google Veo 3.1 and Imagen 3 for state-of-the-art generation.',
      integrations: ['Google Veo 3.1', 'Imagen 3', 'Slack', 'Telegram', 'Cloud Storage', 'FFmpeg'],
      benefits: [
        'Reduce content production time by 90%',
        '79% cost reduction vs traditional agencies',
        'Maintain brand consistency across all assets',
        'Instant content generation via Slack or Telegram'
      ],
      deployment: 'Google Cloud Run + Cloud Functions for serverless execution. Accessible via Slack and Telegram interfaces.'
    }
  },
  {
    id: 'claude-code-harness',
    unit: 'CC-HARNESS-04',
    name: 'Claude Code Agent Harness',
    Icon: Workflow,
    role: 'Custom Agentic Framework',
    tagline: 'Build Your Own Agent Army',
    features: [
      'Task management integration',
      'Expert agents learning system',
      'Custom skills & commands'
    ],
    capabilities: [
      'Rich Logging',
      'Git Integration',
      'Token Tracking'
    ],
    description: 'Customizable agentic harness for consulting agencies, featuring rich observability, expert agents that learn from their work, and seamless integration with any task management system. Build your custom agent army.',
    technologies: ['Claude Code', 'Python', 'Git', 'Linear', 'Jira', 'Langfuse'],
    useCases: [
      'Autonomous project development',
      'Multi-agent consulting workflows',
      'Custom agency automation platforms',
      'AI-optimized codebase management'
    ],
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1000&auto=format&fit=crop',
    detailedInfo: {
      architecture: 'Extensible harness with hook system, custom skills, and platform-agnostic task management. Expert agents learn from completed tasks and improve over time.',
      integrations: ['Linear', 'Jira', 'GitHub', 'GitLab', 'Azure DevOps', 'Langfuse', 'Custom APIs'],
      benefits: [
        'Build custom agents in hours vs weeks',
        'Complete observability with Langfuse integration',
        'Agents learn and improve from completed tasks',
        'Task management system agnostic'
      ],
      deployment: 'Self-hosted or cloud deployment with Docker. Supports multiple concurrent agent instances with advanced hook system.'
    }
  },
  {
    id: 'claude-orchestrator',
    unit: 'ORCH-NEO4J-05',
    name: 'Claude Agent Orchestrator',
    Icon: Network,
    role: 'Multi-Agent Coordination',
    tagline: 'Knowledge-Powered Agent Network',
    features: [
      'Knowledge graph inference',
      'Performance metrics',
      'Token tracking & optimization'
    ],
    capabilities: [
      'Neo4j/Graphiti',
      'Langfuse Observability',
      'Multi-Agent Routing'
    ],
    description: 'Sophisticated multi-agent orchestration system with knowledge graph-powered inference, comprehensive observability, and intelligent agent routing based on task requirements and performance metrics.',
    technologies: ['Neo4j', 'Graphiti', 'Langfuse', 'Python', 'FastAPI', 'Redis'],
    useCases: [
      'Coordinate multiple specialized agents',
      'Track and optimize agent performance',
      'Build intelligent agent routing systems',
      'Knowledge retention across sessions'
    ],
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000&auto=format&fit=crop',
    detailedInfo: {
      architecture: 'Central orchestrator with Neo4j knowledge graph for context management and agent selection. Graphiti powers semantic episodic memory for long-term knowledge retention.',
      integrations: ['Neo4j', 'Graphiti', 'Langfuse', 'Multiple Claude Code Agents', 'Redis', 'FastAPI'],
      benefits: [
        'Intelligent task routing to optimal agents',
        'Complete visibility into agent performance',
        'Knowledge retention across agent sessions',
        'Token usage optimization and tracking'
      ],
      deployment: 'FastAPI backend with Neo4j database and Langfuse observability platform. Redis for caching and session management.'
    }
  },
  {
    id: 'meet-transcript-processor',
    unit: 'TRANSCRIPT-06',
    name: 'Meet Transcript Processor',
    Icon: FileText,
    role: 'Post-Session Automation',
    tagline: 'Transcript In, Linear Issues Out',
    features: [
      'Gmail transcript pickup',
      'Linear issue extraction',
      'Draft replies generated'
    ],
    capabilities: [
      'Google Meet',
      'Linear API',
      'Agent Review'
    ],
    description: 'Drag-drop a Google Meet transcript, or let Gmail polling pick it up automatically, and get structured Linear issues, action items, and a draft reply without reading the transcript yourself.',
    technologies: ['FastAPI', 'Vue 3', 'Google Meet API', 'Linear API', 'Claude Code'],
    useCases: [
      'Post-client-session triage',
      'Sales call follow-up automation',
      'Internal stand-up action tracking'
    ],
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1000&auto=format&fit=crop',
    detailedInfo: {
      architecture: 'FastAPI backend + Vue 3 frontend. Claude agent team: orchestrator -> meet-fetch -> turn-extract -> dedup -> linear-draft -> validator.',
      integrations: ['Google Workspace', 'Linear', 'Gmail', 'Claude Code'],
      benefits: [
        'Zero manual triage',
        'Every action item captured',
        'Linear issues in under 2 minutes per session'
      ],
      deployment: 'Hosted behind authenticated access with Gmail polling and review queues.'
    }
  },
  {
    id: 'autonomous-coding-agent',
    unit: 'AUTO-AGENT-07',
    name: 'Autonomous Coding Agent',
    Icon: GitPullRequest,
    role: 'Self-Directed Development',
    tagline: 'Linear Issue to Merged PR, Unattended',
    features: [
      '15-minute coding loop',
      'Isolated git worktrees',
      'Automatic PR summaries'
    ],
    capabilities: [
      'Linear Queue',
      'GitHub PRs',
      'Verifier Agent'
    ],
    description: 'A cron-driven agent loop that scores your Linear backlog, picks the highest-priority issues, writes the code in isolated git worktrees, and opens pull requests around the clock.',
    technologies: ['Claude Code', 'Linear API', 'GitHub API', 'Python', 'Git worktrees'],
    useCases: [
      'Backlog burn-down without sprint planning',
      'Bug fix SLAs met overnight',
      'Continuous feature development on a fixed budget'
    ],
    image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1000&auto=format&fit=crop',
    detailedInfo: {
      architecture: 'Python orchestrator with scoring, parallel worktree execution, authenticated CLI lanes, and verifier reports before PR handoff.',
      integrations: ['Linear', 'GitHub', 'AWS Secrets Manager', 'Langfuse'],
      benefits: [
        'Engineering output without engineering headcount',
        'PRs open while you sleep',
        'Full observability via Langfuse'
      ],
      deployment: 'Mac Mini launchd or GitHub Actions with configurable parallelism and per-issue timeouts.'
    }
  },
  {
    id: 'ai-team-build-session',
    unit: 'HERMES-SESSION-08',
    name: 'AI Team Build Session',
    Icon: Users,
    role: 'Productized Service',
    tagline: 'Your AI Team, Wired and Live in 60 Minutes',
    features: [
      'Orchestrator plus departments',
      'Telegram-first access',
      'Portable YAML profiles'
    ],
    capabilities: [
      'Hermes',
      'Telegram',
      'Live Build'
    ],
    description: 'A structured 60-minute session where we scaffold your Hermes AI agent team live, wire it to Telegram, and leave you with working agents plus portable profile files.',
    technologies: ['Hermes', 'Claude Max', 'Telegram', 'YAML', 'Mac Mini / Linux'],
    useCases: [
      'Founders wanting AI ops without hiring',
      'Consultants building client AI teams',
      'Teams automating research, content, and sales in parallel'
    ],
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1000&auto=format&fit=crop',
    detailedInfo: {
      architecture: 'Hermes gateway plus per-department profile YAMLs, Telegram bots, and delegation routing through a named orchestrator.',
      integrations: ['Hermes', 'Telegram', 'Claude Max', 'Linux', 'Mac Mini'],
      benefits: [
        'Working AI team at session end',
        'No vendor lock-in',
        'Telegram-first access from any phone'
      ],
      deployment: 'Runs on client-owned or GBAutomation-hosted infrastructure with isolated profile and credential boundaries.'
    }
  }
];
