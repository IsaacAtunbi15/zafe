import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Archive,ArrowLeft,Check,ChevronRight,CloudUpload,ExternalLink,FileText,Image,LayoutDashboard,Link2,Loader2,LogOut,Plus,Save,Search,Video,X} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {signOut} from '../lib/auth';
import AuthPanel from './AuthPanel';
import './DocumentationDesk.css';

const types=['PHOTOGRAPH','PHOTO_SERIES','FILM','DOCUMENTARY','INTERVIEW','ORAL_HISTORY','AUDIO','ARTICLE','ESSAY','RESEARCH_NOTE','OBJECT','CRAFT','FASHION_WORK','ARCHIVAL_DOCUMENT'];
const blank={archive_id:'',title:'',slug:'',type:'PHOTOGRAPH',status:'DRAFT',summary:'',description:'',language:'English',rights_statement:'',credit_line:'',place_id:'',practice_id:'',featured:false};
const slugify=value=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const archiveId=()=>`ZAFE-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
const driveId=value=>{if(!value)return '';const match=value.match(/(?:\/d\/|id=)([-\w]{10,})/);return match?.[1]||value.trim()};
const nice=value=>(value||'').replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase());

function StatusPill({status}){return <span className={`desk-status status-${status?.toLowerCase()}`}>{nice(status)}</span>}

export default function DocumentationDesk({onExit}){
 const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true),[authOpen,setAuthOpen]=useState(false);
 const [view,setView]=useState('overview'),[records,setRecords]=useState([]),[query,setQuery]=useState(''),[form,setForm]=useState({...blank}),[editing,setEditing]=useState(null);
 const [places,setPlaces]=useState([]),[practices,setPractices]=useState([]),[file,setFile]=useState(null),[drive,setDrive]=useState(''),[notice,setNotice]=useState(''),[saving,setSaving]=useState(false);
 const fileRef=useRef(null);

 useEffect(()=>{if(!supabase){setLoading(false);return}supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const {data}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);if(next)setAuthOpen(false)});return()=>data.subscription.unsubscribe()},[]);
 useEffect(()=>{if(!session||!supabase)return;loadDesk()},[session]);

 async function loadDesk(){
  setLoading(true);
  const [profileResult,recordResult,placeResult,practiceResult]=await Promise.all([
   supabase.from('profiles').select('name,role').eq('id',session.user.id).single(),
   supabase.from('records').select('id,archive_id,title,slug,type,status,summary,description,language,rights_statement,credit_line,featured,place_id,practice_id,updated_at,media(id,kind,url,drive_file_id,caption)').order('updated_at',{ascending:false}),
   supabase.from('places').select('id,name').order('name'),
   supabase.from('practices').select('id,name').order('name')
  ]);
  setProfile(profileResult.data);setRecords(recordResult.data||[]);setPlaces(placeResult.data||[]);setPractices(practiceResult.data||[]);
  if(recordResult.error)setNotice(recordResult.error.message);setLoading(false);
 }

 const filtered=useMemo(()=>records.filter(r=>`${r.title} ${r.archive_id} ${r.type} ${r.status}`.toLowerCase().includes(query.toLowerCase())),[records,query]);
 const counts=useMemo(()=>({all:records.length,draft:records.filter(r=>r.status==='DRAFT').length,review:records.filter(r=>r.status==='IN_REVIEW').length,published:records.filter(r=>r.status==='PUBLISHED').length}),[records]);
 const canPublish=profile?.role==='ADMIN';
 const canUseDesk=profile?.role==='ADMIN';

 function createNew(){setEditing(null);setForm({...blank,archive_id:archiveId()});setFile(null);setDrive('');setNotice('');setView('editor')}
 function editRecord(record){setEditing(record.id);setForm({...blank,...record,place_id:record.place_id||'',practice_id:record.practice_id||''});setFile(null);setDrive(record.media?.find(m=>m.drive_file_id)?.drive_file_id||'');setNotice('');setView('editor')}
 function setField(name,value){setForm(current=>({...current,[name]:value,...(name==='title'&&!editing?{slug:slugify(value)}:{})}))}

 async function saveRecord(targetStatus=form.status){
  if(!form.title.trim()||!form.archive_id.trim()){setNotice('Title and archive ID are required.');return}
  if(file&&file.size>50*1024*1024){setNotice('That file is larger than the 50 MB storage limit.');return}
  setSaving(true);setNotice('Saving record…');
  try{
   const payload={...form,slug:form.slug||slugify(form.title),status:targetStatus,place_id:form.place_id||null,practice_id:form.practice_id||null,created_by:session.user.id,published_at:targetStatus==='PUBLISHED'?new Date().toISOString():null};
   delete payload.id;delete payload.media;delete payload.updated_at;if(editing)delete payload.created_by;
   let record;
   if(editing){const {data,error}=await supabase.from('records').update(payload).eq('id',editing).select().single();if(error)throw error;record=data}
   else{const {data,error}=await supabase.from('records').insert(payload).select().single();if(error)throw error;record=data;setEditing(data.id)}
   if(file){
    const extension=file.name.split('.').pop();const path=`${record.id}/${crypto.randomUUID()}.${extension}`;
    const {error:uploadError}=await supabase.storage.from('zafe-media').upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;
    const {error:mediaError}=await supabase.from('media').insert({record_id:record.id,kind:file.type.startsWith('video/')?'VIDEO':file.type.startsWith('audio/')?'AUDIO':'IMAGE',url:path,caption:file.name});if(mediaError)throw mediaError;
   }
   const id=driveId(drive);
   const hasDrive=records.find(r=>r.id===record.id)?.media?.some(m=>m.drive_file_id);
   if(id&&!hasDrive){const {error}=await supabase.from('media').insert({record_id:record.id,kind:'VIDEO',drive_file_id:id,caption:'Google Drive video'});if(error)throw error}
   await loadDesk();setForm(current=>({...current,status:targetStatus}));setNotice(targetStatus==='PUBLISHED'?'Record published.':'Record saved.');setFile(null);
  }catch(error){setNotice(error.message||'The record could not be saved.')}finally{setSaving(false)}
 }

 async function logout(){await signOut();setSession(null);setProfile(null)}
 if(loading)return <div className="desk-loading"><Loader2/><span>Opening the Documentation Desk…</span></div>;
 if(!session)return <div className="desk-gate"><div className="desk-gate-mark">Z</div><p>ZAFE DOCUMENTATION DESK</p><h1>Administrator<br/>access.</h1><span>This private workspace is reserved for ZAFE administrators who catalogue, review and publish archive material.</span><button onClick={()=>setAuthOpen(true)}>ADMIN SIGN IN <ChevronRight/></button><a href="/" onClick={onExit}><ArrowLeft/> RETURN TO THE ARCHIVE</a>{authOpen&&<AuthPanel onClose={()=>setAuthOpen(false)} onSuccess={()=>setAuthOpen(false)}/>}</div>;
 if(profile&&!canUseDesk)return <div className="desk-gate"><div className="desk-gate-mark">Z</div><p>ADMIN ACCESS REQUIRED</p><h1>This account cannot<br/>open the desk.</h1><span>Only a ZAFE administrator account can access archive operations.</span><button onClick={logout}><LogOut/> SIGN OUT</button><a href="/" onClick={onExit}><ArrowLeft/> RETURN TO THE ARCHIVE</a></div>;

 return <div className="desk-shell">
  <aside className="desk-sidebar"><a className="desk-brand" href="/"><b>Z</b><span>ZAFE<small>DOCUMENTATION DESK</small></span></a><nav><button className={view==='overview'?'active':''} onClick={()=>setView('overview')}><LayoutDashboard/> Overview</button><button className={view==='records'?'active':''} onClick={()=>setView('records')}><Archive/> Records <span>{counts.all}</span></button><button className={view==='editor'?'active':''} onClick={createNew}><Plus/> New record</button></nav><div className="desk-user"><i>{(profile?.name||session.user.email)[0].toUpperCase()}</i><div><strong>{profile?.name||'ZAFE editor'}</strong><small>{profile?.role||'MEMBER'}</small></div><button onClick={logout} aria-label="Sign out"><LogOut/></button></div>
  </aside>
  <main className="desk-main">
   <header className="desk-top"><div><p>ARCHIVE OPERATIONS / ZARIA</p><h1>{view==='overview'?'Documentation overview':view==='records'?'Archive records':editing?'Edit catalogue record':'Create a catalogue record'}</h1></div><a href="/"><ExternalLink/> VIEW PUBLIC ARCHIVE</a></header>
   {notice&&<div className={`desk-notice ${notice.includes('saved')||notice.includes('published')?'success':''}`}><span>{notice}</span><button onClick={()=>setNotice('')}><X/></button></div>}

   {view==='overview'&&<><section className="desk-welcome"><div><p>WELCOME BACK</p><h2>{profile?.name||'Archive keeper'}</h2><span>The archive is a living record. Catalogue carefully, credit clearly, and publish only what is ready to be held in public memory.</span></div><button onClick={createNew}><Plus/> ADD A NEW RECORD</button></section><section className="desk-metrics"><article><span>ALL RECORDS</span><strong>{counts.all}</strong><small>In the catalogue</small></article><article><span>DRAFTS</span><strong>{counts.draft}</strong><small>Still being documented</small></article><article><span>IN REVIEW</span><strong>{counts.review}</strong><small>Awaiting a curator</small></article><article><span>PUBLISHED</span><strong>{counts.published}</strong><small>Visible in the archive</small></article></section><section className="desk-recent"><div className="desk-section-head"><div><p>RECENT ACTIVITY</p><h2>Continue documenting</h2></div><button onClick={()=>setView('records')}>VIEW ALL <ChevronRight/></button></div><RecordTable records={records.slice(0,5)} onEdit={editRecord}/></section></>}

   {view==='records'&&<section className="desk-records"><div className="desk-record-tools"><label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search records, IDs, types or status"/></label><button onClick={createNew}><Plus/> NEW RECORD</button></div><RecordTable records={filtered} onEdit={editRecord}/></section>}

   {view==='editor'&&<form className="record-editor" onSubmit={e=>{e.preventDefault();saveRecord()}}><div className="editor-column"><section className="editor-section"><div className="editor-heading"><span>01</span><div><p>IDENTIFICATION</p><h2>What is this record?</h2></div></div><div className="field-grid-two"><label>ARCHIVE ID<input required value={form.archive_id} onChange={e=>setField('archive_id',e.target.value)}/></label><label>RECORD TYPE<select value={form.type} onChange={e=>setField('type',e.target.value)}>{types.map(type=><option key={type}>{type}</option>)}</select></label></div><label>TITLE<input required value={form.title} onChange={e=>setField('title',e.target.value)} placeholder="A clear, specific title"/></label><label>URL SLUG<input value={form.slug} onChange={e=>setField('slug',slugify(e.target.value))} placeholder="generated-from-title"/></label><label>SHORT SUMMARY<textarea rows="3" value={form.summary||''} onChange={e=>setField('summary',e.target.value)} placeholder="Describe this record in one or two sentences."/></label><label>FULL DESCRIPTION<textarea rows="7" value={form.description||''} onChange={e=>setField('description',e.target.value)} placeholder="Context, process, history, observations and significance…"/></label></section>
   <section className="editor-section"><div className="editor-heading"><span>02</span><div><p>CONTEXT</p><h2>Locate the knowledge</h2></div></div><div className="field-grid-two"><label>PLACE<select value={form.place_id||''} onChange={e=>setField('place_id',e.target.value)}><option value="">Not assigned</option>{places.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label><label>PRACTICE<select value={form.practice_id||''} onChange={e=>setField('practice_id',e.target.value)}><option value="">Not assigned</option>{practices.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label><label>LANGUAGE<input value={form.language||''} onChange={e=>setField('language',e.target.value)} placeholder="Hausa / English"/></label><label>CREDIT LINE<input value={form.credit_line||''} onChange={e=>setField('credit_line',e.target.value)} placeholder="Maker, photographer, interviewer…"/></label></div><label>RIGHTS & PERMISSIONS<textarea rows="3" value={form.rights_statement||''} onChange={e=>setField('rights_statement',e.target.value)} placeholder="Copyright holder, consent and permitted use"/></label></section></div>
   <aside className="editor-aside"><section className="editor-section media-panel"><div className="editor-heading"><span>03</span><div><p>MEDIA</p><h2>Attach evidence</h2></div></div><input ref={fileRef} hidden type="file" accept="image/*,video/*,audio/*,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/><button type="button" className="upload-drop" onClick={()=>fileRef.current?.click()}><CloudUpload/><strong>{file?file.name:'CHOOSE A FILE'}</strong><span>Images, audio, video or PDF<br/>Maximum 50 MB</span></button><div className="media-divider"><i/>OR<i/></div><label>GOOGLE DRIVE VIDEO URL<div className="input-icon"><Link2/><input value={drive} onChange={e=>setDrive(e.target.value)} placeholder="Paste a shared Drive link or file ID"/></div></label>{drive&&<small className="drive-detected"><Check/> Drive file detected: {driveId(drive)}</small>}{editing&&records.find(r=>r.id===editing)?.media?.length>0&&<div className="attached-media"><p>ATTACHED MEDIA</p>{records.find(r=>r.id===editing).media.map(m=><div key={m.id}>{m.kind==='VIDEO'?<Video/>:m.kind==='IMAGE'?<Image/>:<FileText/>}<span>{m.caption||m.drive_file_id||m.url}</span><Check/></div>)}</div>}</section><section className="editor-section publish-panel"><p>PUBLICATION STATUS</p><StatusPill status={form.status}/><label className="feature-check"><input type="checkbox" checked={form.featured} onChange={e=>setField('featured',e.target.checked)}/><span>Feature this record in the archive</span></label><button type="submit" disabled={saving}><Save/> {saving?'SAVING…':editing?'SAVE CHANGES':'SAVE DRAFT'}</button><button type="button" disabled={saving} onClick={()=>saveRecord('IN_REVIEW')}>SUBMIT FOR REVIEW <ChevronRight/></button>{canPublish&&<button type="button" className="publish-button" disabled={saving} onClick={()=>saveRecord('PUBLISHED')}><Check/> PUBLISH RECORD</button>}</section></aside></form>}
  </main>
 </div>
}

function RecordTable({records,onEdit}){
 if(!records.length)return <div className="desk-empty"><Archive/><h3>No records found</h3><p>Create the first record or adjust your search.</p></div>;
 return <div className="record-table"><div className="record-row record-head"><span>RECORD</span><span>TYPE</span><span>STATUS</span><span>UPDATED</span><span/></div>{records.map(record=><button className="record-row" key={record.id} onClick={()=>onEdit(record)}><span><i>{record.type?.includes('FILM')||record.type==='DOCUMENTARY'?<Video/>:record.type?.includes('PHOTO')?<Image/>:<FileText/>}</i><b>{record.title}<small>{record.archive_id}</small></b></span><span>{nice(record.type)}</span><span><StatusPill status={record.status}/></span><span>{new Date(record.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span><span><ChevronRight/></span></button>)}</div>
}
