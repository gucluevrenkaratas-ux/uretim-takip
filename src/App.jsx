import { useState, useEffect, useRef } from "react"
import { db } from "./db.js"

const K = { ORDERS:"v3_orders", PRODUCTS:"v3_products", USERS:"v3_users", GALVANIZ:"v3_galvaniz", NOTIFS:"v3_notifs" };


const SEED_USERS = [
  {id:"u1",username:"Admin", password:"admin395",name:"Yönetici",    role:"admin"},
  {id:"u2",username:"Evren",   password:"1903",    name:"Ali Kaya",    role:"user"},
  {id:"u3",username:"İsa",  password:"2026",    name:"Ayşe Demir",  role:"user"},
  {id:"u4",username:"Kullanıcı",password:"2026",    name:"Mehmet Çelik",role:"user"},

];
const SEED_PRODUCTS = [
  {id:"p1",code:"CR.0107",name:"Boru Ayaklı Yer Makarası",unit:"adet",photo:"https://www.temhamakine.com/images/urunler/d2c404c22869e5b.png"},
  {id:"p2",code:"TM-002", name:"Pencere Grubu B",         unit:"adet",photo:""},
  {id:"p3",code:"YM-001", name:"Çelik Profil 40x40",      unit:"mt",  photo:""},
  {id:"p4",code:"YM-002", name:"Alüminyum Levha 2mm",     unit:"m²",  photo:""},
];

const genId   = () => Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const today   = () => new Date().toISOString().slice(0,10);
const fmtDate = d => { if(!d)return"-"; const[y,m,day]=d.split("-"); return`${day}.${m}.${y}`; };
const daysLeft= d => Math.ceil((new Date(d)-new Date(today()))/86400000);
const MONTHS  = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const fmtMoney= v => Number(v||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});
const parseMon= v => parseFloat(String(v||0).replace(/\./g,"").replace(",","."))||0;

function genOrderNo(orders) {
  const yr=new Date().getFullYear();
  const n=orders.filter(o=>o.orderNo?.startsWith(`SP-${yr}`)).length;
  return `SP-${yr}-${String(n+1).padStart(4,"0")}`;
}

// ── Styles ────────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;} body{font-family:'Inter',sans-serif;}
.inp{font-family:inherit;font-size:13px;padding:8px 12px;border:1px solid #d1d5db;border-radius:7px;outline:none;color:#111827;background:#fff;transition:border-color .15s;}
.inp:focus{border-color:#2563eb;box-shadow:0 0 0 2px #dbeafe;}
.btn{font-family:inherit;font-size:13px;font-weight:600;padding:9px 18px;border-radius:7px;border:none;cursor:pointer;transition:opacity .15s;}
.btn:disabled{opacity:.5;cursor:not-allowed;}
.btn-dark{background:#111827;color:#fff;} .btn-dark:hover{opacity:.85;}
.btn-green{background:#16a34a;color:#fff;} .btn-green:hover{opacity:.88;}
.btn-red{background:#dc2626;color:#fff;} .btn-red:hover{opacity:.88;}
.btn-out{background:#fff;color:#374151;border:1px solid #d1d5db;} .btn-out:hover{background:#f9fafb;}
.tab{font-family:inherit;font-size:12px;padding:6px 14px;border:none;background:none;cursor:pointer;color:#6b7280;border-radius:5px;transition:all .15s;}
.tab:hover{background:#e5e7eb;}
.tab-a{font-family:inherit;font-size:12px;padding:6px 14px;border:none;background:#fff;cursor:pointer;color:#111827;font-weight:600;border-radius:5px;box-shadow:0 1px 3px rgba(0,0,0,.1);}
.tabg{display:flex;background:#f3f4f6;border-radius:7px;padding:3px;gap:2px;}
.trhov:hover td{background:#f9fafb;}
::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:2px;}
select.inp{appearance:auto;}
`;

const ss = {
  nav:    {background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100},
  main:   {padding:"28px 24px",maxWidth:1100,margin:"0 auto"},
  card:   {background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"},
  th:     {textAlign:"left",padding:"10px 14px",fontSize:11,color:"#9ca3af",fontWeight:600,letterSpacing:.5},
  td:     {padding:"11px 14px",color:"#374151",verticalAlign:"middle"},
  lbl:    {fontSize:10,color:"#9ca3af",letterSpacing:.5,display:"block",marginBottom:5,fontWeight:600},
  toast:  {position:"fixed",top:16,right:16,zIndex:999,color:"#fff",padding:"10px 18px",borderRadius:8,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,.15)"},
  title:  {fontSize:20,fontWeight:700,color:"#111827",marginBottom:20,marginTop:0},
  empty:  {background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:50,textAlign:"center",color:"#9ca3af",fontSize:13},
  back:   {fontSize:13,color:"#6b7280",background:"none",border:"none",cursor:"pointer",marginBottom:16,padding:0,display:"block"},
  lnk:    {fontSize:12,color:"#2563eb",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"},
};

// ── TermTag ──────────────────────────────────────────────────────
function TermTag({termDate,status}) {
  if(status==="kapatildi") return <span style={{background:"#f3f4f6",color:"#9ca3af",fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:600}}>✓ Kapatıldı</span>;
  const d=daysLeft(termDate);
  let bg,cl;
  if(d<0){bg="#fef2f2";cl="#dc2626";}
  else if(d<=3){bg="#fff7ed";cl="#ea580c";}
  else if(d<=7){bg="#fefce8";cl="#ca8a04";}
  else{bg="#f0fdf4";cl="#16a34a";}
  return <span style={{background:bg,color:cl,fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:600,border:`1px solid ${cl}22`}}>
    {fmtDate(termDate)} · {d<0?`${Math.abs(d)}g geçti`:d===0?"Bugün!":`${d}g`}
  </span>;
}

// ── Image Modal ───────────────────────────────────────────────────
function ImageModal({photo,name,onClose}) {
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[]);
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,padding:16,maxWidth:480,width:"100%",textAlign:"center"}}>
      <img src={photo} alt={name} style={{maxWidth:"100%",maxHeight:"70vh",objectFit:"contain",borderRadius:8}}/>
      <div style={{marginTop:10,fontSize:13,color:"#374151",fontWeight:500}}>{name}</div>
      <button onClick={onClose} style={{marginTop:10,fontSize:12,color:"#9ca3af",background:"none",border:"none",cursor:"pointer"}}>Kapat ×</button>
    </div>
  </div>;
}

// ── Logo ─────────────────────────────────────────────────────────
function LogoImg() {
  const [err,setErr]=useState(false);
  if(err) return null;
  return <img src="https://www.temhamakine.com/images/logo2020.png" alt="Logo"
    onError={()=>setErr(true)}
    style={{height:36,objectFit:"contain"}}/>;
}

// ── ProductThumb ─────────────────────────────────────────────────
function ProductThumb({photo,name,size=36,onClick}) {
  const [err,setErr]=useState(false);
  const box={width:size,height:size,borderRadius:6,flexShrink:0,border:"1px solid #e5e7eb",cursor:onClick?"zoom-in":"default"};
  const hClick=onClick?(e=>{e.stopPropagation();onClick();}):undefined;
  if(!photo||err) return <div style={{...box,background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.4,color:"#d1d5db"}} onClick={hClick}>📦</div>;
  return <div style={{...box,overflow:"hidden",background:"#fff"}} onClick={hClick}>
    <img src={photo} alt={name} onError={()=>setErr(true)}
      style={{width:"100%",height:"100%",objectFit:"contain",pointerEvents:"none"}}/>
  </div>;
}

// ── StageChips ───────────────────────────────────────────────────
function StageChips({stages,onChange}) {
  const defs=[
    {key:"imalat",label:"İmalat",on:"#2563eb"},
    {key:"montaj",label:"Montaj",on:"#d97706"},
    {key:"sevk",  label:"Sevk",  on:"#16a34a"},
  ];
  return <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
    {defs.map(d=>(
      <button key={d.key} onClick={e=>{e.stopPropagation();onChange(d.key);}}
        style={{padding:"3px 9px",borderRadius:20,fontSize:10,fontWeight:600,border:"none",cursor:"pointer",
          background:stages[d.key]?d.on:"#e5e7eb",color:stages[d.key]?"#fff":"#9ca3af",letterSpacing:.3,transition:"all .15s"}}>
        {stages[d.key]?"✓ ":""}{d.label}
      </button>
    ))}
  </div>;
}

// ── LogSection ───────────────────────────────────────────────────
function LogSection({title,color,bg,border,entries,onAdd,onEdit,onDelete,currentUser}) {
  const [text,setText]=useState("");
  const [saving,setSaving]=useState(false);
  const [editIdx,setEditIdx]=useState(null);
  const [editText,setEditText]=useState("");

  async function submit() {
    if(!text.trim())return;
    setSaving(true); await onAdd(text.trim()); setText(""); setSaving(false);
  }
  async function submitEdit(origIdx) {
    if(!editText.trim())return;
    await onEdit(origIdx,editText.trim()); setEditIdx(null); setEditText("");
  }
  const canMod = e => currentUser?.role==="admin" || e.user===currentUser?.name;
  const sorted = entries.map((e,i)=>({...e,_i:i})).reverse();

  return <div style={{marginBottom:20}}>
    <div style={{fontSize:10,color:"#9ca3af",letterSpacing:.5,fontWeight:600,marginBottom:8}}>{title.toUpperCase()}</div>
    <div style={{border:`1px solid ${border}`,borderRadius:10,overflow:"hidden",background:bg}}>
      <div style={{padding:"10px 12px",borderBottom:`1px solid ${border}`,display:"flex",gap:8}}>
        <input className="inp" style={{flex:1,fontSize:12,background:"#fff"}} placeholder={`${title} notu ekle...`}
          value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}}} />
        <button className="btn btn-dark" onClick={submit} disabled={saving||!text.trim()}
          style={{padding:"8px 16px",opacity:(saving||!text.trim())?.5:1}}>
          {saving?"...":"Ekle"}
        </button>
      </div>
      {sorted.length===0
        ? <div style={{padding:"16px 14px",fontSize:12,color:"#9ca3af",fontStyle:"italic"}}>Henüz kayıt yok.</div>
        : <div style={{maxHeight:240,overflowY:"auto"}}>
            {sorted.map((e,i)=>(
              <div key={i} style={{padding:"10px 14px",borderBottom:i<sorted.length-1?`1px solid ${border}`:"none",display:"flex",gap:10,alignItems:"flex-start",background:editIdx===e._i?"#fff":"transparent"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>
                  {e.user?.[0]?.toUpperCase()||"?"}
                </div>
                <div style={{flex:1}}>
                  {editIdx===e._i
                    ? <div style={{display:"flex",gap:6}}>
                        <input className="inp" style={{flex:1,fontSize:12}} value={editText}
                          onChange={ev=>setEditText(ev.target.value)}
                          onKeyDown={ev=>{if(ev.key==="Enter")submitEdit(e._i);if(ev.key==="Escape")setEditIdx(null);}}
                          autoFocus />
                        <button className="btn btn-dark" style={{padding:"6px 12px",fontSize:11}} onClick={()=>submitEdit(e._i)}>Kaydet</button>
                        <button className="btn btn-out" style={{padding:"6px 10px",fontSize:11}} onClick={()=>setEditIdx(null)}>İptal</button>
                      </div>
                    : <>
                        <div style={{fontSize:12,color:"#111827",lineHeight:1.5}}>{e.text}</div>
                        <div style={{fontSize:11,color:"#9ca3af",marginTop:3,display:"flex",alignItems:"center",gap:8}}>
                          <span>{e.user} · {fmtDate(e.date)} {e.time}</span>
                          {canMod(e) && <span style={{display:"flex",gap:6}}>
                            <button onClick={()=>{setEditIdx(e._i);setEditText(e.text);}} style={{fontSize:10,color,background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>düzenle</button>
                            <button onClick={()=>onDelete(e._i)} style={{fontSize:10,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>sil</button>
                          </span>}
                        </div>
                      </>}
                </div>
              </div>
            ))}
          </div>}
    </div>
  </div>;
}

// ── ProductPicker ─────────────────────────────────────────────────
function ProductPicker({products,onSelect,onManual}) {
  const [mode,setMode]=useState("list");
  const [search,setSearch]=useState("");
  const [mc,setMc]=useState("");
  const [mn,setMn]=useState("");
  const fil=products.filter(p=>!search||p.code.toLowerCase().includes(search.toLowerCase())||p.name.toLowerCase().includes(search.toLowerCase()));
  if(mode==="manual") return <div style={{display:"flex",flexDirection:"column",gap:4,padding:"6px 8px"}}>
    <input className="inp" style={{fontSize:11,padding:"4px 8px",fontFamily:"monospace"}} placeholder="Kod" value={mc} onChange={e=>setMc(e.target.value)} autoFocus />
    <input className="inp" style={{fontSize:11,padding:"4px 8px"}} placeholder="Ürün / hizmet adı" value={mn} onChange={e=>setMn(e.target.value)}
      onKeyDown={e=>{if(e.key==="Enter"&&mn.trim())onManual(mc.trim(),mn.trim());}} />
    <div style={{display:"flex",gap:4}}>
      <button className="btn btn-dark" style={{fontSize:10,padding:"3px 10px"}} onClick={()=>{if(mn.trim())onManual(mc.trim(),mn.trim());}}>Ekle</button>
      <button className="btn btn-out" style={{fontSize:10,padding:"3px 8px"}} onClick={()=>setMode("list")}>← Liste</button>
    </div>
  </div>;
  return <div style={{padding:"4px 6px"}}>
    <input className="inp" style={{width:"100%",fontSize:11,padding:"4px 8px",marginBottom:4}} placeholder="Ürün ara..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus />
    <div style={{maxHeight:130,overflowY:"auto",fontSize:11}}>
      {fil.length===0 && <div style={{color:"#9ca3af",padding:"4px 6px",fontStyle:"italic"}}>Bulunamadı</div>}
      {fil.map(p=><div key={p.id} onClick={()=>onSelect(p)}
        style={{padding:"4px 6px",cursor:"pointer",borderRadius:4,display:"flex",gap:8,alignItems:"center"}} className="trhov">
        <span style={{fontFamily:"monospace",color:"#6b7280",fontSize:10,minWidth:60}}>{p.code}</span>
        <span style={{color:"#111827"}}>{p.name}</span>
      </div>)}
    </div>
    <button onClick={()=>setMode("manual")} style={{fontSize:10,color:"#2563eb",background:"none",border:"none",cursor:"pointer",marginTop:4,padding:"2px 0",textDecoration:"underline",fontFamily:"inherit"}}>
      + Listede yok, manuel gir
    </button>
  </div>;
}

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  // sessionStorage: refresh'te çıkış yapmasın, sekme kapanınca temizlensin
  const [user,setUser]=useState(()=>{
    try { const u=sessionStorage.getItem("ut_user"); return u?JSON.parse(u):null; } catch(e){return null;}
  });
  const [page,setPage]=useState("orders");
  const [orders,setOrders]=useState([]);
  const [products,setProducts]=useState([]);
  const [users,setUsers]=useState([]);
  const [galvaniz,setGalvaniz]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [detail,setDetail]=useState(null);
  const [zoomPhoto,setZoomPhoto]=useState(null);
  const [notifs,setNotifs]=useState([]); // {id, msg, orderNo, at, seenBy:[]}
  const [showNotifs,setShowNotifs]=useState(false);
  const seenRef=useRef(new Set()); // bu oturumda görülen bildirim id'leri

  useEffect(()=>{init();},[]);

  async function init() {
    const [o,p,u,g]=await Promise.all([db.get(K.ORDERS),db.get(K.PRODUCTS),db.get(K.USERS),db.get(K.GALVANIZ)]);
    const uD=u||SEED_USERS, oD=o||[], gD=g||[];
    let pD=p||SEED_PRODUCTS;
    if(pD.some(x=>x.photo===undefined)){
      pD=pD.map(x=>{const s=SEED_PRODUCTS.find(s=>s.id===x.id||s.code===x.code);return{photo:"",...x,...(s?.photo?{photo:s.photo}:{})};});
      await db.set(K.PRODUCTS,pD);
    }
    setOrders(oD);setProducts(pD);setUsers(uD);setGalvaniz(gD);
    if(!u)db.set(K.USERS,uD);
    if(!o)db.set(K.ORDERS,oD);
    if(!g)db.set(K.GALVANIZ,gD);

    // sessionStorage'daki user'ı güncel users listesiyle eşleştir
    setUser(prev => {
      if(!prev) return null;
      const fresh = uD.find(u=>u.id===prev.id || u.username===prev.username);
      if(!fresh) { try{sessionStorage.removeItem("ut_user");}catch(e){} return null; }
      return fresh; // güncel role ve bilgilerle
    });

    setLoading(false);
  }

  const showToast=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const saveOrders   =async v=>{setOrders(v);   await db.set(K.ORDERS,v);};
  const saveProducts =async v=>{setProducts(v); await db.set(K.PRODUCTS,v);};
  const saveUsers    =async v=>{setUsers(v);    await db.set(K.USERS,v);};
  const saveGalvaniz =async v=>{setGalvaniz(v); await db.set(K.GALVANIZ,v);};

  const saveNotif=async(msg,orderNo)=>{
    const cur=await db.get(K.NOTIFS)||[];
    const n={id:genId(),msg,orderNo,at:new Date().toISOString()};
    await db.set(K.NOTIFS,[n,...cur].slice(0,50));
  };

  // 30sn'de bir bildirim kontrol
  useEffect(()=>{
    if(!user) return;
    const check=async()=>{
      const n=await db.get(K.NOTIFS)||[];
      setNotifs(n);
      const unseen=n.filter(x=>!seenRef.current.has(x.id));
      if(unseen.length>0&&seenRef.current.size>0){
        unseen.forEach(x=>seenRef.current.add(x.id));
        showToast(`🔔 ${unseen.length} yeni sipariş bildirimi`);
      } else { n.forEach(x=>seenRef.current.add(x.id)); }
    };
    check();
    const iv=setInterval(check,30000);
    return()=>clearInterval(iv);
  },[user]);

  function login(u) {
    try { sessionStorage.setItem("ut_user", JSON.stringify(u)); } catch(e){}
    setUser(u); setPage("orders");
  }
  function logout() {
    try { sessionStorage.removeItem("ut_user"); } catch(e){}
    setUser(null);
  }

  const ctx={user,orders,products,users,galvaniz,saveOrders,saveProducts,saveUsers,saveGalvaniz,showToast,setZoomPhoto,saveNotif};

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f9fafb"}}><style>{CSS}</style><div style={{fontSize:13,color:"#9ca3af",letterSpacing:2}}>YÜKLENİYOR...</div></div>;
  if(!user)   return <LoginPage users={users} onLogin={login}/>;

  const tabs=[
    {key:"orders",   label:"Siparişler"},
    {key:"new",      label:"+ Yeni Sipariş"},
    {key:"galvaniz", label:"Galvaniz İşlem"},
    ...(user.role==="admin"?[{key:"admin",label:"⚙ Yönetim"}]:[]),
  ];

  return <div style={{minHeight:"100vh",background:"#f9fafb",fontFamily:"inherit"}}>
    <style>{CSS}</style>
    <style>{`.hidesb::-webkit-scrollbar{display:none}`}</style>

    {/* Fotoğraf zoom — App seviyesinde, her sayfadan çalışır */}
    {zoomPhoto && <ImageModal photo={zoomPhoto.photo} name={zoomPhoto.name} onClose={()=>setZoomPhoto(null)}/>}

    {/* Üst bar: logo + kullanıcı */}
    <header style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <LogoImg/>
        <div style={{fontSize:13,fontWeight:700,color:"#111827",letterSpacing:.3}}>ÜRETİM TAKİP</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {/* Bildirim zili */}
        <div style={{position:"relative"}}>
          <button onClick={()=>setShowNotifs(v=>!v)}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:18,padding:"4px 6px",position:"relative"}}>
            🔔
            {notifs.filter(x=>!seenRef.current.has(x.id)).length>0&&
              <span style={{position:"absolute",top:2,right:2,width:8,height:8,background:"#dc2626",borderRadius:"50%",display:"block"}}/>}
          </button>
          {showNotifs&&<div style={{position:"absolute",right:0,top:"110%",width:300,background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,boxShadow:"0 8px 30px rgba(0,0,0,.12)",zIndex:200,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",fontSize:11,fontWeight:600,color:"#374151",letterSpacing:.5}}>BİLDİRİMLER</div>
            {notifs.length===0
              ? <div style={{padding:"20px 14px",fontSize:12,color:"#9ca3af",textAlign:"center"}}>Bildirim yok</div>
              : <div style={{maxHeight:280,overflowY:"auto"}}>
                  {notifs.map(n=>(
                    <div key={n.id} style={{padding:"10px 14px",borderBottom:"1px solid #f9fafb"}}>
                      <div style={{fontSize:12,color:"#111827"}}>{n.msg}</div>
                      <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>
                        {new Date(n.at).toLocaleDateString("tr-TR")} {new Date(n.at).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}
                      </div>
                    </div>
                  ))}
                </div>}
          </div>}
        </div>
        <span style={{fontSize:11,color:"#6b7280"}}>{user.name.split(" ")[0]}</span>
        <button onClick={logout} style={{fontSize:11,color:"#9ca3af",background:"none",border:"none",cursor:"pointer",padding:"4px 8px"}}>Çıkış</button>
      </div>
    </header>

    {/* Sekmeler — yatay kaydırmalı */}
    <nav style={{background:"#fff",borderBottom:"1px solid #e5e7eb",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",position:"sticky",top:52,zIndex:99}}>
      <div className="hidesb" style={{display:"flex",minWidth:"max-content",padding:"0 8px",gap:2}}>
        {tabs.map(t=><button key={t.key} onClick={()=>{setPage(t.key);setDetail(null);}}
          style={{padding:"10px 14px",fontSize:12,fontWeight:page===t.key?700:400,border:"none",background:"none",cursor:"pointer",whiteSpace:"nowrap",
            color:page===t.key?"#2563eb":"#6b7280",borderBottom:page===t.key?"2.5px solid #2563eb":"2.5px solid transparent",
            fontFamily:"inherit",transition:"all .15s"}}>{t.label}</button>)}
      </div>
    </nav>

    {toast && <div style={{...ss.toast,background:toast.type==="err"?"#dc2626":"#16a34a"}}>{toast.msg}</div>}

    <main style={{padding:"20px 16px",maxWidth:1100,margin:"0 auto"}}>
      {page==="orders"  && !detail && <OrdersPage   ctx={ctx} onDetail={o=>setDetail(o)}/>}
      {page==="orders"  &&  detail && <OrderDetail  ctx={ctx} order={ctx.orders.find(o=>o.id===detail.id)||detail} onBack={()=>setDetail(null)} onUpdate={o=>setDetail(o)}/>}
      {page==="new"                && <NewOrderPage ctx={ctx} onDone={()=>{setPage("orders");setDetail(null);}}/>}
      {page==="galvaniz"           && <GalvanizPage ctx={ctx}/>}
      {page==="admin" && user.role==="admin" && <AdminPage ctx={ctx}/>}
    </main>
  </div>;
}

// ── Login ─────────────────────────────────────────────────────────
function LoginPage({users,onLogin}) {
  const [un,setUn]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState("");
  const [logoErr,setLogoErr]=useState(false);
  function login(){const u=users.find(u=>u.username===un&&u.password===pw);u?onLogin(u):setErr("Kullanıcı adı veya şifre hatalı.");}
  return <div style={{minHeight:"100vh",background:"#111827",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <style>{CSS}</style>
    <div style={{background:"#fff",padding:"36px 36px 32px",borderRadius:14,width:340,boxShadow:"0 20px 60px rgba(0,0,0,.4)"}}>
      {/* Logo alanı */}
      <div style={{textAlign:"center",marginBottom:24,paddingBottom:20,borderBottom:"1px solid #f3f4f6"}}>
        {!logoErr
          ? <img src="https://www.temhamakine.com/images/logo2020.png" alt="Logo"
              onError={()=>setLogoErr(true)}
              style={{maxHeight:60,maxWidth:220,objectFit:"contain"}}/>
          : <div style={{fontSize:28,color:"#2563eb"}}>◈</div>}
      </div>
      <div style={{fontSize:16,fontWeight:700,color:"#111827",marginBottom:2,textAlign:"center"}}>Üretim Takip</div>
      <div style={{fontSize:12,color:"#9ca3af",marginBottom:24,textAlign:"center"}}>Sipariş & Ürün Yönetimi</div>
      <input className="inp" style={{width:"100%",display:"block",marginBottom:10}} placeholder="Kullanıcı adı" value={un} onChange={e=>setUn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>
      <input className="inp" type="password" style={{width:"100%",display:"block",marginBottom:10}} placeholder="Şifre" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>
      {err&&<div style={{fontSize:12,color:"#dc2626",marginBottom:10}}>{err}</div>}
      <button className="btn btn-dark" style={{width:"100%"}} onClick={login}>Giriş Yap →</button>
    </div>
  </div>;
}

// ── Orders Page ───────────────────────────────────────────────────
function OrdersPage({ctx,onDetail}) {
  const [status,setStatus]=useState("aktif");
  const [search,setSearch]=useState("");
  const [sortBy,setSortBy]=useState("term");

  const list=ctx.orders
    .filter(o=>status==="hepsi"||o.status===status)
    .filter(o=>{
      if(!search)return true;
      const q=search.toLowerCase();
      return o.orderNo.toLowerCase().includes(q)||o.customerName.toLowerCase().includes(q)||
        (o.items||[]).some(it=>{const p=ctx.products.find(p=>p.id===it.productId);return p&&(p.code.toLowerCase().includes(q)||p.name.toLowerCase().includes(q));});
    })
    .sort((a,b)=>{
      if(sortBy==="term")   return new Date(a.termDate)-new Date(b.termDate);
      if(sortBy==="created")return new Date(b.createdAt)-new Date(a.createdAt);
      return a.customerName.localeCompare(b.customerName);
    });

  const cnt={aktif:ctx.orders.filter(o=>o.status==="aktif").length,kapatildi:ctx.orders.filter(o=>o.status==="kapatildi").length,geciken:ctx.orders.filter(o=>o.status==="aktif"&&daysLeft(o.termDate)<0).length};

  async function toggleStage(order,key) {
    const cur=order.stages||{imalat:false,montaj:false,sevk:false};
    const updated={...order,stages:{...cur,[key]:!cur[key]}};
    await ctx.saveOrders(ctx.orders.map(o=>o.id===order.id?updated:o));
  }

  return <div>
    <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
      {[{label:"Aktif",val:cnt.aktif,c:"#2563eb",bg:"#eff6ff"},{label:"Geciken",val:cnt.geciken,c:"#dc2626",bg:"#fef2f2"},{label:"Kapatılan",val:cnt.kapatildi,c:"#6b7280",bg:"#f9fafb"},{label:"Toplam",val:ctx.orders.length,c:"#374151",bg:"#f3f4f6"}].map(s=>
        <div key={s.label} style={{background:s.bg,border:`1px solid ${s.c}22`,borderRadius:10,padding:"14px 20px",minWidth:110}}>
          <div style={{fontSize:28,fontWeight:700,color:s.c,lineHeight:1}}>{s.val}</div>
          <div style={{fontSize:11,color:"#9ca3af",marginTop:4,letterSpacing:.5}}>{s.label.toUpperCase()}</div>
        </div>
      )}
    </div>

    <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
      <div className="tabg">{[["aktif","Aktif"],["kapatildi","Kapatıldı"],["hepsi","Tümü"]].map(([v,l])=><button key={v} className={status===v?"tab-a":"tab"} onClick={()=>setStatus(v)}>{l}</button>)}</div>
      <input className="inp" style={{width:240}} placeholder="Sipariş no / müşteri / ürün..." value={search} onChange={e=>setSearch(e.target.value)}/>
      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#6b7280"}}>
        <span>Sırala:</span>
        <select className="inp" style={{padding:"6px 10px"}} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="term">Termin</option><option value="created">Oluşturma</option><option value="customer">Müşteri</option>
        </select>
      </div>
    </div>

    {list.length===0?<div style={ss.empty}>Sipariş bulunamadı.</div>:
      <div style={ss.card}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{borderBottom:"2px solid #f3f4f6"}}>
            {["Sipariş No","Müşteri","Ürünler","Oluşturma","Aşama","Termin / Durum",""].map(h=><th key={h} style={ss.th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {list.map(order=><tr key={order.id} style={{borderBottom:"1px solid #f9fafb",cursor:"pointer"}} className="trhov" onClick={()=>onDetail(order)}>
              <td style={ss.td}><span style={{fontWeight:700,color:"#1d4ed8",fontFamily:"monospace",fontSize:12}}>{order.orderNo}</span></td>
              <td style={ss.td}><span style={{fontWeight:500}}>{order.customerName}</span></td>
              <td style={ss.td}>{(order.items||[]).map(it=>{const p=ctx.products.find(p=>p.id===it.productId);return p?<div key={it.productId} style={{fontSize:12,marginBottom:4,display:"flex",alignItems:"center",gap:7}}>
                <ProductThumb photo={p.photo} name={p.name} size={26} onClick={p.photo?()=>ctx.setZoomPhoto({photo:p.photo,name:p.name}):undefined}/>
                <div><span style={{fontFamily:"monospace",color:"#6b7280",fontSize:10}}>[{p.code}]</span> {p.name} <span style={{color:"#9ca3af"}}>× {it.qty} {p.unit}</span></div>
              </div>:null;})}</td>
              <td style={ss.td}><span style={{fontSize:12,color:"#9ca3af"}}>{fmtDate(order.createdAt)}</span><div style={{fontSize:11,color:"#d1d5db"}}>{order.createdBy}</div></td>
              <td style={ss.td} onClick={e=>e.stopPropagation()}><StageChips stages={order.stages||{imalat:false,montaj:false,sevk:false}} onChange={key=>toggleStage(order,key)}/></td>
              <td style={ss.td}><TermTag termDate={order.termDate} status={order.status}/>{order.status==="kapatildi"&&<div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>{fmtDate(order.closedAt)}</div>}</td>
              <td style={{...ss.td,textAlign:"right"}}><span style={{fontSize:12,color:"#6b7280",borderBottom:"1px solid #d1d5db"}}>Detay →</span>{order.notes&&<div style={{fontSize:11,color:"#dc2626",marginTop:3}}>★ not var</div>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
  </div>;
}

// ── New Order ─────────────────────────────────────────────────────
function NewOrderPage({ctx,onDone}) {
  const [customer,setCustomer]=useState("");
  const [termDate,setTermDate]=useState("");
  const [notes,setNotes]=useState("");
  const [items,setItems]=useState([{productId:"",qty:""}]);
  const [codes,setCodes]=useState([""]);
  const [saving,setSaving]=useState(false);

  const updItem=(i,f,v)=>{const n=[...items];n[i]={...n[i],[f]:v};setItems(n);};
  const addItem=()=>{setItems([...items,{productId:"",qty:""}]);setCodes([...codes,""]);};
  const remItem=i=>{setItems(items.filter((_,j)=>j!==i));setCodes(codes.filter((_,j)=>j!==i));};

  function pickByCode(i,code) {
    const p=ctx.products.find(p=>p.code.toLowerCase()===code.toLowerCase());
    if(p)updItem(i,"productId",p.id);
    const n=[...codes];n[i]=code;setCodes(n);
  }

  async function submit() {
    if(!customer.trim()){ctx.showToast("Müşteri adı giriniz.","err");return;}
    if(!termDate){ctx.showToast("Termin tarihi seçiniz.","err");return;}
    if(items.some(it=>!it.productId||!it.qty||Number(it.qty)<=0)){ctx.showToast("Tüm ürünleri ve miktarları doldurunuz.","err");return;}
    setSaving(true);
    const order={id:genId(),orderNo:genOrderNo(ctx.orders),customerName:customer.trim(),termDate,notes:notes.trim(),
      items:items.map(it=>({productId:it.productId,qty:Number(it.qty)})),status:"aktif",createdAt:today(),createdBy:ctx.user.name};
    await ctx.saveOrders([...ctx.orders,order]);
    await ctx.saveNotif(`Yeni sipariş: ${order.orderNo} — ${customer.trim()} (Termin: ${fmtDate(termDate)})`, order.orderNo);
    ctx.showToast(`${order.orderNo} oluşturuldu!`);setSaving(false);onDone();
  }

  return <div style={{maxWidth:620}}>
    <h2 style={ss.title}>Yeni Sipariş</h2>
    <div style={{...ss.card, padding:28}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
        <div><label style={ss.lbl}>MÜŞTERİ ADI *</label><input className="inp" style={{width:"100%"}} placeholder="Müşteri..." value={customer} onChange={e=>setCustomer(e.target.value)}/></div>
        <div><label style={ss.lbl}>TERMİN TARİHİ *</label><input type="date" className="inp" style={{width:"100%"}} value={termDate} min={today()} onChange={e=>setTermDate(e.target.value)}/></div>
      </div>
      <div style={{marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <label style={ss.lbl}>ÜRÜNLER *</label>
          <button onClick={addItem} style={{fontSize:12,color:"#2563eb",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>+ Satır Ekle</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"110px 1fr 80px 28px",gap:8,marginBottom:6}}>
          {["KOD","ÜRÜN","MİKTAR",""].map(h=><div key={h} style={{fontSize:10,color:"#9ca3af"}}>{h}</div>)}
        </div>
        {items.map((item,i)=>{
          const sel=ctx.products.find(p=>p.id===item.productId);
          return <div key={i} style={{display:"grid",gridTemplateColumns:"110px 1fr 80px 28px",gap:8,marginBottom:8,alignItems:"center"}}>
            <input className="inp" style={{fontFamily:"monospace",fontSize:12}} placeholder="CR.0107" value={codes[i]||""}
              onChange={e=>pickByCode(i,e.target.value)} list={`pc-${i}`}/>
            <datalist id={`pc-${i}`}>{ctx.products.map(p=><option key={p.id} value={p.code}>{p.name}</option>)}</datalist>
            <div style={{padding:"8px 10px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:6,fontSize:12,color:sel?"#111827":"#9ca3af"}}>
              {sel?sel.name:<span style={{fontStyle:"italic"}}>kodu giriniz...</span>}
            </div>
            <input type="number" className="inp" min="1" placeholder="0" value={item.qty} onChange={e=>updItem(i,"qty",e.target.value)}/>
            {items.length>1?<button onClick={()=>remItem(i)} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:18,padding:0}}>×</button>:<div/>}
          </div>;
        })}
      </div>
      <div style={{marginBottom:22}}><label style={ss.lbl}>NOTLAR</label>
        <textarea className="inp" style={{width:"100%",height:68,resize:"vertical",fontSize:12}} placeholder="Ek açıklama..." value={notes} onChange={e=>setNotes(e.target.value)}/>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button className="btn btn-dark" onClick={submit} disabled={saving}>{saving?"Kaydediliyor...":"✓ Sipariş Oluştur"}</button>
        <button className="btn btn-out" onClick={onDone}>İptal</button>
      </div>
    </div>
  </div>;
}

// ── Order Detail ──────────────────────────────────────────────────
function OrderDetail({ctx,order,onBack,onUpdate}) {
  const [closing,setClosing]=useState(false);
  const [confirmClose,setConfirmClose]=useState(false);

  async function closeOrder() {
    setClosing(true);setConfirmClose(false);
    const closed={...order,status:"kapatildi",closedAt:today(),closedBy:ctx.user.name};
    await ctx.saveOrders(ctx.orders.map(o=>o.id===order.id?closed:o));
    ctx.showToast("Sipariş kapatıldı!");onUpdate(closed);setClosing(false);
  }
  async function reopenOrder() {
    if(ctx.user.role!=="admin")return;
    const reopened={...order,status:"aktif",closedAt:null,closedBy:null};
    await ctx.saveOrders(ctx.orders.map(o=>o.id===order.id?reopened:o));
    ctx.showToast("Sipariş yeniden açıldı.");onUpdate(reopened);
  }

  function logHelper(field) {
    return {
      onAdd: async text=>{
        const e={text,user:ctx.user.name,date:today(),time:new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})};
        const u={...order,[field]:[...(order[field]||[]),e]};
        await ctx.saveOrders(ctx.orders.map(o=>o.id===order.id?u:o));onUpdate(u);
      },
      onEdit: async(idx,t)=>{
        const lg=[...(order[field]||[])];lg[idx]={...lg[idx],text:t,edited:true};
        const u={...order,[field]:lg};
        await ctx.saveOrders(ctx.orders.map(o=>o.id===order.id?u:o));onUpdate(u);
      },
      onDelete: async idx=>{
        const u={...order,[field]:(order[field]||[]).filter((_,i)=>i!==idx)};
        await ctx.saveOrders(ctx.orders.map(o=>o.id===order.id?u:o));onUpdate(u);
      }
    };
  }

  return <div style={{maxWidth:580}}>
    <button style={ss.back} onClick={onBack}>← Sipariş Listesi</button>
    <div style={{...ss.card,padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,paddingBottom:18,borderBottom:"1px solid #f3f4f6"}}>
        <div>
          <div style={{fontFamily:"monospace",fontSize:22,fontWeight:700,color:"#1d4ed8"}}>{order.orderNo}</div>
          <div style={{fontSize:12,color:"#9ca3af",marginTop:4}}>Oluşturma: {fmtDate(order.createdAt)} · {order.createdBy}</div>
        </div>
        <TermTag termDate={order.termDate} status={order.status}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:22}}>
        <div><div style={ss.lbl}>MÜŞTERİ</div><div style={{fontWeight:600,fontSize:15,color:"#111827"}}>{order.customerName}</div></div>
        <div><div style={ss.lbl}>TERMİN</div><div style={{fontWeight:600,fontSize:15,color:"#111827"}}>{fmtDate(order.termDate)}</div>
          {order.status==="aktif"&&<div style={{fontSize:12,color:daysLeft(order.termDate)<0?"#dc2626":"#6b7280",marginTop:2}}>{daysLeft(order.termDate)<0?`${Math.abs(daysLeft(order.termDate))} gün geçti`:`${daysLeft(order.termDate)} gün kaldı`}</div>}
        </div>
      </div>

      <div style={{marginBottom:22}}>
        <div style={ss.lbl}>ÜRÜNLER</div>
        <div style={{border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:"#f9fafb",borderBottom:"1px solid #e5e7eb"}}>
              <th style={{...ss.th,padding:"9px 14px",width:52}}></th>
              <th style={{...ss.th,padding:"9px 14px"}}>Kod</th>
              <th style={{...ss.th,padding:"9px 14px"}}>Ürün Adı</th>
              <th style={{...ss.th,padding:"9px 14px"}}>Miktar</th>
            </tr></thead>
            <tbody>{(order.items||[]).map((it,i)=>{const p=ctx.products.find(p=>p.id===it.productId);return<tr key={i} style={{borderTop:"1px solid #f3f4f6"}}>
              <td style={{padding:"8px 14px"}}><ProductThumb photo={p?.photo} name={p?.name||""} size={40} onClick={p?.photo?()=>ctx.setZoomPhoto({photo:p.photo,name:p.name}):undefined}/></td>
              <td style={{padding:"10px 14px",fontFamily:"monospace",color:"#6b7280",fontSize:12}}>[{p?.code||"?"}]</td>
              <td style={{padding:"10px 14px",fontWeight:500}}>{p?.name||"Bilinmiyor"}</td>
              <td style={{padding:"10px 14px",color:"#374151"}}>{it.qty} {p?.unit||""}</td>
            </tr>;})}
            </tbody>
          </table>
        </div>
      </div>

      {order.notes&&<div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,padding:"12px 14px",marginBottom:20,fontSize:12,color:"#6b7280"}}>
        <span style={{color:"#9ca3af",fontSize:10,letterSpacing:.5,display:"block",marginBottom:4}}>SİPARİŞ NOTU</span>{order.notes}
      </div>}

      <LogSection title="İlerleme Durumu" color="#2563eb" bg="#eff6ff" border="#bfdbfe"
        entries={order.progressLog||[]} currentUser={ctx.user} {...logHelper("progressLog")}/>
      <LogSection title="Sevkiyat Bilgisi" color="#7c3aed" bg="#f5f3ff" border="#ddd6fe"
        entries={order.shipLog||[]} currentUser={ctx.user} {...logHelper("shipLog")}/>

      <PaletSection
        palets={order.palets||[]}
        orderItems={order.items||[]}
        products={ctx.products}
        onSave={async(palets)=>{
          const updated={...order,palets};
          await ctx.saveOrders(ctx.orders.map(o=>o.id===order.id?updated:o));
          onUpdate(updated);
        }}
      />

      {order.status==="kapatildi"&&<div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"10px 14px",marginBottom:18,fontSize:12,color:"#16a34a"}}>
        ✓ Kapatıldı: {fmtDate(order.closedAt)} · {order.closedBy}
      </div>}

      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        {order.status==="aktif"&&!confirmClose&&<button className="btn btn-green" onClick={()=>setConfirmClose(true)}>✓ Siparişi Kapat</button>}
        {order.status==="aktif"&&confirmClose&&<div style={{display:"flex",alignItems:"center",gap:10,background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px"}}>
          <span style={{fontSize:13,color:"#dc2626",fontWeight:500}}>Siparişi kapatmak istediğinize emin misiniz?</span>
          <button className="btn btn-green" onClick={closeOrder} disabled={closing}>{closing?"İşleniyor...":"Evet, Kapat"}</button>
          <button className="btn btn-out" onClick={()=>setConfirmClose(false)}>İptal</button>
        </div>}
        {order.status==="kapatildi"&&ctx.user.role==="admin"&&<button className="btn btn-out" onClick={reopenOrder}>↩ Yeniden Aç</button>}
        <button className="btn btn-out" onClick={()=>printOrder(order,ctx.products)}>🖨 Yazdır</button>
        <button className="btn btn-out" onClick={onBack}>Listeye Dön</button>
      </div>
    </div>
  </div>;
}

// ── Print ─────────────────────────────────────────────────────────
function printOrder(order, products) {
  const items = (order.items||[]).map(it=>{
    const p = products.find(p=>p.id===it.productId);
    return p ? `<tr><td>[${p.code}]</td><td>${p.name}</td><td>${it.qty} ${p.unit}</td></tr>` : "";
  }).join("");

  const palets = (order.palets||[]).map((pal,i)=>{
    const rows = (pal.items||[]).map(it=>`<li>${it.name}${it.qty?` × ${it.qty} ${it.unit||""}`:""}</li>`).join("");
    return `<div class="palet"><b>${pal.label||`${i+1}. Palet`}</b><ul>${rows||"<li>—</li>"}</ul></div>`;
  }).join("");

  const prog = (order.progressLog||[]).map(e=>`<li>${fmtDate(e.date)} ${e.time||""} · <b>${e.user}</b>: ${e.text}</li>`).join("");
  const ship = (order.shipLog||[]).map(e=>`<li>${fmtDate(e.date)} ${e.time||""} · <b>${e.user}</b>: ${e.text}</li>`).join("");

  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
  <title>${order.orderNo}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #111;}
    .logo{font-size:18px;font-weight:bold;}
    .order-no{font-size:22px;font-weight:bold;color:#1d4ed8;font-family:monospace;}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
    .meta-item label{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:2px;}
    .meta-item span{font-weight:600;font-size:13px;}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;}
    th{background:#f3f4f6;text-align:left;padding:7px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e5e7eb;}
    td{padding:7px 10px;border-bottom:1px solid #f3f4f6;}
    .section{margin-bottom:16px;}
    .section h3{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;}
    .note{background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:10px;font-size:12px;}
    .palet{margin-bottom:12px;}
    .palet b{font-size:13px;color:#9a3412;}
    .palet ul{margin:6px 0 0 18px;}
    .palet li{margin-bottom:3px;}
    ul{margin-left:18px;}
    li{margin-bottom:3px;}
    .status{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${order.status==="kapatildi"?"#f3f4f6":"#dbeafe"};color:${order.status==="kapatildi"?"#6b7280":"#1d4ed8"};}
    .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:right;}
    @media print{body{padding:12px;}button{display:none;}}
  </style>
  </head><body>
  <div class="header">
    <div>
      <div class="logo">◈ ÜRETİM TAKİP</div>
      <div style="font-size:11px;color:#888;margin-top:2px;">Sipariş Formu</div>
    </div>
    <div style="text-align:right">
      <div class="order-no">${order.orderNo}</div>
      <div class="status">${order.status==="kapatildi"?"✓ Kapatıldı":"Aktif"}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><label>Müşteri</label><span>${order.customerName}</span></div>
    <div class="meta-item"><label>Termin Tarihi</label><span>${fmtDate(order.termDate)}</span></div>
    <div class="meta-item"><label>Oluşturma</label><span>${fmtDate(order.createdAt)} · ${order.createdBy}</span></div>
    ${order.status==="kapatildi"?`<div class="meta-item"><label>Kapatıldı</label><span>${fmtDate(order.closedAt)} · ${order.closedBy}</span></div>`:""}
  </div>

  <div class="section">
    <h3>Ürünler</h3>
    <table><thead><tr><th>Kod</th><th>Ürün Adı</th><th>Miktar</th></tr></thead>
    <tbody>${items}</tbody></table>
  </div>

  ${order.notes?`<div class="section"><h3>Sipariş Notu</h3><div class="note">${order.notes}</div></div>`:""}

  ${(order.palets||[]).length?`<div class="section"><h3>Paletleme Bilgisi</h3>${palets}</div>`:""}

  ${prog?`<div class="section"><h3>İlerleme Durumu</h3><ul>${prog}</ul></div>`:""}
  ${ship?`<div class="section"><h3>Sevkiyat Bilgisi</h3><ul>${ship}</ul></div>`:""}

  <div class="footer">Yazdırma: ${new Date().toLocaleDateString("tr-TR")} ${new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</div>
  <script>window.onload=()=>{window.print();}</script>
  </body></html>`;

  const w = window.open("","_blank","width=800,height=900");
  if(w){ w.document.write(html); w.document.close(); }
}

// ── Palet Section ─────────────────────────────────────────────────
function PaletSection({palets,onSave,orderItems,products}) {
  const defPalet=()=>({id:genId(),label:"",items:[],note:""});
  const [list,setList]=useState(palets.length?palets:[defPalet()]);
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);

  async function save(){
    setSaving(true);
    await onSave(list);
    setSaving(false);
    setEditing(false);
  }

  const addPalet=()=>setList([...list,defPalet()]);
  const remPalet=id=>{if(list.length>1)setList(list.filter(p=>p.id!==id));};
  const updPalet=(id,f,v)=>setList(list.map(p=>p.id===id?{...p,[f]:v}:p));

  // Ürün toggle — paletteki items listesine ekle/çıkar
  function toggleProduct(paletId, productId, productName, unit) {
    setList(list.map(p=>{
      if(p.id!==paletId) return p;
      const exists=p.items.find(it=>it.productId===productId);
      if(exists) return {...p,items:p.items.filter(it=>it.productId!==productId)};
      return {...p,items:[...p.items,{productId,name:productName,qty:"",unit,manual:false}]};
    }));
  }

  function updItemQty(paletId,productId,qty){
    setList(list.map(p=>p.id!==paletId?p:{...p,items:p.items.map(it=>it.productId===productId?{...it,qty}:it)}));
  }

  function addManualItem(paletId){
    setList(list.map(p=>p.id!==paletId?p:{...p,items:[...p.items,{id:genId(),name:"",qty:"",unit:"",manual:true}]}));
  }

  function updManualItem(paletId,itemId,f,v){
    setList(list.map(p=>p.id!==paletId?p:{...p,items:p.items.map(it=>it.id===itemId?{...it,[f]:v}:it)}));
  }

  function remItem(paletId,itemId,productId){
    setList(list.map(p=>p.id!==paletId?p:{...p,items:p.items.filter(it=>productId?it.productId!==productId:it.id!==itemId)}));
  }

  return <div style={{marginBottom:20}}>
    <div style={{fontSize:10,color:"#9ca3af",letterSpacing:.5,fontWeight:600,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span>PALETLEMEBİLGİSİ</span>
      {!editing
        ? <button onClick={()=>setEditing(true)} style={{fontSize:10,color:"#ea580c",background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontFamily:"inherit"}}>✎ Düzenle</button>
        : <div style={{display:"flex",gap:10}}>
            <button onClick={save} disabled={saving} style={{fontSize:10,color:"#16a34a",background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontFamily:"inherit"}}>{saving?"...":"✓ Kaydet"}</button>
            <button onClick={()=>{setList(palets.length?palets:[defPalet()]);setEditing(false);}} style={{fontSize:10,color:"#9ca3af",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>İptal</button>
          </div>}
    </div>

    <div style={{border:"1px solid #fed7aa",borderRadius:10,overflow:"hidden"}}>
      {list.map((palet,pi)=>(
        <div key={palet.id} style={{background:pi%2===0?"#fff7ed":"#fff8f1",borderBottom:pi<list.length-1?"1px solid #fed7aa":"none",padding:"14px 16px"}}>

          {/* Palet başlık */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:"#ea580c",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>
              {pi+1}
            </div>
            {editing
              ? <input className="inp" style={{flex:1,fontSize:13,fontWeight:600,padding:"5px 10px"}}
                  placeholder={`${pi+1}. Palet`} value={palet.label}
                  onChange={e=>updPalet(palet.id,"label",e.target.value)}/>
              : <span style={{fontSize:14,fontWeight:700,color:"#9a3412"}}>{palet.label||`${pi+1}. Palet`}</span>}
            {editing&&list.length>1&&
              <button onClick={()=>remPalet(palet.id)} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:18,padding:0,marginLeft:"auto"}}>×</button>}
          </div>

          {/* Ürün listesi */}
          {(palet.items||[]).length>0&&(
            <div style={{marginLeft:36,marginBottom:editing?10:0}}>
              {(palet.items||[]).map((it,ii)=>(
                <div key={it.productId||it.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{color:"#ea580c",fontSize:12,flexShrink:0}}>→</span>
                  {it.manual
                    ? editing
                      ? <>
                          <input className="inp" style={{flex:2,fontSize:12,padding:"4px 8px"}} placeholder="Malzeme adı" value={it.name} onChange={e=>updManualItem(palet.id,it.id,"name",e.target.value)}/>
                          <input className="inp" style={{width:60,fontSize:12,padding:"4px 6px"}} placeholder="Adet" value={it.qty} onChange={e=>updManualItem(palet.id,it.id,"qty",e.target.value)}/>
                          <input className="inp" style={{width:50,fontSize:12,padding:"4px 6px"}} placeholder="Birim" value={it.unit} onChange={e=>updManualItem(palet.id,it.id,"unit",e.target.value)}/>
                          <button onClick={()=>remItem(palet.id,it.id,null)} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:16,padding:0}}>×</button>
                        </>
                      : <span style={{fontSize:12,color:"#7c2d12"}}>{it.name}{it.qty&&` × ${it.qty} ${it.unit||""}`}</span>
                    : editing
                      ? <>
                          <span style={{flex:1,fontSize:12,color:"#7c2d12",fontWeight:500}}>{it.name}</span>
                          <input className="inp" style={{width:70,fontSize:12,padding:"4px 6px"}} placeholder="Miktar" value={it.qty} onChange={e=>updItemQty(palet.id,it.productId,e.target.value)}/>
                          <span style={{fontSize:11,color:"#9ca3af",minWidth:24}}>{it.unit}</span>
                          <button onClick={()=>remItem(palet.id,null,it.productId)} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:16,padding:0}}>×</button>
                        </>
                      : <span style={{fontSize:12,color:"#7c2d12"}}>{it.name}{it.qty&&` × ${it.qty} ${it.unit||""}`}</span>}
                </div>
              ))}
            </div>
          )}

          {(palet.items||[]).length===0&&!editing&&
            <div style={{marginLeft:36,fontSize:12,color:"#fdba74",fontStyle:"italic"}}>İçerik eklenmemiş</div>}

          {/* Düzenleme modu — ürün seçimi */}
          {editing&&(
            <div style={{marginLeft:36,marginTop:8}}>
              {/* Siparişten ürünler */}
              {orderItems.length>0&&(
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:10,color:"#9ca3af",marginBottom:6,letterSpacing:.3}}>SİPARİŞTEN EKLE</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {orderItems.map(oi=>{
                      const prod=products.find(p=>p.id===oi.productId);
                      if(!prod) return null;
                      const selected=(palet.items||[]).some(it=>it.productId===prod.id);
                      return <button key={prod.id}
                        onClick={()=>toggleProduct(palet.id,prod.id,prod.name,prod.unit)}
                        style={{padding:"4px 10px",borderRadius:20,fontSize:11,border:"1.5px solid",cursor:"pointer",fontFamily:"inherit",transition:"all .15s",
                          background:selected?"#ea580c":"#fff",
                          color:selected?"#fff":"#ea580c",
                          borderColor:"#ea580c"}}>
                        {selected?"✓ ":""}{prod.name}
                      </button>;
                    })}
                  </div>
                </div>
              )}
              {/* Manuel giriş */}
              <button onClick={()=>addManualItem(palet.id)}
                style={{fontSize:11,color:"#6b7280",background:"none",border:"1px dashed #d1d5db",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontFamily:"inherit"}}>
                + Diğer malzeme ekle
              </button>
            </div>
          )}
        </div>
      ))}

      {editing&&(
        <div style={{padding:"10px 16px",borderTop:"1px solid #fed7aa",background:"#fff7ed"}}>
          <button onClick={addPalet} style={{fontSize:12,color:"#ea580c",background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontFamily:"inherit",fontWeight:600}}>
            + Yeni Palet Ekle
          </button>
        </div>
      )}
    </div>
  </div>;
}

// ── Galvaniz Page ─────────────────────────────────────────────────
function GalvanizPage({ctx}) {
  const now=new Date();
  const [selYear,setSelYear]=useState(now.getFullYear());
  const [selMonth,setSelMonth]=useState(now.getMonth());
  const [editMode,setEditMode]=useState(false);

  const periodKey=`${selYear}-${String(selMonth+1).padStart(2,"0")}`;
  const periods=ctx.galvaniz||[];
  const period=periods.find(p=>p.period===periodKey);
  const isClosed=period?.status==="closed";
  const isEditable=editMode&&!isClosed;

  const defRow=()=>({id:genId(),code:"",name:"",qty:"",unit:"adet",unitPrice:"",note:""});
  const [rows,setRows]=useState(period?.rows?.length?period.rows.map(r=>({...defRow(),...r})):[defRow()]);

  useEffect(()=>{
    const p=(ctx.galvaniz||[]).find(p=>p.period===periodKey);
    setRows(p?.rows?.length?p.rows.map(r=>({...defRow(),...r})):[defRow()]);
    setEditMode(false);
  },[periodKey]);

  const total=rows.reduce((s,r)=>(s+(parseFloat(r.qty)||0)*parseMon(r.unitPrice)),0);
  const updRow=(id,f,v)=>setRows(rows.map(r=>r.id===id?{...r,[f]:v}:r));
  const addRow=()=>setRows([...rows,defRow()]);
  const remRow=id=>{if(rows.length>1)setRows(rows.filter(r=>r.id!==id));};
  const movRow=(id,dir)=>{const i=rows.findIndex(r=>r.id===id),j=i+dir;if(j<0||j>=rows.length)return;const n=[...rows];[n[i],n[j]]=[n[j],n[i]];setRows(n);};

  async function save(status) {
    const np=periods.filter(p=>p.period!==periodKey);
    np.push({period:periodKey,status,rows,savedAt:today(),savedBy:ctx.user.name,...(status==="closed"?{closedAt:today(),closedBy:ctx.user.name}:{})});
    await ctx.saveGalvaniz(np);
    ctx.showToast(status==="closed"?"Dönem kapatıldı!":"Kaydedildi!");
    setEditMode(false);
  }
  async function reopen() {
    if(ctx.user.role!=="admin"){ctx.showToast("Sadece admin açabilir.","err");return;}
    await ctx.saveGalvaniz(periods.map(p=>p.period===periodKey?{...p,status:"open"}:p));
    ctx.showToast("Dönem yeniden açıldı.");
  }

  const years=Array.from({length:4},(_,i)=>now.getFullYear()-1+i);
  const cell=(w,align="left")=>({width:w,padding:"6px 8px",fontSize:12,border:"none",borderRight:"1px solid #e5e7eb",fontFamily:"inherit",background:"transparent",outline:"none",textAlign:align,color:"#111827"});

  return <div style={{maxWidth:900}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
      <div>
        <h2 style={ss.title}>Galvaniz İşlem Formu</h2>
        <div style={{fontSize:12,color:"#9ca3af",marginTop:-16}}>
          {isClosed?`Dönem kapatıldı · ${period?.closedBy} · ${fmtDate(period?.closedAt)}`:period?`Son kayıt: ${fmtDate(period?.savedAt)} · ${period?.savedBy}`:"Bu dönem için kayıt yok"}
        </div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <select className="inp" style={{padding:"6px 10px",fontSize:12}} value={selYear} onChange={e=>setSelYear(Number(e.target.value))}>
          {years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <div className="tabg">
          {MONTHS.map((m,i)=><button key={i} className={selMonth===i?"tab-a":"tab"} style={{padding:"5px 9px",fontSize:10}} onClick={()=>setSelMonth(i)}>{m.slice(0,3)}</button>)}
        </div>
      </div>
    </div>

    {isClosed&&<div style={{background:"#fef9c3",border:"1px solid #fde047",borderRadius:8,padding:"10px 16px",marginBottom:16,fontSize:12,color:"#854d0e",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span>⚠ Bu dönem kapatılmıştır.</span>
      {ctx.user.role==="admin"&&<button className="btn btn-out" style={{fontSize:11,padding:"4px 12px"}} onClick={reopen}>↩ Yeniden Aç</button>}
    </div>}

    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {!isClosed&&!editMode&&<button className="btn btn-dark" onClick={()=>setEditMode(true)}>✎ Düzenle</button>}
      {isEditable&&<><button className="btn btn-dark" onClick={()=>save("open")}>💾 Kaydet</button>
        <button className="btn btn-out" onClick={addRow}>+ Satır Ekle</button>
        <button className="btn btn-out" onClick={()=>setEditMode(false)}>İptal</button></>}
      {!isClosed&&period&&!editMode&&<button className="btn btn-out" style={{borderColor:"#fca5a5",color:"#dc2626"}} onClick={()=>save("closed")}>🔒 Dönemi Kapat</button>}
      {!period&&!editMode&&<button className="btn btn-dark" onClick={()=>setEditMode(true)}>+ Form Oluştur</button>}
    </div>

    <div style={{border:"1.5px solid #d1d5db",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
      <div style={{display:"grid",gridTemplateColumns:"36px 1fr 80px 80px 110px 120px 100px",background:"#1e293b",color:"#94a3b8",fontSize:10,letterSpacing:.5,fontWeight:600}}>
        {["","ÜRÜN KOD / ADI","ADET","BİRİM","BİRİM FİYAT","TOPLAM","NOT"].map((h,i)=><div key={i} style={{padding:"9px 8px",borderRight:"1px solid #334155",textAlign:i>=4?"right":"left"}}>{h}</div>)}
      </div>

      {rows.map((row,idx)=>{
        const qty=parseFloat(row.qty)||0, price=parseMon(row.unitPrice), tot=qty*price;
        const hasProd=row.name||row.code;
        return <div key={row.id} style={{display:"grid",gridTemplateColumns:"36px 1fr 80px 80px 110px 120px 100px",borderBottom:"1px solid #e5e7eb",background:idx%2===0?"#fff":"#fafafa"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",borderRight:"1px solid #e5e7eb",flexDirection:"column",gap:1}}>
            {isEditable?<><button onClick={()=>movRow(row.id,-1)} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:9,padding:"1px",lineHeight:1}}>▲</button>
              <span style={{fontSize:9,color:"#9ca3af"}}>{idx+1}</span>
              <button onClick={()=>movRow(row.id,1)} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:9,padding:"1px",lineHeight:1}}>▼</button></>
            :<span style={{fontSize:10,color:"#9ca3af"}}>{idx+1}</span>}
          </div>

          <div style={{borderRight:"1px solid #e5e7eb"}}>
            {isEditable?(hasProd?
              <div style={{display:"flex",alignItems:"center",padding:"5px 8px",gap:8,height:"100%"}}>
                <div style={{flex:1}}><span style={{fontSize:10,fontFamily:"monospace",color:"#6b7280",display:"block"}}>{row.code}</span><span style={{fontSize:12,fontWeight:500}}>{row.name}</span></div>
                <button onClick={()=>setRows(rows.map(r=>r.id===row.id?{...r,code:"",name:""}:r))} style={{fontSize:10,color:"#6b7280",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:4,padding:"2px 7px",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>✎ değiştir</button>
              </div>:
              <ProductPicker products={ctx.products}
                onSelect={p=>setRows(rows.map(r=>r.id===row.id?{...r,code:p.code,name:p.name}:r))}
                onManual={(c,n)=>setRows(rows.map(r=>r.id===row.id?{...r,code:c,name:n}:r))}/>
            ):<div style={{padding:"7px 8px"}}>{hasProd?<><span style={{fontSize:10,fontFamily:"monospace",color:"#6b7280",display:"block"}}>{row.code}</span><span style={{fontSize:12,fontWeight:500}}>{row.name}</span></>:<span style={{color:"#d1d5db",fontSize:12,fontStyle:"italic"}}>—</span>}</div>}
          </div>

          <div style={{borderRight:"1px solid #e5e7eb"}}>
            {isEditable?<input type="number" style={{...cell(70),textAlign:"right"}} value={row.qty} onChange={e=>updRow(row.id,"qty",e.target.value)} placeholder="0"/>:<div style={{padding:"7px 8px",fontSize:12,textAlign:"right"}}>{row.qty||"-"}</div>}
          </div>
          <div style={{borderRight:"1px solid #e5e7eb"}}>
            {isEditable?<select style={{...cell(76),textAlign:"center",background:"transparent"}} value={row.unit} onChange={e=>updRow(row.id,"unit",e.target.value)}>
              {["adet","kg","mt","m²","lt","paket","takım","saat"].map(u=><option key={u}>{u}</option>)}
            </select>:<div style={{padding:"7px 8px",fontSize:12,textAlign:"center",color:"#6b7280"}}>{row.unit}</div>}
          </div>
          <div style={{borderRight:"1px solid #e5e7eb"}}>
            {isEditable?<input style={{...cell(106),textAlign:"right"}} value={row.unitPrice} onChange={e=>updRow(row.id,"unitPrice",e.target.value)} placeholder="0,00"/>:<div style={{padding:"7px 8px",fontSize:12,textAlign:"right"}}>{row.unitPrice?`${row.unitPrice} ₺`:"-"}</div>}
          </div>
          <div style={{borderRight:"1px solid #e5e7eb",padding:"7px 8px",textAlign:"right",fontSize:12,fontWeight:tot>0?600:400,color:tot>0?"#111827":"#d1d5db"}}>{tot>0?`${fmtMoney(tot)} ₺`:"—"}</div>
          <div style={{display:"flex",alignItems:"center"}}>
            {isEditable?<><input style={{...cell("calc(100% - 24px)"),borderRight:"none"}} value={row.note||""} onChange={e=>updRow(row.id,"note",e.target.value)} placeholder="not..."/>
              <button onClick={()=>remRow(row.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#fca5a5",fontSize:14,padding:"0 4px",flexShrink:0}}>×</button></>
            :<div style={{padding:"7px 8px",fontSize:11,color:"#9ca3af"}}>{row.note||""}</div>}
          </div>
        </div>;
      })}

      <div style={{display:"grid",gridTemplateColumns:"36px 1fr 80px 80px 110px 120px 100px",background:"#1e293b",borderTop:"2px solid #334155"}}>
        <div style={{gridColumn:"1/5",padding:"10px 12px",fontSize:12,color:"#94a3b8",fontWeight:600}}>GENEL TOPLAM ({rows.filter(r=>r.name||r.code).length} kalem)</div>
        <div style={{padding:"10px 8px",textAlign:"right",fontSize:15,fontWeight:700,color:"#f7c948"}}>{fmtMoney(total)} ₺</div>
        <div/><div/>
      </div>
    </div>

    {periods.length>0&&<div style={{marginTop:24}}>
      <div style={{fontSize:11,color:"#9ca3af",letterSpacing:.5,fontWeight:600,marginBottom:10}}>DÖNEM GEÇMİŞİ</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[...periods].sort((a,b)=>b.period.localeCompare(a.period)).map(p=>{
          const[y,m]=p.period.split("-");
          const t=(p.rows||[]).reduce((s,r)=>(s+(parseFloat(r.qty)||0)*parseMon(r.unitPrice)),0);
          const isAct=p.period===periodKey;
          return <button key={p.period} onClick={()=>{setSelYear(Number(y));setSelMonth(Number(m)-1);}}
            style={{padding:"8px 14px",borderRadius:8,border:`1.5px solid ${isAct?"#2563eb":"#e5e7eb"}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left",background:isAct?"#eff6ff":"#fff",minWidth:120}}>
            <div style={{fontSize:12,fontWeight:600,color:isAct?"#2563eb":"#374151"}}>{MONTHS[Number(m)-1]} {y}{p.status==="closed"&&" 🔒"}</div>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{fmtMoney(t)} ₺</div>
          </button>;
        })}
      </div>
    </div>}
  </div>;
}

// ── Admin Page ────────────────────────────────────────────────────
function AdminPage({ctx}) {
  const [tab,setTab]=useState("products");
  return <div>
    <h2 style={ss.title}>Yönetim Paneli</h2>
    <div className="tabg" style={{marginBottom:22,width:"fit-content"}}>
      {[["products","Ürün Listesi"],["users","Kullanıcılar"]].map(([k,l])=><button key={k} className={tab===k?"tab-a":"tab"} onClick={()=>setTab(k)}>{l}</button>)}
    </div>
    {tab==="products"&&<AdminProducts ctx={ctx}/>}
    {tab==="users"&&<AdminUsers ctx={ctx}/>}
  </div>;
}

function AdminProducts({ctx}) {
  const empty={code:"",name:"",unit:"adet",photo:""};
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState(empty);
  const [search,setSearch]=useState("");

  const startNew=()=>{setEditing("new");setForm(empty);};
  const startEdit=p=>{setEditing(p.id);setForm({code:p.code,name:p.name,unit:p.unit,photo:p.photo||""});};

  async function save() {
    if(!form.code.trim()||!form.name.trim()||!form.unit.trim()){ctx.showToast("Tüm alanlar zorunlu.","err");return;}
    const dup=ctx.products.find(p=>p.code.toLowerCase()===form.code.trim().toLowerCase()&&p.id!==editing);
    if(dup){ctx.showToast("Bu ürün kodu zaten mevcut.","err");return;}
    if(editing==="new"){
      await ctx.saveProducts([...ctx.products,{id:genId(),...form,code:form.code.trim().toUpperCase(),name:form.name.trim(),unit:form.unit.trim()}]);
      ctx.showToast("Ürün eklendi!");
    } else {
      await ctx.saveProducts(ctx.products.map(p=>p.id===editing?{...p,...form,code:form.code.trim().toUpperCase()}:p));
      ctx.showToast("Ürün güncellendi!");
    }
    setEditing(null);
  }

  async function delProd(p) {
    if(ctx.orders.some(o=>o.items?.some(it=>it.productId===p.id))){ctx.showToast(`"${p.name}" siparişlerde kullanılıyor.`,"err");return;}
    await ctx.saveProducts(ctx.products.filter(x=>x.id!==p.id));
    ctx.showToast("Ürün silindi.");
  }

  const fil=ctx.products.filter(p=>!search||p.code.toLowerCase().includes(search.toLowerCase())||p.name.toLowerCase().includes(search.toLowerCase()));

  return <div style={{maxWidth:700}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
      <input className="inp" style={{width:220}} placeholder="Kod / isim ara..." value={search} onChange={e=>setSearch(e.target.value)}/>
      <button className="btn btn-dark" onClick={startNew}>+ Yeni Ürün</button>
    </div>

    {editing&&<div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:18,marginBottom:16}}>
      <div style={{fontSize:11,color:"#3b82f6",letterSpacing:1,marginBottom:12,fontWeight:600}}>{editing==="new"?"YENİ ÜRÜN EKLE":"ÜRÜN DÜZENLE"}</div>
      <div style={{display:"grid",gridTemplateColumns:"130px 1fr 100px",gap:10,marginBottom:10}}>
        <div><label style={ss.lbl}>KOD *</label><input className="inp" style={{width:"100%",fontFamily:"monospace"}} placeholder="TM-001" value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></div>
        <div><label style={ss.lbl}>ÜRÜN ADI *</label><input className="inp" style={{width:"100%"}} placeholder="Ürün adı..." value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div><label style={ss.lbl}>BİRİM *</label><input className="inp" style={{width:"100%"}} placeholder="adet / kg / mt" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"flex-end",marginBottom:12}}>
        <div style={{flex:1}}><label style={ss.lbl}>FOTOĞRAF URL (opsiyonel)</label><input className="inp" style={{width:"100%",fontSize:11}} placeholder="https://..." value={form.photo||""} onChange={e=>setForm({...form,photo:e.target.value})}/></div>
        <ProductThumb photo={form.photo} name={form.name} size={44}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn btn-dark" onClick={save}>Kaydet</button>
        <button className="btn btn-out" onClick={()=>setEditing(null)}>İptal</button>
      </div>
    </div>}

    <div style={ss.card}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{borderBottom:"2px solid #f3f4f6"}}>
          <th style={{...ss.th,width:52}}></th>
          <th style={ss.th}>KOD</th><th style={ss.th}>ÜRÜN ADI</th><th style={ss.th}>BİRİM</th><th style={ss.th}></th>
        </tr></thead>
        <tbody>
          {fil.length===0?<tr><td colSpan={5} style={{padding:30,textAlign:"center",color:"#9ca3af"}}>Ürün bulunamadı.</td></tr>
          :fil.map(p=><tr key={p.id} style={{borderBottom:"1px solid #f9fafb"}}>
            <td style={{padding:"8px 14px"}}><ProductThumb photo={p.photo} name={p.name} size={36}/></td>
            <td style={ss.td}><span style={{fontFamily:"monospace",fontWeight:700,color:"#374151"}}>{p.code}</span></td>
            <td style={ss.td}>{p.name}</td>
            <td style={ss.td}><span style={{color:"#9ca3af"}}>{p.unit}</span></td>
            <td style={{...ss.td,textAlign:"right"}}>
              <button onClick={()=>startEdit(p)} style={ss.lnk}>Düzenle</button>
              <button onClick={()=>delProd(p)} style={{...ss.lnk,color:"#ef4444",marginLeft:12}}>Sil</button>
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>;
}

function AdminUsers({ctx}) {
  const empty={username:"",password:"",name:"",role:"user"};
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState(empty);

  const startNew=()=>{setEditing("new");setForm(empty);};
  const startEdit=u=>{setEditing(u.id);setForm({username:u.username,password:u.password,name:u.name,role:u.role});};

  async function save() {
    if(!form.username.trim()||!form.password.trim()||!form.name.trim()){ctx.showToast("Tüm alanlar zorunlu.","err");return;}
    if(editing==="new"){
      if(ctx.users.find(u=>u.username===form.username.trim())){ctx.showToast("Bu kullanıcı adı mevcut.","err");return;}
      await ctx.saveUsers([...ctx.users,{id:genId(),...form,username:form.username.trim()}]);
      ctx.showToast("Kullanıcı eklendi!");
    } else {
      await ctx.saveUsers(ctx.users.map(u=>u.id===editing?{...u,...form}:u));
      ctx.showToast("Kullanıcı güncellendi!");
    }
    setEditing(null);
  }

  async function delUser(u) {
    if(u.id===ctx.user.id){ctx.showToast("Kendinizi silemezsiniz.","err");return;}
    if(u.role==="admin"&&ctx.users.filter(x=>x.role==="admin").length===1){ctx.showToast("Son admin silinemez.","err");return;}
    await ctx.saveUsers(ctx.users.filter(x=>x.id!==u.id));
    ctx.showToast("Kullanıcı silindi.");
  }

  return <div style={{maxWidth:620}}>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
      <button className="btn btn-dark" onClick={startNew}>+ Yeni Kullanıcı</button>
    </div>

    {editing&&<div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:18,marginBottom:16}}>
      <div style={{fontSize:11,color:"#3b82f6",letterSpacing:1,marginBottom:12,fontWeight:600}}>{editing==="new"?"YENİ KULLANICI":"KULLANICI DÜZENLE"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><label style={ss.lbl}>AD SOYAD *</label><input className="inp" style={{width:"100%"}} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div><label style={ss.lbl}>KULLANICI ADI *</label><input className="inp" style={{width:"100%"}} value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/></div>
        <div><label style={ss.lbl}>ŞİFRE *</label><input className="inp" style={{width:"100%"}} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div>
        <div><label style={ss.lbl}>ROL</label><select className="inp" style={{width:"100%"}} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="user">Normal Kullanıcı</option><option value="admin">Yönetici (Admin)</option></select></div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn btn-dark" onClick={save}>Kaydet</button>
        <button className="btn btn-out" onClick={()=>setEditing(null)}>İptal</button>
      </div>
    </div>}

    <div style={ss.card}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{borderBottom:"2px solid #f3f4f6"}}>
          {["Ad Soyad","Kullanıcı Adı","Rol",""].map(h=><th key={h} style={ss.th}>{h}</th>)}
        </tr></thead>
        <tbody>{ctx.users.map(u=><tr key={u.id} style={{borderBottom:"1px solid #f9fafb"}}>
          <td style={ss.td}><span style={{fontWeight:500}}>{u.name}</span></td>
          <td style={{...ss.td,fontFamily:"monospace",color:"#6b7280"}}>{u.username}</td>
          <td style={ss.td}><span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:u.role==="admin"?"#fef3c7":"#f3f4f6",color:u.role==="admin"?"#92400e":"#6b7280",fontWeight:600}}>{u.role==="admin"?"⭐ Admin":"Kullanıcı"}</span></td>
          <td style={{...ss.td,textAlign:"right"}}>
            <button onClick={()=>startEdit(u)} style={ss.lnk}>Düzenle</button>
            <button onClick={()=>delUser(u)} style={{...ss.lnk,color:"#ef4444",marginLeft:12}}>Sil</button>
          </td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
