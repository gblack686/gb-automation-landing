import { choice, TypeSafeClient } from '@typesafe-ai/sdk';

const questions = {source:choice('Which workspace source is most likely to contain the record sought by this search query?',{
 proposal:'A proposed plan, approval card, or planned implementation',
 session:'A previous conversation, session summary, decision, or discussion',
 pr:'A GitHub pull request, review, merge, or code change record',
 code:'A source file, function, symbol, architecture component, or Graft node',
 all:'The query does not clearly point to one of these sources',
})};

export async function classifySearch(query,key) {
 if(typeof key!=='string'||key.trim().length<12)throw Error('Jev key unavailable');
 const client=new TypeSafeClient({apiKey:key,defaultModel:'jev-latest',retry:{maxRetries:0},timeout:2500,logLevel:'error'});
 const result=await client.systemOne({state:{text:query},questions});
 return result.answers.source.choice;
}
