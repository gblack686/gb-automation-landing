import {store,queue} from './storage.mjs';
import {providers} from './providers.mjs';
import {optimize} from './optimize.mjs';
import {makeWorker} from './worker.mjs';
const work=makeWorker({store,queue,providers,optimize});
export async function handler(event:{Records:{messageId:string;body:string}[]}){
 const batchItemFailures=[];
 for(const record of event.Records){try{const input=JSON.parse(record.body);await work(input.id);}catch{batchItemFailures.push({itemIdentifier:record.messageId});}}
 return {batchItemFailures};
}
