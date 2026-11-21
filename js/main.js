'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const S=v=>'S/ '+v.toFixed(2),r2=v=>Math.round(v*100)/100,today=()=>new Date().toISOString().slice(0,10);
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const TONES={roommates:'Rakiy te ayudará a dejar cuentas claras con tus roommates.',pareja:'Rakiy llevará el registro de forma neutral, sin que se sienta como desconfianza.',familia:'Rakiy mantendrá los aportes de la familia visibles para todos.'};
const st={group:{name:'Depa Los Olivos',type:'roommates'},
 members:[{id:'yo',name:'Tú',status:'Activo'},{id:'ana',name:'Ana',status:'Activo'},{id:'luis',name:'Luis',status:'Activo'}],
 exp:[{id:1,desc:'Internet',amt:90,cat:'Internet',payer:'ana',date:'2026-11-05',by:'ana',sh:{yo:30,ana:30,luis:30}},
      {id:2,desc:'Víveres de la semana',amt:60,cat:'Víveres',payer:'yo',date:'2026-11-10',by:'yo',sh:{yo:20,ana:20,luis:20}}],
 pay:[],n:3,edit:null};
const nm=id=>(st.members.find(m=>m.id===id)||{name:id}).name;

/* ---- Mensajes (HU-047) ---- */
let tt;function toast(msg,err){const t=$('#toast');t.textContent=msg;t.className='show'+(err?' error':'');clearTimeout(tt);tt=setTimeout(()=>t.className='',3500)}
function fieldErr(id,msg){const i=$('#'+id),e=$('#'+id+'E');if(e)e.textContent=msg||'';if(i)msg?i.setAttribute('aria-invalid','true'):i.removeAttribute('aria-invalid');return !msg}

/* ---- Navegación, teclado y responsive (HU-045, 048) ---- */
$('#menuBtn').onclick=e=>{const o=$('#nav').classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',o)};
$$('#nav a').forEach(a=>a.onclick=()=>{$('#nav').classList.remove('open');$('#menuBtn').setAttribute('aria-expanded','false')});

/* ---- Grupo (HU-001, 002, 003, 004) ---- */
const gType=()=>$('input[name=gType]:checked').value;
$$('input[name=gType]').forEach(r=>r.onchange=()=>$('#tone').textContent=TONES[gType()]);
$('#tone').textContent=TONES.roommates;
$('#groupForm').onsubmit=e=>{e.preventDefault();const n=$('#gName').value.trim();
 if(!fieldErr('gName',n?'':'El nombre del grupo es obligatorio.')){toast('Revisa el nombre del grupo.',1);return}
 st.group={name:n,type:gType()};st.members=[{id:'yo',name:'Tú',status:'Activo'}];st.exp=[];st.pay=[];endEdit();$('#gName').value='';renderAll();toast('Grupo «'+n+'» creado. Invita a tus convivientes para empezar.')};
$('#inviteForm').onsubmit=e=>{e.preventDefault();const v=$('#iMail').value.trim();
 if(!fieldErr('iMail',emailOk(v)?'':'Ingresa un correo válido, por ejemplo nombre@correo.com.')){toast('No se pudo enviar la invitación.',1);return}
 st.members.push({id:'m'+st.n++,name:v.split('@')[0],status:'Invitado'});$('#iMail').value='';renderAll();toast('Invitación enviada a '+v)};
$('#copyLink').onclick=async()=>{const l=location.href.split('#')[0]+'?grupo='+encodeURIComponent(st.group.name);
 try{await navigator.clipboard.writeText(l);toast('Enlace copiado.')}catch(_){toast('No se pudo copiar. Copia el enlace manualmente: '+l,1)}};
function renderMembers(){$('#gTitle').textContent='Integrantes de «'+st.group.name+'» ('+st.group.type[0].toUpperCase()+st.group.type.slice(1)+')';
 $('#members').innerHTML=st.members.map(m=>`<li><span>${esc(m.name)}</span><span class="badge ${m.status==='Activo'?'ok':'pend'}">${m.status}</span></li>`).join('')}

/* ---- Cálculos ---- */
function split(amt,mode,ids,vals){ // devuelve {sh} o {error}
 if(!ids.length)return{error:'Selecciona al menos un participante.'};
 const sh={};
 if(mode==='equal'){const b=Math.floor(amt*100/ids.length)/100;let rest=r2(amt-b*ids.length);ids.forEach((i,k)=>sh[i]=r2(b+(k===0?rest:0)))}
 else{const sum=r2(ids.reduce((a,i)=>a+(+vals[i]||0),0));
  if(mode==='custom'){if(Math.abs(sum-amt)>0.009)return{error:`Los montos suman ${S(sum)} y deben sumar ${S(amt)}.`};ids.forEach(i=>sh[i]=r2(+vals[i]||0))}
  else{if(Math.abs(sum-100)>0.009)return{error:`Los porcentajes suman ${sum}% y deben sumar 100%.`};ids.forEach(i=>sh[i]=r2(amt*(+vals[i]||0)/100))}}
 return{sh}}
function debts(){const d={};const add=(a,b,v)=>{d[a+'>'+b]=(d[a+'>'+b]||0)+v};
 st.exp.forEach(e=>Object.entries(e.sh).forEach(([m,v])=>{if(m!==e.payer)add(m,e.payer,v)}));
 st.pay.forEach(p=>add(p.from,p.to,-p.amt));return d}
const pair=(d,a,b)=>r2((d[b+'>'+a]||0)-(d[a+'>'+b]||0)); // >0: b le debe a a
function nets(){const n={};st.members.forEach(m=>n[m.id]=0);const d=debts();
 Object.keys(d).forEach(k=>{const[a,b]=k.split('>');n[a]=(n[a]||0)-d[k];n[b]=(n[b]||0)+d[k]});return n}
function settlement(){const n=nets(),c=[],dd=[];
 Object.entries(n).forEach(([i,v])=>{v=r2(v);if(v>0.009)c.push([i,v]);else if(v<-0.009)dd.push([i,-v])});
 c.sort((a,b)=>b[1]-a[1]);dd.sort((a,b)=>b[1]-a[1]);const out=[];
 while(c.length&&dd.length){const x=r2(Math.min(c[0][1],dd[0][1]));out.push({from:dd[0][0],to:c[0][0],amt:x});
  c[0][1]=r2(c[0][1]-x);dd[0][1]=r2(dd[0][1]-x);if(c[0][1]<=0.009)c.shift();if(dd[0][1]<=0.009)dd.shift()}
 return out}

/* ---- Saldos (HU-021, 022, 023, 024, 028, 029) ---- */
function renderBalance(){const d=debts();let owe=0,owed=0;
 const rows=st.members.filter(m=>m.id!=='yo').map(m=>{const b=pair(d,'yo',m.id);if(b>0)owed+=b;else owe-=b;
  const txt=b>0.009?`<span class="pos">▲ ${esc(m.name)} te debe ${S(b)}</span>`:b<-0.009?`<span class="neg">▼ Le debes ${S(-b)} a ${esc(m.name)}</span>`:'<span>Sin deudas</span>';
  return`<li>${txt}<span class="badge ${Math.abs(b)>0.009?'pend':'ok'}">${Math.abs(b)>0.009?'Pendiente':'Pagado'}</span></li>`}).join('');
 $('#pairs').innerHTML=rows;$('#bOwe').textContent=S(owe);$('#bOwed').textContent=S(owed);
 const net=r2(owed-owe);$('#bNet').textContent=(net>0?'+ ':net<0?'− ':'')+S(Math.abs(net))+(net>0?' a favor':net<0?' en deuda':'');
 $('#bNet').className=net>0?'pos':net<0?'neg':'';
 const s=settlement();$('#settle').innerHTML=s.length?s.map((t,i)=>`<li><span>${esc(nm(t.from))} → ${esc(nm(t.to))}: <b>${S(t.amt)}</b></span><button class="btn sm" data-pay="${i}">Registrar pago</button></li>`).join(''):'<li>Todas las cuentas están saldadas.</li>';
 $$('[data-pay]').forEach(b=>b.onclick=()=>payDialog(s[b.dataset.pay]))}
function payDialog(t){openDlg(`<h3>Registrar pago</h3><p>${esc(nm(t.from))} paga a ${esc(nm(t.to))}</p>
 <label for="pAmt">Monto (S/)</label><input id="pAmt" type="number" step="0.01" min="0" value="${t.amt}"><p class="err" id="pAmtE" role="alert"></p>
 <label for="pDate">Fecha</label><input id="pDate" type="date" value="${today()}"><p class="err" id="pDateE" role="alert"></p>
 <button class="btn amber" id="pOk" type="button">Confirmar pago</button>`);
 $('#pOk').onclick=()=>{const a=r2(+$('#pAmt').value),d=$('#pDate').value;
  const ok1=fieldErr('pAmt',a>0?'':'Ingresa un monto mayor a cero.'),ok2=fieldErr('pDate',d?'':'Indica la fecha del pago.');
  if(!ok1||!ok2)return toast('Revisa los datos del pago.',1);
  st.pay.push({from:t.from,to:t.to,amt:a,date:d});$('#dlg').close();renderAll();toast('Pago de '+S(a)+' registrado. Los saldos se actualizaron.')}}

/* ---- Registrar gasto (HU-007, 008, 009, 011, 014, 015, 016, 017, 018, 019) ---- */
const mode=()=>$('input[name=mode]:checked').value;
function renderParts(keep){const old={};$$('#parts .part').forEach(p=>old[p.dataset.id]={on:p.querySelector('[type=checkbox]').checked,v:p.querySelector('[type=number]').value});
 const m=mode();$('#parts').innerHTML=st.members.map(x=>{const o=old[x.id]||(keep&&keep[x.id])||{on:true,v:''};
  return`<div class="part" data-id="${x.id}"><input type="checkbox" id="c_${x.id}" ${o.on?'checked':''}><span><label for="c_${x.id}" style="margin:0">${esc(x.name)}</label></span>
  <input type="number" step="0.01" min="0" value="${o.v}" aria-label="${m==='pct'?'Porcentaje':'Monto'} de ${esc(x.name)}" ${m==='equal'?'hidden':''}></div>`}).join('');
 $$('#parts input').forEach(i=>i.oninput=i.onchange=preview);
 const cur=$('#ePay').value;$('#ePay').innerHTML=st.members.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');if(cur)$('#ePay').value=cur;preview()}
function readSplit(){const amt=r2(+$('#eAmt').value),ids=[],vals={};
 $$('#parts .part').forEach(p=>{if(p.querySelector('[type=checkbox]').checked){ids.push(p.dataset.id);vals[p.dataset.id]=p.querySelector('[type=number]').value}});
 return{amt,...(amt>0?split(amt,mode(),ids,vals):{error:''})}}
function preview(){const s=readSplit();$('#splitE').textContent=s.error||'';
 $('#preview').innerHTML=s.sh?Object.entries(s.sh).map(([i,v])=>`<li><span>${esc(nm(i))}</span><b>${S(v)}</b></li>`).join(''):'<li>Ingresa un monto para ver cuánto le corresponde a cada integrante.</li>'}
$$('input[name=mode]').forEach(r=>r.onchange=()=>renderParts());$('#eAmt').oninput=preview;
$('#expForm').onsubmit=e=>{e.preventDefault();const s=readSplit(),desc=$('#eDesc').value.trim();
 const a=fieldErr('eAmt',s.amt>0?'':'Ingresa un monto mayor a cero.'),b=fieldErr('eDesc',desc?'':'La descripción es obligatoria.');
 if(!a||!b||s.error)return toast(s.error||'Completa los campos obligatorios para guardar el gasto.',1);
 const rec={desc,amt:s.amt,cat:$('#eCat').value,payer:$('#ePay').value,sh:s.sh};
 if(st.edit){Object.assign(st.exp.find(x=>x.id===st.edit),rec);toast('Gasto actualizado.')}
 else{st.exp.push({id:st.n++,date:today(),by:'yo',...rec});toast('Gasto «'+desc+'» guardado. Los saldos se actualizaron.')}
 endEdit();renderAll()};
function endEdit(){st.edit=null;$('#expForm').reset();$('#editMsg').hidden=true;$('#cancelEdit').hidden=true;$('#saveExp').textContent='Guardar gasto';renderParts()}
$('#cancelEdit').onclick=endEdit;
function startEdit(id){const e=st.exp.find(x=>x.id===id);st.edit=id;$('#eAmt').value=e.amt;$('#eDesc').value=e.desc;$('#eCat').value=e.cat;
 const keep={};st.members.forEach(m=>keep[m.id]={on:m.id in e.sh,v:e.sh[m.id]||''});
 document.querySelector('input[name=mode][value=custom]').checked=true;$('#parts').innerHTML='';renderParts(keep);$('#ePay').value=e.payer;
 $('#editMsg').textContent='Editando «'+e.desc+'». Los montos se muestran como personalizados.';$('#editMsg').hidden=false;$('#cancelEdit').hidden=false;$('#saveExp').textContent='Guardar cambios';
 $('#dlg').close();location.hash='#gasto';$('#eAmt').focus()}

/* ---- Historial (HU-038, 040, 011, 012) ---- */
function renderHist(){$('#hist').innerHTML=[...st.exp.map(e=>({k:'g',d:e.date,e})),...st.pay.map(p=>({k:'p',d:p.date,p}))].sort((a,b)=>b.d.localeCompare(a.d))
 .map(x=>x.k==='g'?`<li><span>${x.d} · <b>${esc(x.e.desc)}</b> · ${S(x.e.amt)} · pagó ${esc(nm(x.e.payer))}</span><button class="btn sm ghost" data-det="${x.e.id}">Ver detalle</button></li>`
  :`<li><span>${x.d} · Pago: ${esc(nm(x.p.from))} → ${esc(nm(x.p.to))} · ${S(x.p.amt)}</span></li>`).join('')||'<li>Aún no hay movimientos.</li>';
 $$('[data-det]').forEach(b=>b.onclick=()=>detail(+b.dataset.det))}
function detail(id){const e=st.exp.find(x=>x.id===id),d=debts();
 openDlg(`<h3>${esc(e.desc)} · ${S(e.amt)}</h3><p>Registrado por ${esc(nm(e.by))} el ${e.date}. Categoría: ${esc(e.cat)}. Pagó: ${esc(nm(e.payer))}.</p>
 <ul class="list">${Object.entries(e.sh).map(([m,v])=>`<li><span>${esc(nm(m))}: ${S(v)}</span>${m===e.payer?'<span class="badge ok">Pagó</span>':`<span class="badge ${(d[m+'>'+e.payer]||0)>0.009?'pend':'ok'}">${(d[m+'>'+e.payer]||0)>0.009?'Pendiente':'Pagado'}</span>`}</li>`).join('')}</ul>
 <button class="btn ghost" id="dEdit" type="button">Editar</button> <button class="btn danger" id="dDel" type="button">Eliminar</button>`);
 $('#dEdit').onclick=()=>startEdit(id);
 $('#dDel').onclick=()=>{$('#dlgBody').innerHTML=`<h3>¿Eliminar «${esc(e.desc)}»?</h3><p>Los saldos se recalcularán. Esta acción no se puede deshacer.</p><button class="btn danger" id="dYes" type="button">Sí, eliminar</button> <button class="btn ghost" id="dNo" type="button">Cancelar</button>`;
  $('#dYes').onclick=()=>{st.exp=st.exp.filter(x=>x.id!==id);$('#dlg').close();renderAll();toast('Gasto eliminado.')};$('#dNo').onclick=()=>$('#dlg').close()}}
function openDlg(h){$('#dlgBody').innerHTML=h;$('#dlg').showModal()}

/* ---- Contacto (HU-044) ---- */
$('#contactForm').onsubmit=e=>{e.preventDefault();const n=$('#cName').value.trim(),m=$('#cMail').value.trim(),g=$('#cMsg').value.trim();
 const r=[fieldErr('cName',n?'':'El nombre completo es obligatorio.'),fieldErr('cMail',!m?'El correo es obligatorio.':emailOk(m)?'':'Ingresa un correo con formato válido.'),fieldErr('cMsg',g?'':'Escribe tu mensaje.')];
 if(r.includes(false))return toast('Corrige los campos marcados para enviar tu solicitud.',1);
 e.target.reset();toast('¡Gracias, '+n.split(' ')[0]+'! Recibimos tu solicitud.')};

function renderAll(){renderMembers();renderParts();renderBalance();renderHist()}
renderAll();
