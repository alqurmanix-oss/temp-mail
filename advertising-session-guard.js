(()=>{
"use strict";
const U="https://fkiokwwztbyztleeuwks.supabase.co";
const K="sb_publishable_4DCXObCqPUoNnI8ANOo8dA_nRAg0y5_";
const API=U+"/functions/v1/aqx-identity";
const client=window.supabase.createClient(U,K,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let leaseId=null, started=false, heartbeat=null, activeSincePing=false;
const login="./advertising-login.html?reason=security";
const activityEvents=["pointerdown","keydown","touchstart","wheel","click"];
const markActivity=()=>{activeSincePing=true;};
async function send(path,token,body){
 const r=await fetch(API+path,{method:"POST",headers:{"Content-Type":"application/json","apikey":K,Authorization:"Bearer "+token},body:JSON.stringify(body||{})});
 const j=await r.json().catch(()=>({}));
 return {ok:r.ok,status:r.status,data:j};
}
async function expire(){
 if(heartbeat)clearInterval(heartbeat);
 await client.auth.signOut({scope:"local"}).catch(()=>{});
 location.replace(login);
}
async function start(required=true){
 if(started)return true;
 const {data,error}=await client.auth.getSession();
 const session=data?.session;
 if(error||!session?.user?.id){
  if(required)location.replace(login);
  return !required;
 }
 leaseId=sessionStorage.getItem("aqx_ads_server_lease_id");
 if(!leaseId){leaseId=crypto.randomUUID();sessionStorage.setItem("aqx_ads_server_lease_id",leaseId);}
 const acquired=await send("/v1/advertising/session/acquire",session.access_token,{lease_id:leaseId});
 if(!acquired.ok||acquired.data?.success!==true){
  if(acquired.data?.error==="ADVERTISING_TAB_ALREADY_ACTIVE"){
   alert("حسابك مفتوح بالفعل في تبويب آخر. أغلق التبويب الآخر ثم حاول مجددًا.");
  }else if(acquired.data?.error==="ADVERTISING_IDLE_TIMEOUT"){
   await expire();return false;
  }
  location.replace(login);return false;
 }
 started=true;
 activityEvents.forEach(name=>addEventListener(name,markActivity,{passive:true}));
 heartbeat=setInterval(async()=>{
  const current=await client.auth.getSession();
  const activeSession=current.data?.session;
  if(!activeSession?.access_token){await expire();return;}
  const userActive=activeSincePing;
  activeSincePing=false;
  const result=await send("/v1/advertising/session/heartbeat",activeSession.access_token,{lease_id:leaseId,user_active:userActive});
  if(!result.ok||result.data?.success!==true)await expire();
 },15000);
 return true;
}
window.AQXAdvertisingSessionGuard={client,start,get leaseId(){return leaseId;},headers(){return leaseId?{"x-aqx-ads-lease":leaseId}:{};}};
})();