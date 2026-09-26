"""Explicit, bounded provider proof. Synthetic text only; never records a microphone."""
import argparse
import json
from pathlib import Path
import threading
import psutil
from playwright.sync_api import sync_playwright


def run(url, output):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        context.request.get(url + '/')  # local operator cookie, no UI or microphone
        page = context.new_page()
        page.on('console', lambda message: print(message.text, flush=True) if message.text.startswith('forge-probe:') else None)
        page.route('**/forge-voice-proof', lambda route: route.fulfill(content_type='text/html', body='<title>Bounded voice proof</title>'))
        page.goto(url + '/forge-voice-proof', wait_until='domcontentloaded', timeout=15000)
        try:
            result = page.evaluate('''async()=>{
 console.info('forge-probe: reading local configuration');
 const html=await(await fetch('/')).text();
 const match=html.match(/id="private-studio-data" type="application\\/json">(.*?)<\\/script>/s);
 const binding=JSON.parse(match[1]).scope;
 const api=async body=>{const r=await fetch('/api/forge/builder',{method:'POST',headers:{'Content-Type':'application/json','X-Forge-Request':'builder.v1'},body:JSON.stringify({binding,...body})});const v=await r.json();if(!v.ok)throw Error(v.error);return v.result;};
 const state=await api({action:'read'});console.info('forge-probe: requesting bounded session');const session=await api({action:'voice',version:state.draft.version,confirmed:true});
 console.info('forge-probe: importing provider client');
 const {Conversation}=await import('/forge-voice-client.js');
 const captures=[],events=[];let client;
 const outcome=new Promise((resolve,reject)=>{
  window.liveVoiceResolve=resolve;window.liveVoiceReject=reject;
 });
 const timeout=setTimeout(()=>{window.liveVoiceExpired=true;window.liveVoiceReject(Error('live_voice_timeout'));},45000);
 try{
  console.info('forge-probe: connecting');
  const starting=Conversation.startSession({signedUrl:session.signed_url,connectionType:'websocket',
   overrides:{conversation:{textOnly:true},agent:{prompt:{prompt:session.prompt,tool_ids:[session.tool_id]},firstMessage:'Tell me about the work you would like help with.'}},
   onError:()=>window.liveVoiceReject(Error('provider_conversation_error')),
   onMessage:message=>{events.push(message.source);console.info('forge-probe: '+message.source+' message');},
   clientTools:{capture_intake:args=>{captures.push(args);window.liveVoiceResolve(true);return JSON.stringify({covered:5,total:5,remaining:[],review_required:true});}}});
  starting.then(value=>{if(!client&&window.liveVoiceExpired)value.endSession();});
  client=await Promise.race([starting,outcome]);
  console.info('forge-probe: sending synthetic brief');
  client.sendUserMessage('This is synthetic test data. We want to turn weekly approved artist media into a branded HTML packet. Artists and their managers use it. Use approved files in Google Drive. The output is a responsive artist packet. Success means every credit is present and the mobile layout passes review.');
  await outcome;
  const fields=[...new Set(captures.flatMap(c=>c.answers.map(a=>a.field)))];
  const evidence=captures.every(c=>c.answers.every(a=>typeof a.evidence==='string'&&a.evidence.length>0));
  return {status:fields.length>=3&&evidence?'pass':'partial',provider:'elevenlabs',mode:'live_text_only',captured_fields:fields,evidence_present:evidence,
   conversation_id:client.getId(),reservation_id:session.session_id,microphone_used:false,draft_mutated:false,max_seconds:45,events};
 }catch(error){return {status:'fail',error:error.message,provider:'elevenlabs',mode:'live_text_only',reservation_id:session.session_id,microphone_used:false,draft_mutated:false,events};
 }finally{clearTimeout(timeout);await client?.endSession();}
}''')
            output.write_text(json.dumps(result, indent=2) + '\n')
            print(json.dumps(result))
            if result['status'] != 'pass':
                raise SystemExit(1)
        finally:
            browser.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--live', action='store_true', required=True)
    args = parser.parse_args()
    # A hung browser may also stop its JS timers. Bound the owned browser from
    # outside Chromium; the provider separately enforces its 300-second ceiling.
    def stop_owned_browser():
        for child in reversed(psutil.Process().children(recursive=True)):
            try:
                child.terminate()
            except psutil.NoSuchProcess:
                pass
    watchdog = threading.Timer(90, stop_owned_browser)
    watchdog.daemon = True
    watchdog.start()
    try:
        run(args.url.rstrip('/'), args.output)
    except Exception as error:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps({'status': 'fail', 'error_type': type(error).__name__,
            'mode': 'live_text_only', 'microphone_used': False, 'draft_mutated': False}, indent=2) + '\n')
        raise SystemExit(1)
    finally:
        watchdog.cancel()
