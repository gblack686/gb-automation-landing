import { generateClient } from 'aws-amplify/data';

const operations={read:['queries','forgeWorkshopRead'],save:['mutations','forgeWorkshopSave'],run:['mutations','forgeWorkshopRun'],status:['queries','forgeWorkshopStatus']};
let client;
export async function workshopCommand(method,input) {
  const operation=operations[method];
  if(!operation)throw new Error('Command unavailable.');
  client ||= generateClient();
  const response=await client[operation[0]][operation[1]]({input:JSON.stringify(input)},{authMode:'userPool'});
  if(response.errors?.length)throw new Error('workshop_transport_error');
  let data=response.data?.payload;
  if(typeof data==='string')data=JSON.parse(data);
  if(!data)throw new Error('workshop_transport_error');
  return data;
}
