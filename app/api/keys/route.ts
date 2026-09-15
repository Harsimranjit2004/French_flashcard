import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { apiKeys } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

async function sha256(value:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("")}
export async function GET(){const user=await getChatGPTUser();if(!user)return Response.json({error:"Sign in required"},{status:401});const keys=await (await getDb()).select({id:apiKeys.id,prefix:apiKeys.keyPrefix,label:apiKeys.label,createdAt:apiKeys.createdAt,lastUsedAt:apiKeys.lastUsedAt}).from(apiKeys).where(and(eq(apiKeys.userId,user.userId),isNull(apiKeys.revokedAt)));return Response.json({keys})}
export async function POST(){const user=await getChatGPTUser();if(!user)return Response.json({error:"Sign in required"},{status:401});const raw=crypto.getRandomValues(new Uint8Array(24));const token="lexique_sk_"+[...raw].map(b=>b.toString(16).padStart(2,"0")).join("");await (await getDb()).insert(apiKeys).values({id:crypto.randomUUID(),userId:user.userId,keyHash:await sha256(token),keyPrefix:token.slice(0,18),label:"AI assistant",createdAt:new Date().toISOString()});return Response.json({token},{status:201})}
export async function DELETE(request:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:"Sign in required"},{status:401});const id=new URL(request.url).searchParams.get("id");if(!id)return Response.json({error:"id required"},{status:400});await (await getDb()).update(apiKeys).set({revokedAt:new Date().toISOString()}).where(and(eq(apiKeys.id,id),eq(apiKeys.userId,user.userId)));return Response.json({ok:true})}
