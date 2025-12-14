# Portfolio Documentation

**Created**: December 13, 2025
**Source**: Greg Black - Sr AI and Data Engineer Resume
**Purpose**: Portfolio data for website integration

---

## Overview

This portfolio contains annotated project data from two organizations:

1. **RevStar Consulting** (Sep 2025 - Present) - 3 projects
2. **GBAutomation/Agentic Workflows** (Jun 2024 - Present) - 7 projects

**Total**: 10 projects across cloud engineering, AI/ML, automation, and sales intelligence

---

## File Structure

```
portfolio/
├── README.md                      # This file
├── portfolio.json                 # Master portfolio with all projects
├── revstar-projects.json          # RevStar Consulting projects only
├── gbautomation-projects.json     # GBAutomation projects only
└── (future: agent-scenes/)        # AI-generated scenes for each project
```

---

## Project Categories

### RevStar Consulting (Enterprise Cloud & AI)

1. **Enterprise-Scale Data Lake Solutions**
   - Category: Data Engineering
   - Technologies: AWS S3, Glue, Athena, Lake Formation
   - Focus: Data governance and quality automation

2. **LLMOps Frameworks for Production AI**
   - Category: AI/MLOps
   - Technologies: AWS Bedrock, SageMaker, Lambda
   - Focus: Production AI deployment with monitoring

3. **Infrastructure as Code (IaC) Solutions**
   - Category: DevOps/Infrastructure
   - Technologies: AWS CDK, CloudFormation
   - Focus: Security, scalability, cost optimization

### GBAutomation (AI Agents & Automation)

1. **25+ Workflow Automations & Backend Infrastructures**
   - Category: Automation Infrastructure
   - Technologies: n8n, Zapier, Supabase, Python
   - Impact: 85% reduction in manual work

2. **AI Web Scraper & Agentic RAG Pipeline**
   - Category: AI Data Extraction
   - Technologies: Python, Selenium, RAG, Vector DBs
   - Scale: 100+ websites scraped daily

3. **Salesforce CRM AI Agents**
   - Category: CRM Automation
   - Technologies: Salesforce, AI Agents, LLMs
   - Focus: Autonomous lead enrichment

4. **CRM & Sales Intelligence Knowledge Graph**
   - Category: Data Intelligence
   - Technologies: Knowledge Graphs, Neo4j, NLP
   - Feature: Natural language queries

5. **AI Sales Development Representative**
   - Category: Sales Automation
   - Technologies: LLMs, SMS APIs, AI Agents
   - Feature: 24/7 automated qualification

6. **Lead Enrichment & API Architecture**
   - Category: Data Enrichment
   - Technologies: Clay, Python, Middleware
   - Scale: 130+ data sources

7. **AI-Powered GTM Strategies**
   - Category: Marketing Strategy
   - Technologies: Predictive AI, Personalization
   - Focus: Pipeline optimization

---

## JSON Structure

### Master Portfolio (`portfolio.json`)

```json
{
  "meta": {},
  "professional_info": {},
  "companies": [
    {
      "id": "revstar",
      "projects": [...]
    },
    {
      "id": "gbautomation",
      "projects": [...]
    }
  ],
  "project_summary": {}
}
```

### Individual Project Schema

Each project contains:

```json
{
  "id": "unique_project_id",
  "title": "Project Name",
  "category": "project_category",
  "status": "production",
  "tags": ["tag1", "tag2"],
  "description": "Detailed description",
  "business_value": "Business impact explanation",
  "technical_challenges": ["challenge1", "challenge2"],
  "impact": {
    "scope": "Impact scope",
    "metrics": {},
    "outcomes": []
  },
  "technologies": {
    "category1": ["tech1", "tech2"],
    "category2": ["tech3"]
  },
  "deliverables": ["deliverable1", "deliverable2"],
  "agent_scene": {
    "prompt": "Scene generation prompt for AI",
    "description": "Visual description",
    "style": "Style guide for consistency"
  }
}
```

---

## Agent Scene Prompts

Each project includes an `agent_scene` object with:

- **prompt**: Detailed prompt for AI image generation (Nano Banana Pro)
- **description**: Human-readable scene description
- **style**: Style guide referencing brand colors (cream #F3F1E7, terracotta #D97757)

**Next Step**: Generate AI scenes for each project using the prompts in the JSON files.

---

## Technology Stack Summary

### Cloud & Infrastructure
- AWS (S3, Glue, Athena, Lake Formation, Bedrock, SageMaker, Lambda, CDK)

### AI & Machine Learning
- LLMs (GPT-4, Claude)
- RAG (Retrieval Augmented Generation)
- Vector Databases (Weaviate, Pinecone)
- Knowledge Graphs (Neo4j)
- NLP & Semantic Search

### Automation & Integration
- n8n, Zapier
- Python, FastAPI
- REST APIs, GraphQL, Webhooks

### Platforms & Tools
- Supabase (PostgreSQL)
- Salesforce CRM
- Clay (Enrichment)
- Selenium, Playwright (Scraping)

### Data & Analytics
- SQL Server, PostgreSQL
- Power BI, Tableau
- Data Quality Automation

---

## Metrics & Impact

### RevStar Consulting
- **Scope**: Enterprise-scale AWS solutions
- **Focus**: Data governance, AI operations, infrastructure automation
- **Clients**: Enterprise organizations

### GBAutomation
- **Automation**: 25+ workflows, 5+ backend systems
- **AI Agents**: Deployed across sales, marketing, CRM
- **Data Efficiency**: 85% reduction in manual data gathering
- **Scale**: 100+ websites, 130+ data sources
- **Clients**: SaaS and AI startups

---

## Website Integration Guide

### For Portfolio Display

1. **Load master portfolio**:
   ```javascript
   const portfolio = await fetch('/portfolio/portfolio.json').then(r => r.json());
   ```

2. **Filter by company**:
   ```javascript
   const revstarProjects = portfolio.companies.find(c => c.id === 'revstar').projects;
   const gbautomationProjects = portfolio.companies.find(c => c.id === 'gbautomation').projects;
   ```

3. **Display project cards**:
   - Use `title`, `description`, `tags`, `impact.outcomes`
   - Show agent scene images (when generated)
   - Link to detailed project pages

4. **Category filtering**:
   ```javascript
   const categories = portfolio.project_summary.categories;
   const aiProjects = allProjects.filter(p => p.category.includes('ai'));
   ```

### For Agent Scenes

Use the `agent_scene` prompts to generate visuals:

```javascript
project.agent_scene.prompt  // Use with Nano Banana Pro
project.agent_scene.style   // Brand style guide
```

---

## Next Steps

1. ✅ Portfolio annotations complete
2. 🔲 Generate AI scenes for each project using Nano Banana Pro
3. 🔲 Integrate into website portfolio section
4. 🔲 Create project detail pages
5. 🔲 Add case study narratives
6. 🔲 Link to live demos/GitHub repos (if applicable)

---

## Notes

- All projects are marked `status: "production"` (currently deployed/delivered)
- Agent scene prompts maintain brand consistency (cream #F3F1E7, terracotta #D97757)
- Technical challenges and business value included for storytelling
- Metrics and outcomes quantified where possible
- Technologies categorized for filtering and search

---

**Maintained by**: Greg Black
**Last Updated**: December 13, 2025
**Contact**: gblack686@gmail.com
