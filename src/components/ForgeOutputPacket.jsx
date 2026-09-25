import {useVisualImage} from '../lib/useVisualImage';
import {packetItems} from '../lib/forgePacketItems';
function PacketTile({job,role,label,icon,onView}){
 const isModel=['master','web'].includes(role),url=useVisualImage(job,isModel?'':role),asset=job?.assets?.[role];
 const reviewRole=role.startsWith('avatar')?'portrait':role;
 const approved=asset&&job?.stages?.[reviewRole]?.review?.decision==='approve'&&(job?.stages?.[reviewRole]?.review?.sha256===asset?.sha256||role.startsWith('avatar')&&job?.stages?.portrait?.review?.sha256===asset?.input_sha256);
 return <button className="packet-tile" disabled={!asset} onClick={()=>onView(role)} aria-label={`Inspect ${label}`}>
  <div className={role.startsWith('avatar')?'packet-image packet-avatar':'packet-image'}>{url?<img src={url} width={role.startsWith('avatar')?Number(role.slice(6)):undefined} alt={label}/>:<span>{icon}</span>}</div>
  <strong>{label}</strong><small>{asset?(approved?'✓ Approved':isModel?'Ready to inspect':role==='card'||role==='source_card'?'Reference saved':'Review pending'):'○ Pending generation'}</small>
 </button>;
}
export default function ForgeOutputPacket({job,onView}){
 const items=packetItems.filter(([role])=>!job||job.pipeline_version===2||!['source_card','agent_card'].includes(role)).filter(([role])=>!job||job.output_version===2||!role.startsWith('avatar'));
 return <section className="packet-overview"><h2>Your output package</h2><p className="visual-muted">{job?'Inspect each saved asset. The ZIP unlocks after all reviews pass.':'Save a card selection to begin. These are the outputs your job will create.'}</p><div className="packet-grid">{items.map(([role,label,icon])=><PacketTile key={role} job={job} role={role} label={label} icon={icon} onView={onView}/>)}</div><div className="packet-records">▤ Manifest · brief · selected card text · source printing · generation receipt</div></section>;
}
