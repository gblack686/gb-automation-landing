import { Cloud, Code, Video, Workflow, Network } from 'lucide-react';

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
        'Reduce manual AWS console navigation',
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
        'Reduce feature development cycle time',
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
        'Reduce content production time',
        'Lower production cost versus traditional agencies',
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
        'Accelerate custom agent builds',
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
  }
];
