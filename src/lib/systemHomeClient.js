import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { createSystemSession } from './systemHome.mjs';
let client;
export function openSystemSession(onInvalidate) {
 return createSystemSession({session:fetchAuthSession,onInvalidate,
  listen:callback=>Hub.listen('auth',({payload})=>callback(payload.event)),
  request:async view=>{
   client ||= generateClient();
   // Explicit query also works with existing browser outputs whose generated
   // operation metadata predates this additive backend field.
   const response=await client.graphql({query:'query SystemHomeRead($input: AWSJSON!) { forgeSystemHomeRead(input: $input) { payload } }',
    variables:{input:JSON.stringify({view})},authMode:'userPool'});
   if(response.errors?.length)throw Object.assign(Error('Session could not be verified.'),{code:'authentication_required'});
   let p=response.data?.forgeSystemHomeRead?.payload;if(typeof p==='string')p=JSON.parse(p);
   if(!p?.ok)throw Object.assign(Error('System Home is unavailable.'),{code:p?.error||'system_unavailable'});
   return p.data;
  }});
}
