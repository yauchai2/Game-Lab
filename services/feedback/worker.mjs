/* Public feedback bridge. GitHub credentials must exist only in Worker secrets. */
const REPOSITORY='yauchai2/Game-Lab';
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json;charset=utf-8',...headers}});
const sha=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
export function validateFeedback(raw){
 if(!raw||!['錯誤','平衡','玩法建議','其他'].includes(raw.category)||typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>60||typeof raw.details!=='string'||!raw.details.trim()||raw.details.length>700||!/^0\.\d+\.\d+$/.test(raw.version)||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(raw.requestId||''))return null;
 return {requestId:raw.requestId,category:raw.category,title:raw.title.trim(),details:raw.details.trim(),version:raw.version,device:typeof raw.device==='string'?raw.device.slice(0,220):''};
}
async function readSmall(request){const reader=request.body?.getReader();if(!reader)return null;let length=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>4096){await reader.cancel();throw Error('too-large');}chunks.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));}
const b64=value=>btoa(String.fromCharCode(...value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
async function appToken(env){
 if(env.GITHUB_TOKEN)return env.GITHUB_TOKEN;
 const now=Math.floor(Date.now()/1000),enc=s=>b64(new TextEncoder().encode(JSON.stringify(s))),head=enc({alg:'RS256',typ:'JWT'}),body=enc({iat:now-30,exp:now+540,iss:env.GITHUB_APP_ID});
 const pem=String(env.GITHUB_APP_PRIVATE_KEY||'').replace(/-----[^-]+-----/g,'').replace(/\s/g,''),key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']),signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(head+'.'+body)),jwt=head+'.'+body+'.'+b64(new Uint8Array(signature));
 const response=await fetch('https://api.github.com/app/installations/'+encodeURIComponent(env.GITHUB_INSTALLATION_ID)+'/access_tokens',{method:'POST',headers:{Authorization:'Bearer '+jwt,Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'Game-Lab-Feedback'},body:JSON.stringify({repositories:['Game-Lab'],permissions:{issues:'write'}}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('app-auth');return (await response.json()).token;
}
export class FeedbackGate{
 constructor(state,env){this.state=state;this.env=env;}
 async fetch(request){return this.state.blockConcurrencyWhile(async()=>{
  const data=validateFeedback(await request.json());if(!data)return json({error:'invalid'},400);const hash=await sha(JSON.stringify(data)),old=await this.state.storage.get('receipt');if(old){if(old.hash!==hash)return json({error:'changed-request'},409);if(old.status==='done')return json({ok:true,receipt:old.receipt});if(old.status==='uncertain'||old.status==='pending')return json({pending:true},202);}
  let token;try{token=await appToken(this.env);}catch(_){return json({error:'unavailable'},503);}
  await this.state.storage.put('receipt',{hash,status:'pending'});
  try{
   const text=data.details.replace(/```/g,'｀｀｀'),body=`<!-- game-feedback:${data.requestId} -->\n類別：${data.category}\n版本：${data.version}\n\n\`\`\`text\n${text}\n\`\`\`${data.device?'\n\n裝置（玩家自選）：\n\`\`\`text\n'+data.device.replace(/```/g,'｀｀｀')+'\n\`\`\`':''}`;
   const response=await fetch('https://api.github.com/repos/'+REPOSITORY+'/issues',{method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Game-Lab-Feedback'},body:JSON.stringify({title:`[${data.category}] ${data.title.replace(/@/g,'＠')}`,body}),signal:AbortSignal.timeout(10000)});
   if(!response.ok){await this.state.storage.put('receipt',{hash,status:response.status>=500?'uncertain':'rejected'});return json({error:'delivery-failed'},response.status>=500?503:502);}
   const issue=await response.json();if(!Number.isSafeInteger(issue.number))throw Error('missing-receipt');await this.state.storage.put('receipt',{hash,status:'done',receipt:issue.number});return json({ok:true,receipt:issue.number});
  }catch(_){await this.state.storage.put('receipt',{hash,status:'uncertain'});return json({pending:true},202);}
 });}
}
export default {async fetch(request,env){
 const allowed=env.ALLOWED_ORIGIN||'https://yauchai2.github.io',origin=request.headers.get('origin'),headers={'access-control-allow-origin':allowed,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type','vary':'Origin'};
 if(origin!==allowed)return json({error:'origin'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST'||new URL(request.url).pathname!=='/feedback')return json({error:'not-found'},404,headers);
 if(!env.FEEDBACK_GATE||!env.RATE_LIMIT||!env.RATE_SALT||!env.GITHUB_TOKEN&&!(env.GITHUB_APP_ID&&env.GITHUB_INSTALLATION_ID&&env.GITHUB_APP_PRIVATE_KEY))return json({error:'not-configured'},503,headers);
 const key=await sha(env.RATE_SALT+':'+(request.headers.get('CF-Connecting-IP')||'unknown')),limit=await env.RATE_LIMIT.limit({key});if(!limit.success)return json({error:'rate-limit'},429,headers);
 let raw;try{raw=await readSmall(request);}catch(e){return json({error:'invalid-body'},e.message==='too-large'?413:400,headers);}const data=validateFeedback(raw);if(!data)return json({error:'invalid'},400,headers);
 const stub=env.FEEDBACK_GATE.get(env.FEEDBACK_GATE.idFromName(data.requestId)),result=await stub.fetch(new Request('https://feedback.internal/submit',{method:'POST',body:JSON.stringify(data)}));return new Response(result.body,{status:result.status,headers:{...Object.fromEntries(result.headers),...headers}});
}};
