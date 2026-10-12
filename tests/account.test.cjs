const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/account.js'),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
const next=()=>new Promise(r=>setTimeout(r,5));
function device(db,initialUser=null,cache=new Map()){
 let user=initialUser,listener,current,fail=false,delayed=null;
 const events={};const applied=[];const backups=[];
 const client={auth:{getSession:async()=>({data:{session:user?{user}:null}}),onAuthStateChange:f=>{listener=f},signInWithPassword:async()=>({}),signOut:async()=>{user=null;listener('SIGNED_OUT',null);return{}}},from:()=>({select:()=>({eq:(col,id)=>({maybeSingle:async()=>{if(fail)throw Error('offline');return{data:copy(db.get(id)||null)}}})})}),rpc:async(name,args)=>{const id=user.id;if(delayed)await delayed;if(fail)return{error:{code:'network'}};const old=db.get(id);if((old?.revision||0)!==args.p_revision)return{error:{code:'40001'}};const row={state:copy(args.p_state),revision:(old?.revision||0)+1,updated_at:new Date().toISOString()};db.set(id,row);return{data:[copy(row)]}}};
 const ctx={window:{ATLAS_AUTH_CONFIG:{url:'test',key:'test'},supabase:{createClient:()=>client},addEventListener:(e,f)=>events[e]=f},document:{addEventListener:()=>{}},localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)},location:{origin:'http://test'},setTimeout:(f,n)=>{const t=setTimeout(f,n);t.unref();return t},clearTimeout};
 vm.runInNewContext(source,ctx);
 const api=ctx.window.ATLAS_ACCOUNT.create({fresh:u=>({version:1,name:u?.id||'Guest'}),clean:x=>copy(x),status:()=>{},lock:()=>{},apply:x=>{current=x;applied.push(x)},open:()=>{},backup:x=>backups.push(x),guestChanged:()=>{},recovery:()=>{}});
 return{api,cache,applied,backups,state:()=>current,offline:value=>fail=value,delay:promise=>delayed=promise,auth:async u=>{user=u;listener(u?'SIGNED_IN':'SIGNED_OUT',u?{user:u}:null);await next()}};
}
const A={id:'account-a',email:'a@example.invalid'},B={id:'account-b',email:'b@example.invalid'};
test('guest revisions stay separate; sign-in never imports them implicitly',async()=>{
 const cache=new Map([['atlas-studio-v1',JSON.stringify({version:1,name:'Guest',xp:12})]]),db=new Map(),d=device(db,null,cache);
 await d.api.start();assert.equal(d.state().xp,12);await d.auth(A);await d.api.flush();assert.equal(db.get(A.id).state.name,A.id);assert.equal(db.get(A.id).state.xp,undefined);assert.equal(JSON.parse(cache.get('atlas-studio-v1')).xp,12);
});
test('concurrent devices detect conflict instead of silently overwriting progress',async()=>{
 const db=new Map(),one=device(db,A);await one.api.start();await one.api.flush();const two=device(db,A);await two.api.start();
 one.api.save({version:1,name:'first device',xp:10});await one.api.flush();two.api.save({version:1,name:'second device',xp:20});assert.equal(await two.api.flush(),false);assert.equal(two.api.info().status,'conflict');assert.equal(db.get(A.id).state.xp,10);
 await two.api.resolve('cloud');assert.equal(two.state().xp,10);assert.equal(two.backups[0].xp,20);
});
test('saving edits made while a request is in flight does not lose the later edits',async()=>{
 const db=new Map(),d=device(db,A);await d.api.start();await d.api.flush();let release;d.delay(new Promise(r=>release=r));d.api.save({version:1,name:'first'});const pending=d.api.flush();d.api.save({version:1,name:'second'});release();await pending;assert.equal(db.get(A.id).state.name,'second');assert.equal(d.api.info().dirty,false);
});
test('offline edits survive reload and block sign-out until saved',async()=>{
 const db=new Map(),d=device(db,A);await d.api.start();await d.api.flush();d.offline(true);d.api.save({version:1,name:'offline note'});assert.equal(await d.api.flush(),false);await assert.rejects(d.api.signOut());assert.equal(JSON.parse(d.cache.get('atlas-profile-v1:'+A.id)).dirty,true);
 const reloaded=device(db,A,d.cache);await reloaded.api.start();await reloaded.api.flush();assert.equal(db.get(A.id).state.name,'offline note');await reloaded.api.signOut();assert.equal(reloaded.api.info().user,null);assert.equal(reloaded.cache.has('atlas-profile-v1:'+A.id),false);
});
test('switching accounts rejects an old account response and preserves separate drafts',async()=>{
 const db=new Map(),d=device(db,A);await d.api.start();await d.api.flush();let release;d.delay(new Promise(r=>release=r));d.api.save({version:1,name:'only A'});const pending=d.api.flush();await d.auth(B);release();await pending;await next();await d.api.flush();assert.equal(d.api.info().user.id,B.id);assert.equal(d.state().name,B.id);assert.equal(db.get(A.id).state.name,'only A');assert.equal(db.get(B.id).state.name,B.id);
});
test('new cloud state never replaces active work without an explicit choice',async()=>{
 const db=new Map(),d=device(db,A);await d.api.start();await d.api.flush();db.set(A.id,{state:{version:1,name:'remote'},revision:2,updated_at:new Date().toISOString()});await d.api.refresh();assert.equal(d.api.info().status,'remote');assert.equal(d.state().name,A.id);await d.api.resolve('cloud');assert.equal(d.state().name,'remote');
});
