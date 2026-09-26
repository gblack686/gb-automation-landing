/** Artist Packet Expert: original procedural study of the finished Forge portrait.
 * Stylized geometry, inferred sides/back. No rig, photogrammetry or likeness claim.
 * Factory takes the host's Three.js instance; no renderer or global side effects.
 */
export function createAvatar(T, context = {}) {
  const root = new T.Group(); root.name = 'Artist Packet Expert / stylized study';
  const mat = (color, roughness = .5, metalness = 0) => new T.MeshStandardMaterial({color, roughness, metalness});
  const skin = mat('#b57451', .73), lip = mat('#784834', .83);
  const hair = mat('#151c2a', .63), hairLight = mat('#293043', .58);
  const indigo = mat('#172e55', .83), blue = mat('#365a80', .8);
  const white = mat('#d8d9cd', .52, .22), steel = mat('#7d949e', .4, .55);
  const gold = mat('#c9914c', .37, .6), dark = mat('#15222f', .55, .28);
  const cloth = mat('#d1c7aa', .9), ink = mat('#254f76', .65);
  // Actual finished portrait pixels supply the paint, not just a prose palette.
  const source = context.referenceTexture;
  function painted(region, fallback, roughness=.66, metalness=0) {
    if (!source) return mat(fallback,roughness,metalness);
    const t=source.clone();t.needsUpdate=true;
    const [x,y,w,h]=region;t.repeat.set(w/1024,h/1024);t.offset.set(x/1024,1-(y+h)/1024);
    return new T.MeshStandardMaterial({color:'#ffffff',map:t,roughness,metalness});
  }
  const facePaint = source ? new T.MeshStandardMaterial({map:source,roughness:.88}) : skin;
  const armorPaint=painted([666,439,200,140],'#ccc5c6',.53,.34);
  const robePaint=painted([64,665,117,172],'#162961',.91);
  const hairPaint=painted([345,36,254,121],'#121a36',.79);
  const beardPaint=painted([396,364,169,61],'#14172a',.86);
  const bandPaint=painted([415,153,105,50],'#e9d6c9',.9);
  if(source){skin.map=painted([491,263,68,91],'#b57451').map;skin.color.set('#ffffff');skin.roughness=.87;}
  const lapis=mat('#315cc8',.36,.28), ember=mat('#e66027',.51,.15);
  function mesh(name, geo, material, pos = [0,0,0], scale = [1,1,1], parent = root) {
    const m = new T.Mesh(geo, material); m.name = name; m.position.set(...pos); m.scale.set(...scale);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const ell = (name, p, s, material, parent = root) => mesh(name, new T.SphereGeometry(1,20,16), material, p,s,parent);
  function curve(name, points, radius, material, parent=root) {
    return mesh(name, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))), 24,radius,7,false),material,[0,0,0],[1,1,1],parent);
  }
  function tapered(name, points, radius, material, parent=root) {
    const c = new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const geo = new T.TubeGeometry(c,24,radius,9,false);
    const a = geo.attributes.position;
    for(let i=0;i<=24;i++) {
      const p=c.getPointAt(i/24), factor=Math.sin(Math.PI*(.06+.92*i/24))**.5;
      for(let j=0;j<=9;j++) { const k=i*10+j; a.setXYZ(k,p.x+(a.getX(k)-p.x)*factor,p.y+(a.getY(k)-p.y)*factor,p.z+(a.getZ(k)-p.z)*factor); }
    }
    geo.computeVertexNormals(); return mesh(name,geo,material,[0,0,0],[1,1,1],parent);
  }
  function ribbon(name, points, width, material, parent=root) {
    const path = new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const positions=[],indices=[];
    for(let i=0;i<=32;i++) {
      const p=path.getPoint(i/32), t=path.getTangent(i/32);
      const side=new T.Vector3(-t.y,t.x,0).normalize().multiplyScalar(width*(1-.2*i/32)/2);
      for(const s of [-1,1]) positions.push(p.x+s*side.x,p.y+s*side.y,p.z+s*side.z);
      if(i<32) { const k=i*2; indices.push(k,k+1,k+2,k+1,k+3,k+2); }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
    const m=material.clone();m.side=T.DoubleSide; return mesh(name,g,m,[0,0,0],[1,1,1],parent);
  }
  // Gallery pedestal and cut bust, with a consistent floor origin.
  mesh('Obsidian base',new T.CylinderGeometry(.96,1.05,.18,80),dark,[0,.09,0]);
  mesh('Brass inlay',new T.CylinderGeometry(.98,.98,.035,80),gold,[0,.2,0]);
  mesh('Pedestal',new T.CylinderGeometry(.66,.88,.48,64),dark,[0,.45,0]);
  ell('Robe torso',[0,1.57,-.03],[1.0,1.03,.48],robePaint);
  ell('Neck',[0,2.74,0],[.31,.57,.32],skin);
  for(const s of [-1,1]) {
    const shoulder=ell('Robe shoulder',[s*.91,2.05,0],[.51,.63,.49],robePaint);
    shoulder.rotation.z=s*.25;
    for(let i=0;i<5;i++) curve('Robe fold',[[s*(.25+i*.12),2.31,-.37],[s*(.36+i*.13),1.9,-.49],[s*(.27+i*.13),1.14,-.31]],.025,blue);
  }
  // Wrapped collar follows the chest in true geometry, also readable from the side.
  ribbon('Ivory inner collar',[[-.3,2.77,.25],[-.45,2.42,.4],[-.12,1.84,.5],[.46,1.23,.41]],.19,cloth);
  ribbon('Blue inner collar',[[.3,2.77,.26],[.42,2.46,.4],[.15,1.99,.52],[-.45,1.26,.45]],.31,blue);
  ribbon('Ivory outer collar',[[.43,2.68,.25],[.58,2.38,.4],[.31,1.94,.56],[-.32,1.2,.5]],.12,white);
  ribbon('Gold collar edge',[[-.46,2.58,.35],[-.6,2.26,.43],[-.21,1.72,.52]],.06,gold);
  // Each shoulder has four curved, overlapping armor lames and individual rivets.
  for(const s of [-1,1]) {
    const armorPoint=(row,u,a)=>{const r=.54+row*.025;return [s*(.75+row*.04+u*.08+r*.95*Math.cos(a)),2.64-row*.18-u*.21,r*Math.sin(a)];};
    for(let row=0;row<4;row++) {
      const g=new T.BufferGeometry(), positions=[],indices=[],uvs=[];
      for(let i=0;i<=18;i++) for(let j=0;j<=5;j++) {
        const theta=-1.55+3.10*i/18, u=j/5;
        positions.push(...armorPoint(row,u,theta));
        uvs.push(i/18,1-(row+u)/4);
      }
      for(let i=0;i<18;i++) for(let j=0;j<5;j++){const k=i*6+j;indices.push(k,k+6,k+1,k+1,k+6,k+7);}
      g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
      g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
      const plateMat=armorPaint.clone();plateMat.side=T.DoubleSide;mesh('Ivory shoulder lame '+row,g,plateMat);
      const edge=[];
      for(let i=0;i<=18;i++)edge.push(armorPoint(row,1,-1.55+3.10*i/18));
      curve('Armor brass rim',edge,.016,gold);
      for(const a of [-1.37,-.88,-.3,.3,.88,1.37]) {
        const p=armorPoint(row,.35,a);
        ell('Armor rivet',p,[.025,.025,.025],gold);
        curve('Indigo armor binding',[armorPoint(row,0,a),armorPoint(row,1,a)],.014,indigo);
        // Twin engraved borders and hairline scratches make the plates read as
        // individually weathered miniature armor instead of smooth white blocks.
        curve('Binding gilt thread',[armorPoint(row,.04,a-.025),armorPoint(row,.94,a-.025)],.004,gold);
      }
      for(let i=0;i<9;i++) {
        const a=-1.4+i*.34;
        curve('Etched plate scratch',[armorPoint(row,.52,a),armorPoint(row,.67,a+.035)],.004,steel);
      }
    }
    ell('Upper armor clasp',[s*.56,2.49,.36],[.065,.09,.035],gold);
    // Ornamental scrollwork and lapis cabochons retain the samurai design while
    // borrowing the intricate paint and craftsmanship of a war-game miniature.
    for(let i=0;i<3;i++) {
      const cx=s*(.60+i*.028), cy=2.34-i*.18, z=.445;
      const arc=[];for(let k=0;k<=16;k++){const a=k/16*Math.PI*2;arc.push([cx+Math.cos(a)*.053,cy+Math.sin(a)*.066,z]);}
      curve('Ceremonial gilt scroll',arc,.009,gold);
      mesh('Lapis armor jewel',new T.OctahedronGeometry(.031),lapis,[cx,cy,z+.019],[1,1,.5]);
    }
    for(let i=0;i<4;i++) ribbon('Brocade gold stitch',[[s*(.39+i*.032),2.48,.39],[s*(.48+i*.033),2.3,.46],[s*(.18+i*.027),1.82,.562]],.012,i%2?ember:gold);
  }
  // Continuous head surface. Nose, jaw, cheekbones and eye recesses are sculpted
  // into the surface rather than a flat portrait or a stack of unrelated boxes.
  const head = new T.Group();head.position.set(0,3.35,.015);head.rotation.z=-.035;root.add(head);
  const skull=new T.SphereGeometry(1,80,64), v=skull.attributes.position, uv=skull.attributes.uv;
  const gauss=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
  for(let i=0;i<v.count;i++) {
    const nx=v.getX(i),ny=v.getY(i),nz=v.getZ(i);
    const jaw=ny<-.3 ? 1-(Math.abs(ny)-.3)*.29 : 1;
    let x=nx*.57*jaw,y=ny*.79,z=nz*.48;
    if(nz>0) {
      const f=Math.min(1,nz*3);
      z+=f*(.10*gauss(x,y,0,.03,.085,.28)+.10*gauss(x,y,0,-.065,.12,.1)
        +.045*(gauss(x,y,-.28,-.09,.17,.18)+gauss(x,y,.28,-.09,.17,.18))
        -.045*(gauss(x,y,-.22,.19,.13,.1)+gauss(x,y,.22,.19,.13,.1))
        +.045*gauss(x,y,0,-.36,.24,.13));
    }
    v.setXYZ(i,x,y,z);
    // Front projection fits the painted face to the curved head. These are real
    // portrait UVs; posterior surfaces use separate unprojected material.
    uv.setXY(i,(477+x*246)/1024,1-(289-y*230)/1024);
  }
  skull.clearGroups();
  const ix=skull.index, front=[], back=[];
  for(let i=0;i<ix.count;i+=3){const z=(v.getZ(ix.getX(i))+v.getZ(ix.getX(i+1))+v.getZ(ix.getX(i+2)))/3;
    (z>.12?front:back).push(ix.getX(i),ix.getX(i+1),ix.getX(i+2));}
  skull.setIndex([...front,...back]);skull.addGroup(0,front.length,0);skull.addGroup(front.length,back.length,1);
  skull.computeVertexNormals();mesh('Sculpted portrait-painted face',skull,[facePaint,skin],[0,0,0],[1,1,1],head);
  for(const s of [-1,1]) {
    ell('Ear',[s*.53,.02,-.03],[.105,.185,.09],skin,head);
    ell('Inner ear',[s*.58,.02,.035],[.04,.11,.035],lip,head);
    if(!source) {
    const eye=ell('Eye',[s*.218,.175,.444],[.118,.036,.026],mat('#bfb6a1',.6),head);eye.rotation.z=s*.1;
    ell('Iris',[s*.211,.176,.468],[.031,.030,.009],mat('#393a2c',.6),head);
    ell('Pupil',[s*.211,.176,.476],[.014,.022,.005],hair,head);
    ell('Eye glint',[s*.211-.007,.186,.481],[.006,.006,.003],white,head);
    curve('Upper eyelid',[[s*.10,.17,.46],[s*.21,.212,.477],[s*.335,.188,.422]],.016,lip,head);
    curve('Lower eyelid',[[s*.10,.17,.46],[s*.21,.137,.468],[s*.335,.188,.422]],.012,skin,head);
    tapered('Strong brow',[[s*.10,.257,.46],[s*.235,.313,.453],[s*.37,.278,.397]],.035,hair,head);
    ell('Nose wing',[s*.073,-.08,.605],[.065,.045,.04],skin,head);
    ell('Nostril',[s*.069,-.112,.625],[.024,.014,.009],lip,head);
    }
  }
  if(!source) {
  curve('Mouth',[[-.15,-.281,.481],[-.07,-.298,.515],[0,-.289,.527],[.07,-.298,.515],[.15,-.281,.481]],.012,lip,head);
  ell('Lower lip',[0,-.326,.502],[.118,.025,.019],skin,head);
  }
  // Beard patch wraps the lower face; short tapered strands break the silhouette.
  const beardGeo=new T.SphereGeometry(1,64,32,0,Math.PI*2,Math.PI*.62,Math.PI*.37);
  mesh('Sculpted beard',beardGeo,beardPaint,[0,-.03,-.005],[.54,.78,.53],head);
  for(const s of [-1,1]) {
    if(!source)tapered('Moustache',[[0,-.205,.563],[s*.085,-.215,.552],[s*.18,-.26,.48]],.039,hair,head);
    for(let i=0;i<9;i++) {
      const x=s*(.08+i*.045), y=-.45+(.07+i*.02);
      tapered('Beard lock',[[x,y,.45-i*.019],[x*.85,y-.13,.46-i*.018],[x*.72,y-.22,.39-i*.014]],.027,beardPaint,head);
    }
  }
  // Headband is a curved cloth band around the actual skull, including the knot.
  const bandGeo=new T.CylinderGeometry(.546,.567,.21,64,1,true);
  mesh('Linen headband',bandGeo,bandPaint,[0,.455,0],[1,1,.84],head);
  for(const y of [.36,.55]) {
    const pts=[];for(let i=0;i<=64;i++){const a=i*Math.PI*2/64;pts.push([.559*Math.sin(a),y,.473*Math.cos(a)]);}
    curve('Headband hem',pts,.009,white,head);
  }
  curve('Headband blue crest',[[-.074,.417,.477],[-.104,.46,.471],[-.056,.511,.48],[.023,.508,.48],[.073,.46,.473],[.029,.42,.48],[-.023,.436,.482]],.012,ink,head);
  mesh('Crest diamond',new T.OctahedronGeometry(.04),gold,[0,.469,.486],[1,1,.3],head);
  ell('Band knot',[.37,.46,-.40],[.15,.1,.1],cloth,head);
  ribbon('Long headband tail',[[.36,.48,-.42],[.76,.39,-.50],[1.10,.13,-.48],[1.22,-.18,-.34]],.16,cloth,head);
  ribbon('Short headband tail',[[.40,.44,-.40],[.62,.05,-.48],[.68,-.25,-.46]],.13,cloth,head);
  // Swept sculptural locks. Deterministic, with clear negative space around band.
  ell('Hair cap',[0,.57,-.10],[.584,.39,.49],hairPaint,head);
  for(let i=0;i<13;i++) {
    const x=-.51+i*.075, z=.27-.16*Math.cos(i*.48), crest=.80+.16*Math.sin(i*.31);
    tapered('Swept crown lock',[[x,.57,z],[x+.07,crest,.27],[x+.16,crest+.06,-.09],[x+.22,.63,-.43]],.075+(i%3)*.01,hairPaint,head);
    for(let j=0;j<3;j++)tapered('Incised hair strand',[[x+j*.018-.02,.595,z+.058],[x+.07+j*.016,crest+.048,.29],[x+.16+j*.014,crest+.086,-.085],[x+.22,.65,-.40]],.0055,j===0?lapis:(j===1?hairLight:ember),head);
  }
  for(const s of [-1,1]) for(let i=0;i<6;i++) {
    tapered('Side swept lock',[[s*.48,.67-i*.08,-.04],[s*(.61+i*.009),.52-i*.09,-.12],[s*.62,.28-i*.12,-.32],[s*.45,.07-i*.12,-.47]],.069,hairPaint,head);
  }
  for(let i=0;i<7;i++) {
    const x=-.51+i*.13;
    tapered('Loose swept hair filament',[[x,.67,.19],[x-.08,.88+i*.015,.25],[x+.02,1.04+i*.012,.06],[x+.19,1.01+i*.014,-.08]],.019,hairPaint,head);
  }
  for(let i=0;i<9;i++) {
    const x=(i-4)*.113;
    tapered('Nape lock',[[x,.40,-.45],[x*1.1,.04,-.51],[x*.89,-.39,-.37]],.079,hairPaint,head);
  }
  // A small physical portfolio held at the chest echoes the reference's role cue.
  const packet=new T.Group();packet.name='Glowing artist packet';packet.position.set(0,1.42,.69);packet.rotation.set(-.12,0,-.10);root.add(packet);
  const glow=new T.MeshStandardMaterial({color:'#ffd48a',emissive:'#ff942f',emissiveIntensity:.42,roughness:.65});
  mesh('Packet frame',new T.BoxGeometry(1.25,.82,.065),gold,[0,0,0],[1,1,1],packet);
  mesh('Packet page',new T.BoxGeometry(1.19,.76,.024),glow,[0,0,.045],[1,1,1],packet);
  if(source) {
    const pagePaint=painted([275,599,368,269],'#eeb369',.7);
    pagePaint.emissive=new T.Color('#df681a');pagePaint.emissiveIntensity=.12;
    mesh('Source-painted artist packet',new T.PlaneGeometry(1.13,.70),pagePaint,[0,0,.069],[1,1,1],packet);
  } else {
  for(const [x,y,w,h] of [[-.25,.08,.53,.42],[.26,.18,.34,.06],[.26,.05,.34,.045],[.26,-.07,.34,.045],[-.31,-.25,.38,.12],[.20,-.25,.51,.12]])
    mesh('Packet layout',new T.BoxGeometry(w,h,.012),ink,[x,y,.063],[1,1,1],packet);
  // Abstract artist silhouette, all mesh geometry, with no text or raster texture.
  ell('Packet artist head',[-.25,.15,.084],[.052,.058,.01],gold,packet);
  mesh('Packet artist silhouette',new T.ConeGeometry(.11,.21,12),gold,[-.25,.005,.084],[1,1,.1],packet);
  }
  for(const s of [-1,1]) {
    ell('Sleeve',[s*.78,1.32,.3],[.27,.35,.32],robePaint);
    ell('Hand',[s*.60,1.44,.69],[.12,.16,.12],skin);
    for(let i=0;i<4;i++) curve('Finger',[[s*.61,1.55-i*.065,.75],[s*.54,1.55-i*.065,.81],[s*.49,1.52-i*.065,.82]],.026,skin);
  }
  root.userData = {status:'stylized_draft', source:'finished Forge portrait', referencePaint:!!source,
    treatment:'Detailed hand-painted tabletop war-game figurine', hidden_surfaces:'inferred', rig:false};
  return root;
}
