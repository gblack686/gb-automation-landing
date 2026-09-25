// Local editorial drafts: no model call and no provider charge.
export function cardTextVariants(job) {
 const base=job.card_text||{}, name=job.brief.expert.display_name;
 const inherited={mana_cost:base.mana_cost||'',creature_type:base.creature_type||`Expert Agent — ${job.brief.expert.domain||'Artist Deliverables'}`,power:base.power||'',toughness:base.toughness||''};
 return {schema:'forge-card-text-variants.v1',method:'local-role-templates',variants:[
  {id:'clear',label:'The curator',text:{...inherited,title:name,abilities:'Curate — Gather approved media into a branded artist packet.\nPresent — Give every story a clear, shareable home.',quote:'Every artist has a story. Give it a worthy frame.'}},
  {id:'mythic',label:'The storyteller',text:{...inherited,title:'The Storykeeper',abilities:'Gather the Threads — Unite an artist’s images, music, and memories.\nA Worthy Stage — Shape the collection into a story ready to share.',quote:'A spark becomes a story when someone gives it a stage.'}},
  {id:'practical',label:'The producer',text:{...inherited,title:'The Packet Architect',abilities:'Assemble — Bring approved bios, media, and links together.\nDeliver — Build a cohesive packet for its next audience.',quote:'The right story. The right assets. Ready to share.'}}
 ]};
}
