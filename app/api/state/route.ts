import { loadSnapshot, saveSnapshot } from "../../../lib/snapshot-store";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET(){
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:"Sign in required"},{status:401});
  const payload=await loadSnapshot(user.userId);
  return Response.json({state:payload?JSON.parse(payload):null});
}
export async function PUT(request:Request){
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:"Sign in required"},{status:401});
  const state=await request.json();
  const payload=JSON.stringify(state);
  if(payload.length>2_000_000)return Response.json({error:"State is too large"},{status:413});
  await saveSnapshot(user.userId,payload);
  return Response.json({ok:true});
}
