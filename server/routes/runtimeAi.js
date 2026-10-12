"use strict";
const express=require('express');
const authenticate=require('../middleware/auth');
const execution=require('../lib/nativeExecution');
const fail=(status,message)=>Object.assign(new Error(message),{status});
module.exports=pool=>{const router=express.Router();router.use(authenticate);
 router.get('/scene-readiness/history',async(req,res)=>{try{const rows=(await pool.query("SELECT * FROM runtime_ai_results WHERE user_id=$1 AND feature='scene-readiness' ORDER BY created_at DESC,id DESC LIMIT 100",[req.user.id])).rows;res.json({history:rows});}catch(_){res.status(503).json({error:'Saved scene-readiness reports could not be loaded. Retry.'});}});
 router.post('/scene-readiness',async(req,res)=>{let response;const context=execution.current();const controller=context?.controller||new AbortController();let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort();},45000),onClose=()=>{if(!res.writableEnded)controller.abort();};res.on('close',onClose);try{
  if(Object.keys(req.body||{}).some(key=>key!=='context')||typeof req.body?.context!=='string'||!req.body.context.trim()||req.body.context.length>12000)throw fail(400,'context must contain 1 to 12000 characters.');
  const input=req.body.context.trim(),base=process.env.OPENROUTER_BASE_URL,model=process.env.OPENROUTER_MODEL,key=process.env.OPENROUTER_API_KEY;
  if(base!=='https://openrouter.ai/api/v1'||!model||!key)throw fail(503,'Configure the native OpenRouter model, key and exact HTTPS endpoint.');
  if(context)await execution.freshActor(context,pool);execution.active(context);
  try{response=await fetch(base+'/chat/completions',{method:'POST',signal:controller.signal,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0.2,max_tokens:2000,messages:[{role:'system',content:'You are a spatial-computing architect. Prepare a readable Markdown scene-readiness report with summary, geometry, performance, accessibility, deployment risks and next steps. State missing evidence. Hypothetical inputs are planning examples, not inspected assets or completed conversions. Do not invent measurements, files, approvals or external execution.'},{role:'user',content:input}]})});}catch(_){execution.active(context);if(controller.signal.aborted)throw fail(timedOut?504:499,'The scene-readiness request timed out or was cancelled.');throw fail(502,'OpenRouter could not be reached. Retry.');}
  execution.active(context);if(!response.ok)throw fail(502,'OpenRouter rejected the request ('+response.status+').');
  let body;try{body=await response.json();}catch(_){execution.active(context);throw fail(502,'OpenRouter returned an unreadable response.');}execution.active(context);
  const content=body?.choices?.[0]?.message?.content;if(body?.error||typeof body?.id!=='string'||!body.id.trim()||typeof content!=='string'||!content.trim()||body?.choices?.[0]?.finish_reason==='length')throw fail(502,'OpenRouter returned an incomplete report. No report was saved.');
  const receipt={provider:'openrouter',id:body.id,model:body.model||model,usage:body.usage??null};
  const item=(await pool.query("INSERT INTO runtime_ai_results(user_id,feature,input,content,model,provider_receipt) VALUES($1,'scene-readiness',$2,$3,$4,$5) RETURNING *",[req.user.id,{context:input},content,receipt.model,receipt])).rows[0];
  res.json({success:true,content:item.content,model:item.model,providerReceipt:item.provider_receipt,resultId:item.id,persistedAt:item.created_at,item});
 }catch(error){if(!res.destroyed)res.status(error.status||503).json({error:error.status?error.message:'The native scene-readiness report could not be saved. Retry.'});}finally{clearTimeout(timer);res.removeListener('close',onClose);if(response?.body&&!response.bodyUsed)await response.body.cancel().catch(()=>{});}});
 return router;
};
