const KEY='sweets_store_v1', $=id=>document.getElementById(id);
let S={products:[],customers:[],orders:[],seq:0,hideOut:false};
try{const r=localStorage.getItem(KEY);if(r)S=Object.assign(S,JSON.parse(r))}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S));return true}catch(e){toast('تعذّر الحفظ — المساحة ممتلئة، قلّل حجم الصور');return false}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fd=ts=>{const d=new Date(ts);return d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear()};
const dk=k=>k.split('-').map(Number).reverse().join('/');
const fmt=n=>(+n||0).toFixed(2), uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function toast(t){const m=$('msg');m.textContent=t;m.style.display='block';clearTimeout(m._t);m._t=setTimeout(()=>m.style.display='none',3200)}
let cart={};

/* ---------- الزبائن ---------- */
function renderCust(){
  const cs=$('cs'),v=cs.value;
  cs.innerHTML='<option value="">— اختر السوبرماركت —</option>'+S.customers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')+'<option value="new">+ زبون جديد</option>';
  cs.value=v||'';
}
function custChange(){$('nc').classList.toggle('hide',$('cs').value!=='new')}

/* ---------- المنتجات ---------- */
function renderProds(){
  const g=$('pg');
  const V=S.products.filter(p=>!p.hide&&!(S.hideOut&&p.stock<=0));
  if(!V.length){g.innerHTML='<div class="box" style="grid-column:1/-1;text-align:center;color:var(--mut)">لا توجد أصناف متاحة حالياً.</div>';return}
  g.innerHTML=V.map(p=>`<div class="p ${p.stock<=0?'out':''}" data-id="${p.id}">
    ${p.img?`<img src="${p.img}" alt="">`:'<div class="ph"></div>'}
    <div class="i"><b>${esc(p.name)}</b><div class="pr">${fmt(p.price)} د.أ <small style="color:var(--mut);font-weight:400">· متوفر ${p.stock}</small></div>
    ${p.stock<=0?'<span class="low">نفد المخزون</span>':`<div class="q"><button onclick="qty('${p.id}',1)">+</button><span id="q${p.id}">${cart[p.id]||0}</span><button onclick="qty('${p.id}',-1)">−</button></div>`}
    </div></div>`).join('');
  if(window.gsap&&window.ScrollTrigger){gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.batch('.p',{onEnter:b=>gsap.fromTo(b,{y:40,opacity:0},{y:0,opacity:1,stagger:.08,duration:.7,ease:'power3.out'}),once:true})}
}
function qty(id,d){
  const p=S.products.find(x=>x.id===id);if(!p)return;
  const n=Math.max(0,Math.min(p.stock,(cart[id]||0)+d));
  if(n===0)delete cart[id];else cart[id]=n;
  if(d>0&&n===p.stock&&(cart[id]||0)===p.stock)toast('وصلت للحد الأقصى المتوفر');
  $('q'+id).textContent=n;updBar();
}
function cartItems(){return Object.keys(cart).map(id=>{const p=S.products.find(x=>x.id===id);return p&&{id,n:p.name,p:p.price,c:p.cost||0,q:cart[id]}}).filter(Boolean)}
function updBar(){
  const it=cartItems(),t=it.reduce((s,x)=>s+x.p*x.q,0);
  $('bc').textContent=it.length+' أصناف';$('bt').textContent=fmt(t)+' د.أ';
  $('bar').classList.toggle('on',it.length>0);
}

/* ---------- الطلب والفاتورة ---------- */
async function submitOrder(){
  let c,v=$('cs').value;
  if(!v)return toast('اختر الزبون أولاً');
  if(v==='new'){
    const n=$('cn').value.trim(),p=$('cp').value.trim();
    if(!n||p.replace(/\D/g,'').length<8)return toast('أدخل الاسم ورقم واتساب صحيح');
    c={id:uid(),name:n,phone:p};S.customers.push(c);
  }else c=S.customers.find(x=>x.id===v);
  const it=cartItems();if(!it.length)return toast('لم تختر أي صنف');
  for(const x of it){const p=S.products.find(y=>y.id===x.id);if(p.stock<x.q)return toast('الكمية غير كافية: '+p.name)}
  const btn=$('sb');btn.disabled=true;btn.textContent='جارٍ التجهيز…';
  it.forEach(x=>{S.products.find(y=>y.id===x.id).stock-=x.q});
  const o={id:uid(),no:++S.seq,date:Date.now(),cust:{name:c.name,phone:c.phone},items:it.map(({n,p,c,q})=>({n,p,c,q})),total:it.reduce((s,x)=>s+x.p*x.q,0)};
  S.orders.push(o);save();
  cart={};renderCust();$('cs').value='';custChange();$('cn').value=$('cp').value='';renderProds();updBar();
  try{await sendInvoice(o)}catch(e){toast('تم حفظ الطلب، لكن تعذّر تجهيز الفاتورة')}
  btn.disabled=false;btn.textContent='إرسال الطلب';
}
const invBlocks=o=>[{t:'head',title:'محمد الحسيني',sub:'فاتورة طلب',left:['رقم: '+o.no,fd(o.date)]},
  {t:'text',s:'الزبون: '+o.cust.name,size:30},
  {t:'table',h:['الصنف','الكمية','السعر','المجموع'],w:[.4,.15,.2,.25],rows:o.items.map(x=>[x.n,String(x.q),fmt(x.p),fmt(x.p*x.q)])},
  {t:'text',s:'الإجمالي: '+fmt(o.total)+' د.أ',size:40,bold:1,color:'#b88a3e',align:'left'},
  {t:'text',s:'شكراً لتعاملكم معنا',color:'#8a7a6e',align:'center'}];
const makePDF=o=>docToPDF(invBlocks(o));
function buildPDF(J){
  const enc=new TextEncoder(),ch=[],off=[];let len=0;
  const push=v=>{const b=typeof v==='string'?enc.encode(v):v;ch.push(b);len+=b.length};
  const obj=(id,f)=>{off[id]=len;push(id+' 0 obj\n');f();push('\nendobj\n')};
  const n=J.length,tot=3+3*n;
  push('%PDF-1.4\n');
  obj(1,()=>push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2,()=>push(`<< /Type /Pages /Count ${n} /Kids [${J.map((_,i)=>(3+3*i)+' 0 R').join(' ')}] >>`));
  J.forEach((j,i)=>{const p=3+3*i,cs=`q 595 0 0 842 0 0 cm /Im${i} Do Q`;
    obj(p,()=>push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${i} ${p+2} 0 R >> >> /Contents ${p+1} 0 R >>`));
    obj(p+1,()=>push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
    obj(p+2,()=>{push(`<< /Type /XObject /Subtype /Image /Width ${j.w} /Height ${j.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${j.d.length} >>\nstream\n`);push(j.d);push('\nendstream')})});
  const xr=len;push(`xref\n0 ${tot}\n0000000000 65535 f \n`);
  for(let i=1;i<tot;i++)push(String(off[i]).padStart(10,'0')+' 00000 n \n');
  push(`trailer\n<< /Size ${tot} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`);
  return new Blob(ch,{type:'application/pdf'});
}
async function docToPDF(blocks){
  try{await document.fonts.load('700 28px Tajawal');await document.fonts.load('400 28px Tajawal')}catch(e){}
  const W=1190,H=1684,M=80,R=W-M,CW=W-2*M,pages=[];let c,x,y;
  const np=()=>{c=document.createElement('canvas');c.width=W;c.height=H;x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.direction='rtl';x.textBaseline='middle';pages.push(c);y=M};
  const font=(z,b)=>{x.font=`${b?700:400} ${z}px Tajawal, Tahoma, sans-serif`};
  const fit=(t,w)=>{t=String(t);if(x.measureText(t).width<=w)return t;while(t.length>1&&x.measureText(t+'…').width>w)t=t.slice(0,-1);return t+'…'};
  np();
  for(const b of blocks){
    if(b.t==='head'){
      font(54,1);x.fillStyle='#2b1d16';x.textAlign='right';x.fillText(b.title,R,y+30);
      font(28);x.fillStyle='#8a7a6e';x.fillText(b.sub,R,y+84);
      x.textAlign='left';(b.left||[]).forEach((l,i)=>x.fillText(l,M,y+30+i*50));
      y+=124;x.fillStyle='#b88a3e';x.fillRect(M,y,CW,4);y+=34;
    }else if(b.t==='text'){
      const z=b.size||28;if(y+z+30>H-M)np();
      font(z,b.bold);x.fillStyle=b.color||'#2b1d16';x.textAlign=b.align||'right';
      x.fillText(b.s,b.align==='left'?M:b.align==='center'?W/2:R,y+z/2+6);y+=z+26;
    }else if(b.t==='table'){
      const row=(cells,hd)=>{font(26);x.fillStyle=hd?'#8a7a6e':'#2b1d16';x.textAlign='right';let cr=R;
        cells.forEach((t,i)=>{const w=b.w[i]*CW;x.fillText(fit(t,w-20),cr-10,y+29);cr-=w});
        y+=58;x.fillStyle='#eadfce';x.fillRect(M,y-1,CW,2)};
      if(y+116>H-M)np();row(b.h,1);
      b.rows.forEach(r=>{if(y+58>H-M){np();row(b.h,1)}row(r)});y+=24;
    }
  }
  const J=[];
  for(const p of pages){const bl=await new Promise(r=>p.toBlob(r,'image/jpeg',.92));J.push({d:new Uint8Array(await bl.arrayBuffer()),w:W,h:H})}
  return buildPDF(J);
}
function showLink(u,name){
  $('md').innerHTML=`<div class="box" style="max-width:400px;width:100%;text-align:center"><h3 style="margin-top:0">الملف جاهز</h3>
  <p class="sub">اضغط الرابط لفتح الملف أو حفظه.</p><div class="row" style="flex-direction:column;align-items:stretch">
  <a class="btn" style="text-decoration:none;text-align:center" href="${u}" download="${name}" target="_blank">فتح / حفظ ${name}</a>
  <button class="btn o" onclick="$('md').style.display='none'">إغلاق</button></div></div>`;$('md').style.display='grid';
}
async function savePDF(blob,name){
  let dl=null;try{dl=window.claude&&await claude.use('downloads')}catch(e){}
  if(dl){try{await dl.save({filename:name,data:blob});toast('تم حفظ الملف');return}
    catch(e){if(e&&e.code==='declined')return;toast('تعذّر الحفظ المباشر، جرّب الرابط')}}
  showLink(URL.createObjectURL(blob),name);
}
function waNum(p){let n=String(p).replace(/\D/g,'');if(n.startsWith('00'))n=n.slice(2);if(n.startsWith('962'))n=n.slice(3);return '962'+n.replace(/^0+/,'')}
let cur={};
async function sendInvoice(o){
  const blob=await makePDF(o),num=waNum(o.cust.phone);
  cur={o,blob,name:`invoice-${o.no}.pdf`,num};
  const f=new File([blob],cur.name,{type:'application/pdf'}),cs=navigator.canShare&&navigator.canShare({files:[f]});
  $('md').innerHTML=`<div class="box" style="max-width:400px;width:100%;text-align:center"><h3 style="margin-top:0">تم تسجيل الطلب رقم ${o.no} ✓</h3>
  <p class="sub">الإجمالي ${fmt(o.total)} د.أ<br>${esc(o.cust.name)} · <span dir="ltr">+${num}</span></p>
  <div class="row" style="flex-direction:column;align-items:stretch"><button class="btn" onclick="dlPDF()">1) تنزيل الفاتورة PDF</button>
  <button class="btn" onclick="openWA()">2) فتح واتساب على رقم الزبون</button>
  ${cs?'<button class="btn o" onclick="shareF()">مشاركة الملف مباشرة</button>':''}
  <button class="btn o" onclick="$('md').style.display='none'">إغلاق</button></div>
  <p class="sub" style="font-size:13px;margin:12px 0 0">نزّل الفاتورة أولاً، ثم افتح المحادثة وأرفق الملف.</p></div>`;
  $('md').style.display='grid';
}
const waText=o=>`مرحباً ${o.cust.name}، هذه فاتورة طلبك رقم ${o.no} من محمد الحسيني بإجمالي ${fmt(o.total)} د.أ. شكراً لكم 🌸`;
const dlPDF=()=>savePDF(cur.blob,cur.name);
function openWA(){window.open(`https://wa.me/${cur.num}?text=${encodeURIComponent(waText(cur.o))}`,'_blank')}
async function shareF(){try{await navigator.share({files:[new File([cur.blob],cur.name,{type:'application/pdf'})],text:waText(cur.o)})}catch(e){}}

/* ---------- الإدارة ---------- */
const authed=()=>{try{return sessionStorage.getItem('adm')==='1'}catch(e){return false}};
let tab='prods',editId=null;
function goAdmin(){$('shop').classList.add('hide');$('admin').classList.remove('hide');scrollTo(0,0);authView()}
function goShop(){$('admin').classList.add('hide');$('shop').classList.remove('hide');renderProds();renderCust()}
function authView(){const a=authed();$('ah').classList.toggle('hide',!a);$('login').classList.toggle('hide',a);$('panel').classList.toggle('hide',!a);$('lo').classList.toggle('hide',!a);if(a)renderTabs()}
function login(){
  if($('u').value.trim()==='m7md'&&$('w').value==='2001'){try{sessionStorage.setItem('adm','1')}catch(e){}$('u').value=$('w').value='';authView()}
  else toast('اسم المستخدم أو كلمة السر غير صحيحة');
}
function logout(){try{sessionStorage.removeItem('adm')}catch(e){}authView()}
const TABS={prods:'الأصناف',stk:'المخزون',cust:'الزبائن',inv:'الجرد والمبيعات',ord:'الطلبات',bk:'نسخة احتياطية'};
function renderTabs(){
  $('tabs').innerHTML=Object.entries(TABS).map(([k,v])=>`<button class="${k===tab?'a':''}" onclick="tab='${k}';renderTabs()">${v}</button>`).join('');
  ({prods:tProds,stk:tStk,cust:tCust,inv:tInv,ord:tOrd,bk:tBk})[tab]();
}
function resize(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
  const m=480,k=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.78))};im.onerror=rej;im.src=r.result};r.onerror=rej;r.readAsDataURL(file)})}
function tProds(){
  const e=S.products.find(p=>p.id===editId)||{};
  $('tab').innerHTML=`<div class="box"><h3 style="margin-top:0">${editId?'تعديل صنف':'إضافة صنف'}</h3>
  <div class="row"><input id="pn" placeholder="اسم الصنف" value="${esc(e.name||'')}">
  <input id="pp" type="number" step="0.01" placeholder="سعر البيع (د.أ)" value="${e.price??''}">
  <input id="pc" type="number" step="0.01" placeholder="سعر التكلفة (اختياري)" value="${e.cost??''}">
  <input id="ps" type="number" placeholder="الكمية بالمخزون" value="${e.stock??''}"></div>
  <div class="row" style="margin-top:10px"><input id="pi" type="file" accept="image/*">
  <button class="btn" onclick="saveProd()">${editId?'حفظ التعديل':'إضافة'}</button>${editId?'<button class="btn o" onclick="editId=null;tProds()">إلغاء</button>':''}</div></div>
  <div class="box sc" style="margin-top:16px"><table><tr><th></th><th>الصنف</th><th>السعر</th><th>المخزون</th><th></th></tr>
  ${S.products.map(p=>`<tr><td>${p.img?`<img class="thumb" src="${p.img}">`:'<div class="thumb"></div>'}</td><td>${esc(p.name)}${p.hide?' <span class="low">(مخفي)</span>':''}</td><td>${fmt(p.price)}</td>
  <td class="${p.stock<=5?'low':''}">${p.stock}</td><td><button class="btn o s" onclick="editId='${p.id}';tProds();scrollTo(0,0)">تعديل</button>
  <button class="btn o s" onclick="toggleHide('${p.id}')">${p.hide?'إظهار':'إخفاء'}</button>
  <button class="btn d s" onclick="delProd('${p.id}')">حذف</button></td></tr>`).join('')||'<tr><td colspan="5" style="color:var(--mut)">لا توجد أصناف</td></tr>'}</table></div>`;
}
async function saveProd(){
  const n=$('pn').value.trim(),p=parseFloat($('pp').value),f=$('pi').files[0];
  if(!n||isNaN(p))return toast('أدخل الاسم والسعر');
  const o=S.products.find(x=>x.id===editId)||{id:uid(),img:''};
  o.name=n;o.price=p;o.cost=parseFloat($('pc').value)||0;o.stock=parseInt($('ps').value)||0;
  if(f){try{o.img=await resize(f)}catch(e){return toast('تعذّر قراءة الصورة')}}
  if(!editId)S.products.push(o);
  if(save()){toast('تم الحفظ');editId=null;tProds()}
}
function delProd(id){if(confirm('حذف الصنف؟')){S.products=S.products.filter(p=>p.id!==id);save();tProds()}}
function tCust(){
  $('tab').innerHTML=`<div class="box"><h3 style="margin-top:0">إضافة زبون ثابت</h3>
  <div class="row"><input id="an" placeholder="اسم السوبرماركت"><input id="ap" placeholder="رقم الواتساب" inputmode="tel">
  <button class="btn" onclick="addCust()">إضافة</button></div></div>
  <div class="box sc" style="margin-top:16px"><table><tr><th>الاسم</th><th>الرقم</th><th>عدد الطلبات</th><th></th></tr>
  ${S.customers.map(c=>`<tr><td>${esc(c.name)}</td><td dir="ltr">${esc(c.phone)}</td><td>${S.orders.filter(o=>o.cust.name===c.name).length}</td>
  <td><button class="btn d s" onclick="delCust('${c.id}')">حذف</button></td></tr>`).join('')||'<tr><td colspan="4" style="color:var(--mut)">لا يوجد زبائن</td></tr>'}</table></div>`;
}
function addCust(){const n=$('an').value.trim(),p=$('ap').value.trim();
  if(!n||p.replace(/\D/g,'').length<8)return toast('أدخل الاسم ورقماً صحيحاً');
  S.customers.push({id:uid(),name:n,phone:p});save();tCust()}
function delCust(id){if(confirm('حذف الزبون؟')){S.customers=S.customers.filter(c=>c.id!==id);save();tCust()}}
let per={t:'d',v:''},invData=null;
const pad=n=>String(n).padStart(2,'0');
const dkey=ts=>{const d=new Date(ts);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
function perDef(t){const k=dkey(Date.now());return t==='d'?k:t==='m'?k.slice(0,7):k.slice(0,4)}
function setPer(t){per={t,v:perDef(t)};tInv()}
function restock(id){const p=S.products.find(x=>x.id===id),v=parseInt($('rs'+id).value);
  if(!p||!v)return toast('أدخل كمية صحيحة');p.stock=Math.max(0,p.stock+v);save();toast('تم تحديث مخزون '+p.name);tStk()}
function tInv(){
  if(!per.v)per.v=perDef(per.t);
  const O=S.orders.filter(o=>dkey(o.date).startsWith(per.v));
  const sold={},grp={};let rev=0,prof=0,units=0;
  O.forEach(o=>{const g=per.t==='y'?dkey(o.date).slice(0,7):dkey(o.date);grp[g]=grp[g]||{n:0,r:0};grp[g].n++;grp[g].r+=o.total;
    o.items.forEach(x=>{const s=sold[x.n]=sold[x.n]||{q:0,r:0,p:0};s.q+=x.q;s.r+=x.q*x.p;s.p+=x.q*(x.p-x.c);rev+=x.q*x.p;prof+=x.q*(x.p-x.c);units+=x.q})});
  const inp=per.t==='d'?`<input type="date" value="${per.v}" onchange="per.v=this.value;tInv()">`:per.t==='m'?`<input type="month" value="${per.v}" onchange="per.v=this.value;tInv()">`:`<input type="number" min="2020" max="2100" value="${per.v}" onchange="per.v=this.value;tInv()">`;
  const gk=Object.keys(grp).sort();
  invData={O,sold,grp,rev,prof,units,gk};
  $('tab').innerHTML=`<div class="row" style="margin-bottom:14px">
  ${[['d','يومي'],['m','شهري'],['y','سنوي']].map(([k,l])=>`<button class="btn s ${per.t===k?'':'o'}" onclick="setPer('${k}')">${l}</button>`).join('')}${inp}<button class="btn s" onclick="exportInv()">تنزيل الجرد PDF</button></div>
  <div class="st"><div><b>${fmt(rev)}</b><span>المبيعات د.أ</span></div><div><b>${fmt(prof)}</b><span>الربح التقديري د.أ</span></div>
  <div><b>${O.length}</b><span>عدد الطلبات</span></div><div><b>${units}</b><span>أصناف مباعة</span></div></div>
  ${per.t!=='d'&&gk.length?`<div class="box sc" style="margin-bottom:16px"><table><tr><th>${per.t==='y'?'الشهر':'اليوم'}</th><th>الطلبات</th><th>المبيعات</th></tr>
  ${gk.map(k=>`<tr><td>${dk(k)}</td><td>${grp[k].n}</td><td>${fmt(grp[k].r)}</td></tr>`).join('')}</table></div>`:''}
  <div class="box sc"><table><tr><th>الصنف</th><th>المباع</th><th>المبيعات</th><th>الربح</th></tr>
  ${S.products.map(p=>{const s=sold[p.name]||{q:0,r:0,p:0};return `<tr><td>${esc(p.name)}</td><td>${s.q}</td><td>${fmt(s.r)}</td><td>${fmt(s.p)}</td></tr>`}).join('')||'<tr><td colspan="4" style="color:var(--mut)">لا توجد أصناف</td></tr>'}</table></div>`;
}
function tStk(){
  $('tab').innerHTML=`<div class="box" style="margin-bottom:16px"><label class="row" style="cursor:pointer">
  <input type="checkbox" style="flex:none;min-width:0;width:auto" ${S.hideOut?'checked':''} onchange="S.hideOut=this.checked;save();toast('تم الحفظ');tStk()">
  <span>إخفاء الأصناف النافدة (مخزونها 0) تلقائياً من صفحة الزبائن</span></label></div>
  <div class="row" style="margin-bottom:12px"><button class="btn s" onclick="exportStock()">تنزيل المخزون PDF</button></div>
  <div class="box sc"><table><tr><th>الصنف</th><th>المخزون</th><th>إضافة مخزون</th><th>الحالة</th><th></th></tr>
  ${S.products.map(p=>`<tr><td>${esc(p.name)}</td><td class="${p.stock<=5?'low':''}"><b>${p.stock}</b>${p.stock<=0?' (نفد)':''}</td>
  <td><input id="rs${p.id}" type="number" placeholder="+كمية" style="width:90px;flex:none;padding:6px 10px"> <button class="btn o s" onclick="restock('${p.id}')">إضافة</button></td>
  <td>${p.hide?'<span class="low">مخفي</span>':(S.hideOut&&p.stock<=0?'<span class="low">مخفي تلقائياً</span>':'ظاهر')}</td>
  <td><button class="btn o s" onclick="toggleHide('${p.id}')">${p.hide?'إظهار':'إخفاء'}</button></td></tr>`).join('')||'<tr><td colspan="5" style="color:var(--mut)">لا توجد أصناف</td></tr>'}</table></div>`;
}
function toggleHide(id){const p=S.products.find(x=>x.id===id);if(!p)return;p.hide=!p.hide;if(p.hide)delete cart[id];save();toast(p.hide?'تم إخفاء الصنف':'تم إظهار الصنف');renderTabs()}
async function exportStock(){
  const B=[{t:'head',title:'محمد الحسيني',sub:'تقرير المخزون',left:['التاريخ: '+fd(Date.now())]}];
  if(S.products.length)B.push({t:'table',h:['الصنف','المخزون','الحالة'],w:[.5,.2,.3],rows:S.products.map(p=>[p.name,String(p.stock),p.stock<=0?'نفد':p.stock<=5?'منخفض':'متوفر'])});
  else B.push({t:'text',s:'لا توجد أصناف'});
  try{await savePDF(await docToPDF(B),'stock-'+dkey(Date.now())+'.pdf')}catch(e){toast('تعذّر إنشاء التقرير')}
}
const PN={d:'يومي',m:'شهري',y:'سنوي'};
async function exportInv(){
  const D=invData;if(!D)return;const {O,sold,grp,rev,prof,units,gk}=D;
  const B=[{t:'head',title:'محمد الحسيني',sub:'تقرير الجرد '+PN[per.t],left:['الفترة: '+dk(per.v),'الطباعة: '+fd(Date.now())]},
   {t:'text',s:`المبيعات: ${fmt(rev)} د.أ   |   الربح: ${fmt(prof)} د.أ   |   الطلبات: ${O.length}   |   الأصناف: ${units}`,size:26}];
  if(per.t!=='d'&&gk.length)B.push({t:'text',s:per.t==='y'?'التفصيل الشهري':'التفصيل اليومي',size:30,bold:1},
    {t:'table',h:[per.t==='y'?'الشهر':'اليوم','الطلبات','المبيعات'],w:[.4,.3,.3],rows:gk.map(k=>[dk(k),String(grp[k].n),fmt(grp[k].r)])});
  if(S.products.length)B.push({t:'text',s:'المبيعات حسب الصنف',size:30,bold:1},
    {t:'table',h:['الصنف','المباع','المبيعات','الربح'],w:[.4,.2,.2,.2],rows:S.products.map(p=>{const q=sold[p.name]||{q:0,r:0,p:0};return [p.name,String(q.q),fmt(q.r),fmt(q.p)]})});
  if(O.length)B.push({t:'text',s:'الطلبات',size:30,bold:1},
    {t:'table',h:['#','التاريخ','الزبون','الإجمالي'],w:[.12,.24,.40,.24],rows:O.map(o=>[String(o.no),fd(o.date),o.cust.name,fmt(o.total)])});
  try{const blob=await docToPDF(B);await savePDF(blob,`inventory-${PN_E[per.t]}-${per.v}.pdf`)}
  catch(e){toast('تعذّر إنشاء التقرير')}
}
const PN_E={d:'daily',m:'monthly',y:'yearly'};
function tOrd(){
  const L=[...S.orders].reverse();
  $('tab').innerHTML=`<div class="box sc"><table><tr><th>#</th><th>التاريخ</th><th>الزبون</th><th>الإجمالي</th><th></th></tr>
  ${L.map(o=>`<tr><td>${o.no}</td><td>${fd(o.date)}</td><td>${esc(o.cust.name)}</td><td>${fmt(o.total)}</td>
  <td><button class="btn o s" onclick="resend('${o.id}')">فاتورة / واتساب</button></td></tr>`).join('')||'<tr><td colspan="5" style="color:var(--mut)">لا توجد طلبات</td></tr>'}</table></div>`;
}
function resend(id){const o=S.orders.find(x=>x.id===id);if(o)sendInvoice(o).catch(()=>toast('تعذّر تجهيز الفاتورة'))}
function tBk(){
  $('tab').innerHTML=`<div class="box"><h3 style="margin-top:0">نسخة احتياطية</h3>
  <p class="sub">البيانات محفوظة تلقائياً في هذا المتصفح. احتفظ بنسخة احتياطية بين فترة وأخرى، أو انقل بها بياناتك لجهاز آخر.</p>
  <div class="row"><button class="btn" onclick="exp()">تنزيل نسخة</button><label class="btn o" style="cursor:pointer">استرجاع نسخة<input type="file" accept=".json" class="hide" onchange="imp(this.files[0])"></label></div></div>`;
}
function exp(){savePDF(new Blob([JSON.stringify(S)],{type:'application/json'}),'sweets-backup.json')}
function imp(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);
  if(!Array.isArray(d.products))throw 0;S=Object.assign({products:[],customers:[],orders:[],seq:0,hideOut:false},d);save();toast('تم الاسترجاع');tBk()}catch(e){toast('ملف غير صالح')}};r.readAsText(f)}

/* ---------- Three.js: حلوى عائمة ---------- */
function hero3d(){
  if(!window.THREE)return;
  const cv=$('cv'),r=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true}),sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(50,1,.1,100);
  cam.position.z=14;sc.add(new THREE.AmbientLight(0xffffff,.8));const dl=new THREE.DirectionalLight(0xffffff,.9);dl.position.set(5,8,10);sc.add(dl);
  const cols=[0xe8b4b8,0xd4a85a,0xf2d9c0,0xb9c9a8,0xc9b3d9],items=[];
  const mob=innerWidth<640,SX=mob?11:26;
  for(let i=0;i<(mob?14:26);i++){
    const g=i%3?new THREE.SphereGeometry(.5+Math.random()*.5,24,24):new THREE.TorusGeometry(.5,.2,16,32);
    const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:cols[i%5],roughness:.35,metalness:.1}));
    m.position.set((Math.random()-.5)*SX,(Math.random()-.5)*12,(Math.random()-.5)*8-2);
    m.userData={s:Math.random()*.01+.003,o:Math.random()*6};sc.add(m);items.push(m)}
  let mx=0,my=0;addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5});
  const rs=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setPixelRatio(Math.min(devicePixelRatio,2));r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};
  rs();addEventListener('resize',rs);
  (function loop(t){requestAnimationFrame(loop);
    items.forEach(m=>{m.rotation.x+=m.userData.s;m.rotation.y+=m.userData.s*1.3;m.position.y+=Math.sin(t/1000+m.userData.o)*.004});
    cam.position.x+=(mx*3-cam.position.x)*.03;cam.position.y+=(-my*2-cam.position.y)*.03;cam.lookAt(0,0,0);r.render(sc,cam)})(0);
}

/* ---------- تشغيل ---------- */
renderCust();renderProds();
try{hero3d()}catch(e){}
if(window.gsap)gsap.from('.hero .t > *',{y:30,opacity:0,stagger:.15,duration:1,ease:'power3.out',delay:.2});
if(location.hash==='#admin')goAdmin();
