// Check new build output against private feed literals. Only equivalent files
// from an explicitly pinned, already-public release may retain existing prose.
// Equivalence allows only CRLF-to-LF checkout conversion. Credentials and opaque
// graph identities are never exempted. Print counts only.
import {readdirSync,readFileSync,lstatSync} from 'node:fs';
import {join,relative,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const secrets=/AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|(?:sk|pk)-lf-[a-f0-9-]{32,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/;
const defaultRepo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const normalizeCRLF=bytes=>Buffer.from(bytes.toString('latin1').replaceAll('\r\n','\n'),'latin1');

export function auditBuild({root='dist',feed,repo=defaultRepo,publicBaseline=null}) {
  root=resolve(root);repo=resolve(repo);
  if(publicBaseline && (!/^[a-f0-9]{40}$/.test(publicBaseline) || spawnSync('git',['cat-file','-e',`${publicBaseline}^{commit}`],{cwd:repo}).status!==0)) throw Error('Invalid public baseline commit');
  const forbidden=[];let feedSha256=null,contextLiteralsChecked=0;
  const add=(value,baselineAllowed=true)=>forbidden.push({value,baselineAllowed});
  if(feed) {
    const bytes=readFileSync(feed);feedSha256=createHash('sha256').update(bytes).digest('hex');
    const x=JSON.parse(bytes.toString('utf8'));
    for(const n of x.topology.nodes)for(const value of [n.description,n.source_url])if(value.length>=24)add(value);
    for(const row of x.docs.rows)for(const value of [row.title,row.path])if(value.length>=24)add(value);
    for(const n of x.context_graph?.nodes||[]) {
      add(n.id,false);contextLiteralsChecked++;
      if(n.label.length>=24){add(n.label);contextLiteralsChecked++;}
    }
  }
  let files=0,privateMatches=0,credentialMatches=0,preexistingPublicMatches=0;
  function isUnchangedPublicFile(file,bytes) {
    if(!publicBaseline)return false;
    const path=relative(root,file).replaceAll('\\','/');
    const result=spawnSync('git',['show',`${publicBaseline}:public/${path}`],{cwd:repo,maxBuffer:64*1024*1024});
    return result.status===0 && normalizeCRLF(bytes).equals(normalizeCRLF(result.stdout));
  }
  function walk(path) {
    for(const name of readdirSync(path)) {
      const file=join(path,name),stat=lstatSync(file);
      if(stat.isSymbolicLink())throw Error('Build contains an unsupported symbolic link');
      if(stat.isDirectory()){walk(file);continue;}
      if(!/\.(?:js|css|html|json)$/.test(file))continue;
      files++;
      const bytes=readFileSync(file),text=bytes.toString('utf8');
      if(secrets.test(text))credentialMatches++;
      const matches=forbidden.filter(({value})=>text.includes(value)||text.includes(JSON.stringify(value).slice(1,-1)));
      if(!matches.length)continue;
      if(matches.every(x=>x.baselineAllowed) && isUnchangedPublicFile(file,bytes))preexistingPublicMatches++;
      else privateMatches++;
    }
  }
  walk(root);
  return {ok:privateMatches===0&&credentialMatches===0,files,feedSha256,publicBaseline,baselineComparison:'same path and bytes; CRLF-to-LF only',
    privateLiteralsChecked:forbidden.length,contextLiteralsChecked,privateMatches,credentialMatches,preexistingPublicMatches};
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2),i=args.indexOf('--public-baseline');
  const publicBaseline=i<0?null:args.splice(i,2)[1];
  if(i>=0&&!publicBaseline)throw Error('Public baseline commit required');
  if(args.length>2)throw Error('Usage: audit-system-home-build.mjs [dist] [private-feed] [--public-baseline <40hex>]');
  const result=auditBuild({root:args[0]||'dist',feed:args[1],publicBaseline});
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exitCode=1;
}
