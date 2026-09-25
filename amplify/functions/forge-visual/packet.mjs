import {assertJob,stagesFor,fail} from './domain.mjs';

export function packetFor(job){
 assertJob(job);
 const required=job.pipeline_version===2?['source_card','card','portrait','agent_card','character','master','web']:['card','portrait','character','master','web'];
 if(job.status!=='ready'||!job.stages.web?.metrics?.passed||required.some(role=>!job.assets[role])||stagesFor(job).some(stage=>job.stages[stage]?.review?.decision!=='approve'||job.stages[stage]?.review?.sha256!==job.assets[stage]?.sha256))fail('packet_not_ready');
 const names={source_card:'reference-full-card.jpg',card:'reference-art-only.jpg',portrait:'agent-portrait.png',agent_card:'agent-full-card.png',character:'agent-full-character.png',master:'agent-master.glb',web:'agent-web.glb'};
 return {schema:'forge-visual-packet.v1',run_id:job.id,tenant_id:job.tenant_id,expert_id:job.expert_id,config_sha256:job.config_sha256,pipeline_version:job.pipeline_version||1,revision:job.revision,status:'approved',
  files:required.map(role=>({role,filename:names[role],...job.assets[role]})),
  source:job.assets.card?.printing||null,card_text:job.card_text||null,
  lineage:{portrait:['card'],...(job.pipeline_version===2?{agent_card:['source_card','portrait','card_text']}:{}),character:['portrait'],master:['character'],web:['master']},
  metadata_files:['manifest.json','generation-receipt.json','brief.json','card-text.json','source-printing.json'],web_metrics:job.stages.web.metrics};
}
