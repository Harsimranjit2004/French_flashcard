"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { BookOpen, Brain, Check, ChevronRight, Flame, Headphones, Home, Library, Mic, Moon, MoreHorizontal, Plus, Search, Settings, Sparkles, Sun, Target, Volume2, X } from "lucide-react";
import { createEmptyCard, fsrs, Rating, State } from "ts-fsrs";
import { AuthButton } from "./auth-button";

type View = "today" | "review" | "add" | "browse" | "stats" | "settings";
type Kind = "PRODUCTION" | "RECOGNITION" | "LISTENING" | "GENDER" | "CLOZE";
type Note = { id:string; lemma:string; article:string; gender:"masculine"|"feminine"|null; part:string; translation:string; exampleFr:string; exampleEn:string; ipa:string; deck:string; tags:string[]; cefr:string };
type Card = { id:string; noteId:string; kind:Kind; memory:ReturnType<typeof createEmptyCard>; lapses:number; successes:number; suspended:boolean };
type Log = { id:string; cardId:string; rating:number; at:string; duration:number };
type Preferences = { retention:number; newLimit:number; minutes:number; autoplay:boolean; rate:number; dark:boolean; busy:boolean; language?:"fr"|"en" };
type Store = { schemaVersion?:number; notes:Note[]; cards:Card[]; logs:Log[]; preferences:Preferences };
type Action = {type:"hydrate"; value:Store}|{type:"add"; notes:Note[]; cards:Card[]}|{type:"rate"; card:Card; log:Log}|{type:"prefs"; patch:Partial<Preferences>}|{type:"suspend"; noteId:string};

const KEY="lexique-data-v1";
const seed:Note[]=[
  {id:"seuil",lemma:"le seuil",article:"le",gender:"masculine",part:"nom",translation:"threshold",exampleFr:"Le seuil de réussite est fixé à soixante pour cent.",exampleEn:"The passing threshold is set at sixty percent.",ipa:"/sœj/",deck:"TEF essentiel",tags:["travail","argumentation"],cefr:"B2"},
  {id:"neanmoins",lemma:"néanmoins",article:"",gender:null,part:"adverbe",translation:"nevertheless",exampleFr:"Cette solution coûte cher; néanmoins, elle reste efficace.",exampleEn:"This solution is expensive; nevertheless, it remains effective.",ipa:"/ne.ɑ̃.mwɛ̃/",deck:"TEF essentiel",tags:["connecteur","écrit"],cefr:"B2"},
  {id:"enjeu",lemma:"un enjeu",article:"un",gender:"masculine",part:"nom",translation:"an issue; a challenge",exampleFr:"Le logement abordable est un enjeu majeur au Canada.",exampleEn:"Affordable housing is a major issue in Canada.",ipa:"/ɑ̃.ʒø/",deck:"TEF essentiel",tags:["société","argumentation"],cefr:"B2"},
];
const makeCards=(note:Note):Card[]=>[{id:`${note.id}-RECOGNITION`,noteId:note.id,kind:"RECOGNITION",memory:createEmptyCard(new Date()),lapses:0,successes:0,suspended:false}];
const initial:Store={schemaVersion:2,notes:seed,cards:seed.flatMap(makeCards),logs:[],preferences:{retention:.9,newLimit:10,minutes:20,autoplay:true,rate:1,dark:false,busy:false,language:"fr"}};
function reducer(s:Store,a:Action):Store{switch(a.type){case"hydrate":return a.value;case"add":return{...s,notes:[...a.notes,...s.notes],cards:[...a.cards,...s.cards]};case"rate":return{...s,cards:s.cards.map(c=>c.id===a.card.id?a.card:c),logs:[a.log,...s.logs]};case"prefs":return{...s,preferences:{...s.preferences,...a.patch}};case"suspend":return{...s,cards:s.cards.map(c=>c.noteId===a.noteId?{...c,suspended:!c.suspended}:c)}}}
function restore(raw:string):Store{const v=JSON.parse(raw) as Store;let notes=v.notes.filter(n=>!/(?:regular|irregular)\s*-?\s*ir\s*:/i.test(n.lemma)&&!/[#*]/.test(n.lemma)).map(n=>n.exampleFr.startsWith("J’essaie d’utiliser «")||n.exampleEn==="Add a natural example after checking the meaning."?{...n,exampleFr:"",exampleEn:""}:n);if((v.schemaVersion??1)<2)notes=notes.filter(n=>!/^verbs?$/i.test(n.part)&&!/^verbes?$/i.test(n.part));const noteIds=new Set(notes.map(n=>n.id));const cards=v.cards.filter(c=>c.kind==="RECOGNITION"&&noteIds.has(c.noteId)).map(c=>({...c,memory:{...c.memory,due:new Date(c.memory.due),last_review:c.memory.last_review?new Date(c.memory.last_review):undefined}}));const cardIds=new Set(cards.map(c=>c.id));return{...v,schemaVersion:2,notes,cards,logs:(v.logs??[]).filter(l=>cardIds.has(l.cardId))}}
function bare(v:string){return v.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu,"").replace(/[^a-z0-9'’\s-]/g,"").replace(/^(le|la|les|un|une|des|l’|l')\s*/i,"").replace(/\s+/g," ")}
function uid(){return typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function"?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`}
function distance(a:string,b:string){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}return row[b.length]}
function say(text:string,rate=1){if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="fr-FR";u.rate=rate;const voices=window.speechSynthesis.getVoices();u.voice=voices.find(v=>v.lang==="fr-FR")??voices.find(v=>v.lang.startsWith("fr"))??null;window.speechSynthesis.speak(u)}
const lexicon:Record<string,Partial<Note>>={
  seuil:{article:"le",gender:"masculine",part:"nom",translation:"threshold",ipa:"/sœj/",cefr:"B2"},
  neanmoins:{part:"adverbe",translation:"nevertheless",ipa:"/ne.ɑ̃.mwɛ̃/",cefr:"B2"},
  enjeu:{article:"un",gender:"masculine",part:"nom",translation:"issue; challenge",ipa:"/ɑ̃.ʒø/",cefr:"B2"},
  améliorer:{part:"verbe",translation:"to improve",ipa:"/a.me.ljɔ.ʁe/",cefr:"A2"},
  pourtant:{part:"adverbe",translation:"however; yet",ipa:"/puʁ.tɑ̃/",cefr:"B1"},
  démarche:{article:"la",gender:"feminine",part:"nom",translation:"approach; process",ipa:"/de.maʁʃ/",cefr:"B2"},
};
const nav:[View,string,string,typeof Home][]=[["today","Aujourd’hui","Today",Home],["add","Ajouter","Add",Plus],["browse","Cartes","Cards",Library],["stats","Progrès","Progress",Brain],["settings","Réglages","Settings",Settings]];

export function LexiqueApp(){
  const [store,dispatch]=useReducer(reducer,initial);const[view,setView]=useState<View>("today");const[ready,setReady]=useState(false);
  const en=store.preferences.language==="en";
  const due=store.cards.filter(c=>!c.suspended&&new Date(c.memory.due)<=new Date()).length;
  useEffect(()=>{let active=true;(async()=>{try{const response=await fetch("/api/state");if(response.ok){const remote=await response.json() as {state:Store|null};if(remote.state&&active){dispatch({type:"hydrate",value:restore(JSON.stringify(remote.state))});setReady(true);return}}}catch{}const raw=localStorage.getItem(KEY);if(raw)try{dispatch({type:"hydrate",value:restore(raw)})}catch{}if(active)setReady(true)})();navigator.serviceWorker?.register("/sw.js").catch(()=>{});return()=>{active=false}},[]);
  useEffect(()=>{if(!ready)return;localStorage.setItem(KEY,JSON.stringify(store));const timer=setTimeout(()=>fetch("/api/state",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(store)}).catch(()=>{}),700);return()=>clearTimeout(timer)},[store,ready]);
  useEffect(()=>{document.documentElement.dataset.theme=store.preferences.dark?"dark":"light";document.documentElement.lang=en?"en":"fr"},[store.preferences.dark,en]);
  useEffect(()=>{
    const context=(document as any).modelContext;
    if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    const register=(tool:any)=>Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});
    register({
      name:"add_french_words",
      title:"Add French words",
      description:"Automatically find meanings and add French words, verbs, or expressions to the visible Lexique deck.",
      inputSchema:{type:"object",properties:{words:{type:"array",items:{type:"string"}},deck:{type:"string"}},required:["words"],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute:async({words,deck="TEF essentiel"}:{words:string[];deck?:string})=>{
        const response=await fetch("/api/enrich",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({entries:words})});
        if(!response.ok)throw new Error("Word enrichment failed");
        const data=await response.json() as {words:Array<Pick<Note,"lemma"|"translation"|"article"|"gender"|"part"|"cefr">&{tags?:string[]}>};
        const existing=new Set(store.notes.map(n=>bare(n.lemma)));
        const notes=data.words.filter(word=>!existing.has(bare(word.lemma))).map(word=>{const known=lexicon[bare(word.lemma)]||{};return{id:uid(),...word,exampleFr:known.exampleFr||"",exampleEn:known.exampleEn||"",ipa:known.ipa||"",deck,tags:["assistant","ajout intelligent",...(word.tags??[])],cefr:known.cefr||word.cefr}as Note});
        dispatch({type:"add",notes,cards:notes.flatMap(makeCards)});
        setView("browse");
        return{created:notes.map(n=>({id:n.id,lemma:n.lemma,meaning:n.translation})),duplicatesSkipped:words.length-notes.length};
      }
    });
    register({
      name:"start_french_review",
      title:"Start French review",
      description:"Open today's due Lexique review session.",
      inputSchema:{type:"object",properties:{},additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute:()=>{setView("review");return{started:true,due}}
    });
    return()=>lifecycle.abort();
  },[store.notes,due]);
  return <div className="app"><header className="topbar"><button className="brand" onClick={()=>setView("today")}><span>L</span>Lexique</button><div><button className="language-switch" aria-label="French or English interface" onClick={()=>dispatch({type:"prefs",patch:{language:en?"fr":"en"}})}><span className={!en?"active":""}>FR</span><span className={en?"active":""}>EN</span></button><button className="icon" aria-label={en?"Change theme":"Changer le thème"} onClick={()=>dispatch({type:"prefs",patch:{dark:!store.preferences.dark}})}>{store.preferences.dark?<Sun/>:<Moon/>}</button><AuthButton/></div></header>
    <aside className="sidebar"><p>{en?"LEARN":"APPRENDRE"}</p>{nav.map(([id,fr,enLabel,Icon])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}><Icon/>{en?enLabel:fr}</button>)}<p className="decks-label">{en?"MY DECKS":"MES PAQUETS"}</p><div className="side-deck"><i/>TEF essentiel <b>{due}</b></div><div className="side-deck"><i className="gold"/>{en?"Daily life":"Vie quotidienne"} <b>0</b></div><div className="tip"><Sparkles/><span><b>{en?"Daily tip":"Conseil du jour"}</b>{en?"Recall the word before revealing it.":"Produisez le mot avant de le révéler."}</span></div></aside>
    <main className="main">{view==="today"&&<Today store={store} due={due} go={setView}/>} {view==="review"&&<Review store={store} dispatch={dispatch} done={()=>setView("today")}/>} {view==="add"&&<Add store={store} dispatch={dispatch}/>} {view==="browse"&&<Browse store={store} dispatch={dispatch}/>} {view==="stats"&&<Stats store={store}/>} {view==="settings"&&<Prefs store={store} dispatch={dispatch}/>}</main>
    <nav className="bottom-nav">{nav.map(([id,fr,enLabel,Icon])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}><Icon/><span>{en?enLabel:fr}</span></button>)}</nav>
  </div>;
}

function Today({store,due,go}:{store:Store;due:number;go:(v:View)=>void}){const en=store.preferences.language==="en";const today=store.logs.filter(l=>new Date(l.at).toDateString()===new Date().toDateString()).length;const target=Math.max(10,today+due);const pct=Math.min(100,Math.round(today/target*100));return <div className="page"><p className="eyebrow">{en?"TUESDAY · SEPTEMBER 15":"MARDI · 15 SEPTEMBRE"}</p><div className="heading"><div><h1>{en?"Good evening, Sam.":"Bonsoir, Sam."}</h1><p>{en?"A short session now makes tomorrow easier.":"Une courte séance maintenant fera le travail de demain."}</p></div><button className="secondary" onClick={()=>go("add")}><Plus/>{en?"Add words":"Ajouter des mots"}</button></div>
  <section className="today-grid"><article className="focus"><div><span className="pill"><Target/>{en?"TODAY’S SESSION":"SÉANCE DU JOUR"}</span><h2>{due||Math.min(store.cards.length,store.preferences.newLimit)} {en?"cards are waiting":"cartes vous attendent"}</h2><p>{due?(en?`${due} due reviews come before new words.`:`${due} révisions dues passent avant les nouveaux mots.`):(en?"Your queue is ready with useful TEF vocabulary.":"Votre file est prête avec du vocabulaire TEF utile.")}</p><button className="primary" onClick={()=>go("review")}>{en?"Start":"Commencer"} <ChevronRight/></button><small>≈ {Math.max(2,Math.ceil((due||10)*.45))} min · {en?"audio ready":"audio prêt"}</small></div><div className="dial" style={{background:`conic-gradient(var(--blue) ${pct*3.6}deg,var(--dial) 0)`}}><span><b>{pct}%</b>{en?"today":"aujourd’hui"}</span></div></article><article className="streak"><span><Flame/></span><b>7 {en?"days":"jours"}</b><p>{en?"current streak":"série actuelle"}</p><div>{["L","M","M","J","V","S","D"].map((d,i)=><i className={i<6?"done":""} key={i}>{i<6?<Check/>:d}</i>)}</div></article></section>
  <SectionTitle title={en?"Your rhythm":"Votre rythme"} detail={en?"Consistency matters more than volume.":"La régularité compte plus que le volume."}/><section className="metrics"><Metric icon={BookOpen} value={String(store.notes.length)} label={en?"words learned":"mots appris"} note={en?"5 this week":"5 cette semaine"}/><Metric icon={Brain} value={`${Math.max(84,90-store.logs.filter(l=>l.rating===1).length)}%`} label={en?"estimated retention":"rétention estimée"} note={`${en?"target":"objectif"} ${Math.round((store.preferences.busy?.85:store.preferences.retention)*100)}%`}/><Metric icon={Target} value={String(today)} label={en?"reviews today":"révisions aujourd’hui"} note={`${due} ${en?"remaining":"restantes"}`}/><Metric icon={Headphones} value="12 min" label={en?"listening this week":"écoute cette semaine"} note={en?"+18% since Monday":"+18% depuis lundi"}/></section>
  <SectionTitle title={en?"Decks":"Paquets"} detail={en?"See the word first, then reveal its meaning.":"Le mot apparaît d’abord; révélez ensuite son sens."}/><section className="deck-grid"><Deck name="TEF essentiel" detail={en?"Connectors, work, society, and argumentation.":"Connecteurs, travail, société et argumentation."} count={store.notes.length} due={due}/><Deck name={en?"Daily life":"Vie quotidienne"} detail={en?"The French you need every day.":"Le français dont vous avez besoin chaque jour."} count={24} due={0}/></section></div>}
function SectionTitle({title,detail}:{title:string;detail:string}){return <div className="section-title"><div><h2>{title}</h2><p>{detail}</p></div><button>Tout voir <ChevronRight/></button></div>}
function Metric({icon:Icon,value,label,note}:{icon:typeof Home;value:string;label:string;note:string}){return <article className="metric"><span><Icon/></span><b>{value}</b><p>{label}</p><small>{note}</small></article>}
function Deck({name,detail,count,due}:{name:string;detail:string;count:number;due:number}){return <article className="deck"><div><span><BookOpen/></span><MoreHorizontal/></div><h3>{name}</h3><p>{detail}</p><div className="track"><i style={{width:name.startsWith("TEF")?"68%":"36%"}}/></div><footer><span>{count} mots</span><b>{due?`${due} dues`:"À jour"}</b></footer></article>}

function Review({store,dispatch,done}:{store:Store;dispatch:React.Dispatch<Action>;done:()=>void}){
  const en=store.preferences.language==="en";
  const scheduler=useMemo(()=>fsrs({request_retention:store.preferences.busy?.85:store.preferences.retention,maximum_interval:730,enable_fuzz:true,enable_short_term:true,learning_steps:["1m","10m"],relearning_steps:["10m"]}),[store.preferences]);
  const[queue,setQueue]=useState(()=>{const due=store.cards.filter(c=>!c.suspended&&new Date(c.memory.due)<=new Date());return due.length?due:store.cards.filter(c=>!c.suspended&&c.memory.state===State.New).slice(0,store.preferences.newLimit)});
  const[index,setIndex]=useState(0),[shown,setShown]=useState(false),[started,setStarted]=useState(Date.now()),[listening,setListening]=useState(false);const card=queue[index],note=store.notes.find(n=>n.id===card?.noteId);
  useEffect(()=>{if(card?.kind==="LISTENING"&&store.preferences.autoplay&&note)say(note.lemma,store.preferences.rate)},[card?.id]);
  function play(slow=false){if(note)say(note.lemma,slow?.7:store.preferences.rate)}
  function rate(r:Rating){if(!card)return;const result=scheduler.next(card.memory,new Date(),r);const lapses=card.lapses+(r===Rating.Again?1:0);const updated={...card,memory:result.card,lapses,successes:card.successes+(r===Rating.Again?0:1),suspended:lapses>=8};dispatch({type:"rate",card:updated,log:{id:uid(),cardId:card.id,rating:r,at:new Date().toISOString(),duration:Date.now()-started}});if(r===Rating.Again){play();setQueue(q=>[...q.slice(0,index+4),card,...q.slice(index+4)])}setShown(false);setStarted(Date.now());setIndex(i=>i+1)}
  function mic(){const C=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!C){alert(en?"Voice recognition is unavailable here. Say the word, then grade yourself.":"La reconnaissance vocale n’est pas disponible ici. Dites le mot, puis évaluez-vous.");return}const r=new C();r.lang="fr-FR";r.interimResults=false;setListening(true);r.onresult=(e:any)=>{setListening(false);setShown(true);const heard=bare(e.results[0][0].transcript),expected=bare(note?.lemma||"");if(heard===expected||(expected.length>=5&&distance(heard,expected)<=1))setTimeout(()=>rate(Rating.Good),500);else play()};r.onerror=()=>setListening(false);r.onend=()=>setListening(false);r.start()}
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key===" "){e.preventDefault();setShown(true)}if(e.key.toLowerCase()==="r")play();if(e.key.toLowerCase()==="m")mic();if(shown&&["1","2","3","4"].includes(e.key))rate([Rating.Again,Rating.Hard,Rating.Good,Rating.Easy][+e.key-1])};addEventListener("keydown",key);return()=>removeEventListener("keydown",key)});
  if(!card||!note)return <div className="complete"><span><Check/></span><h1>{en?"Session complete":"Séance terminée"}</h1><p>{en?`You strengthened ${index} memories today.`:`Vous avez renforcé ${index} souvenirs aujourd’hui.`}</p><button className="primary" onClick={done}>{en?"Back home":"Retour à l’accueil"}</button></div>;
  const prompt=card.kind==="PRODUCTION"?note.translation:card.kind==="RECOGNITION"?note.lemma:card.kind==="LISTENING"?"Écoutez, puis rappelez-vous le sens":card.kind==="GENDER"?bare(note.lemma):note.exampleFr.replace(new RegExp(bare(note.lemma),"i"),"________");const answer=["RECOGNITION","LISTENING"].includes(card.kind)?note.translation:card.kind==="GENDER"?note.article:note.lemma;
  return <div className="review"><div className="review-top"><button className="icon" onClick={done}><X/></button><div><i style={{width:`${Math.round(index/queue.length*100)}%`}}/></div><span>{index+1} / {queue.length}</span></div><div className="review-stage"><div className="review-meta"><span>{en?"WORD → MEANING":"MOT → SENS"}</span><b>{note.cefr}</b></div><article className="prompt"><h1>{prompt}</h1>{shown?<div className="answer"><label>{en?"MEANING":"SENS"}</label><h2>{answer}</h2><div><button onClick={()=>play()} aria-label={en?"Listen to the word":"Écouter le mot"}><Volume2/></button>{note.ipa&&<em>{note.ipa}</em>}{note.ipa&&<button onClick={()=>play(true)}>0.7×</button>}</div>{note.exampleFr&&<p>{note.exampleFr}</p>}{note.exampleEn&&<small>{note.exampleEn}</small>}</div>:<button className="reveal" onClick={()=>setShown(true)}>{en?"Show meaning":"Afficher le sens"} <kbd>{en?"Space":"Espace"}</kbd></button>}</article><div className="review-tools"><button onClick={()=>play()}><Volume2/>{en?"Listen":"Écouter le mot"}</button><button className={listening?"recording":""} onClick={mic}><Mic/>{listening?(en?"Listening…":"J’écoute…"):(en?"Pronounce":"Prononcer le mot")}</button></div></div>{shown&&<div className="rating"><p>{en?"Did you remember the meaning?":"Vous souveniez-vous du sens ?"}</p><div>{[[Rating.Again,en?"Forgot":"Oublié",en?"Again":"Encore","again"],[Rating.Hard,en?"Hard":"Difficile",en?"Recalled":"Je l’ai eu","hard"],[Rating.Good,en?"Good":"Bien",en?"Good effort":"Bon effort","good"],[Rating.Easy,en?"Easy":"Facile",en?"Instant":"Instantané","easy"]].map(([r,a,b,c],i)=><button className={String(c)} key={i} onClick={()=>rate(r as Rating)}><kbd>{i+1}</kbd><b>{String(a)}</b><span>{String(b)}</span></button>)}</div></div>}</div>;
}

function Add({store,dispatch}:{store:Store;dispatch:React.Dispatch<Action>}){
  const en=store.preferences.language==="en";
  const[value,setValue]=useState("");
  const[added,setAdded]=useState<string[]>([]);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState("");
  const[mode,setMode]=useState<"verbs"|"all">("verbs");
  const list=value.split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);

  async function submit(){
    if(!list.length||busy)return;
    setBusy(true);setError("");setAdded([]);
    try{
      const response=await fetch("/api/enrich",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text:value,mode})});
      if(!response.ok){const failure=await response.json().catch(()=>({})) as {code?:string};throw new Error(failure.code||"AI_REQUEST_FAILED")}
      const data=await response.json() as {words:Array<Pick<Note,"lemma"|"translation"|"article"|"gender"|"part"|"cefr">&{tags?:string[]}>};
      const existing=new Set(store.notes.map(n=>bare(n.lemma)));
      const notes=data.words.filter(word=>!existing.has(bare(word.lemma))).map(word=>{
        const known=lexicon[bare(word.lemma)]||{};
        return{id:uid(),lemma:word.lemma,article:word.article,gender:word.gender,part:word.part,translation:word.translation,exampleFr:known.exampleFr||"",exampleEn:known.exampleEn||"",ipa:known.ipa||"",deck:"TEF essentiel",tags:["ajout intelligent",...(word.tags??[])],cefr:known.cefr||word.cefr}as Note
      });
      if(!notes.length){setError(en?"No new verbs were found, or they are already in your deck.":"Aucun nouveau verbe trouvé, ou ils sont déjà dans votre paquet.");return}
      dispatch({type:"add",notes,cards:notes.flatMap(makeCards)});
      setAdded(notes.map(n=>`${n.lemma} — ${n.translation}`));
      setValue("");
    }catch(error){
      const code=error instanceof Error?error.message:"AI_REQUEST_FAILED";
      setError(code==="AI_NOT_CONFIGURED"?(en?"OpenAI is not connected yet. Add OPENAI_API_KEY to start intelligent extraction.":"OpenAI n’est pas encore connecté. Ajoutez OPENAI_API_KEY pour activer l’extraction intelligente."):(en?"The AI could not analyze this text right now. Please try again.":"L’IA n’a pas pu analyser ce texte. Réessayez."));
    }finally{setBusy(false)}
  }

  return <div className="page narrow ai-add">
    <p className="eyebrow">LEXIQUE AI</p>
    <h1>{en?"Paste any French text.":"Collez n’importe quel texte français."}</h1>
    <p className="lead">{en?"OpenAI recognizes conjugated verbs in paragraphs, changes them to the infinitive, and adds their English meanings.":"OpenAI reconnaît les verbes conjugués dans les paragraphes, les transforme à l’infinitif et ajoute leur sens en anglais."}</p>
    <section className="add-card ai-composer">
      <div className="ai-label"><span><Sparkles/>{en?"Smart extraction":"Extraction intelligente"}</span><small>{en?"Headings and explanations are ignored":"Titres et explications ignorés"}</small></div>
      <div className="extract-toggle" role="group" aria-label={en?"Extraction type":"Type d’extraction"}><button className={mode==="verbs"?"active":""} onClick={()=>setMode("verbs")}>{en?"Verbs only":"Verbes seulement"}</button><button className={mode==="all"?"active":""} onClick={()=>setMode("all")}>{en?"All vocabulary":"Tout le vocabulaire"}</button></div>
      <textarea id="words" aria-label={en?"French text to analyze":"Texte français à analyser"} autoFocus value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==="Enter")submit()}} placeholder={'Hier, nous avons choisi un restaurant. Marie réfléchissait au menu pendant que Paul commandait.'}/>
      <div className="example-chips"><button onClick={()=>setValue("Regular -IR: finir = to finish, choisir = to choose, réussir = to succeed")}>{en?"Regular -IR":"-IR réguliers"}</button><button onClick={()=>setValue("Irregular -IR: partir = to leave, sortir = to go out, dormir = to sleep")}>{en?"Irregular -IR":"-IR irréguliers"}</button></div>
      <div className="add-meta"><span>{en?"Paragraphs, stories, lessons, Markdown, or lists":"Paragraphes, histoires, leçons, Markdown ou listes"}</span><small>⌘ + Enter</small></div>
      <button className="primary full" disabled={!list.length||busy} onClick={submit}>{busy?<><span className="thinking"/>{en?"Extracting clean cards…":"Extraction des cartes…"}</>:<><Sparkles/>{en?"Extract and add":"Extraire et ajouter"}</>}</button>
    </section>
    {error&&<div className="add-error">{error}</div>}
    {added.length>0&&<div className="success smart-success"><Check/><span><b>{en?`${added.length} clean card${added.length>1?"s":""} ready`:`${added.length} carte${added.length>1?"s":""} propre${added.length>1?"s":""} prête${added.length>1?"s":""}`}</b>{added.join(" · ")}</span></div>}
    <div className="info"><Brain/><span><b>{en?"Infinitives, automatically":"Infinitifs, automatiquement"}</b>{en?"“Nous avons choisi” becomes “choisir — to choose”. Repeated forms become one clean card.":"« Nous avons choisi » devient « choisir — to choose ». Les formes répétées deviennent une seule carte propre."}</span></div>
  </div>
}

function Browse({store,dispatch}:{store:Store;dispatch:React.Dispatch<Action>}){const en=store.preferences.language==="en";const[q,setQ]=useState("");const notes=store.notes.filter(n=>`${n.lemma} ${n.translation} ${n.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()));return <div className="page"><p className="eyebrow">{en?"LIBRARY":"BIBLIOTHÈQUE"}</p><div className="heading"><div><h1>{en?"Your words":"Vos mots"}</h1><p>{store.notes.length} {en?"notes":"notes"} · {store.cards.length} {en?"memory cards":"cartes mémoire"}</p></div></div><label className="search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={en?"Search a word, meaning, or tag":"Rechercher un mot, un sens ou une étiquette"}/></label><section className="words">{notes.map(n=>{const cards=store.cards.filter(c=>c.noteId===n.id);return <article key={n.id}><button onClick={()=>say(n.lemma)}><Volume2/></button><div><header><h3>{n.lemma}</h3><b>{n.cefr}</b><span>{n.part}</span></header><p>{n.translation}</p><small>{n.exampleFr}</small></div><aside><b>{cards.length}</b><span>{en?"cards":"cartes"}</span></aside><button onClick={()=>dispatch({type:"suspend",noteId:n.id})}><MoreHorizontal/></button></article>})}</section></div>}

function Stats({store}:{store:Store}){const en=store.preferences.language==="en";const success=store.logs.length?Math.round(store.logs.filter(l=>l.rating>1).length/store.logs.length*100):90;return <div className="page"><p className="eyebrow">{en?"YOUR MEMORY":"VOTRE MÉMOIRE"}</p><h1>{en?"Progress":"Progrès"}</h1><p className="lead">{en?"Useful signals, without pressure or rankings.":"Des signaux utiles, sans pression ni classement."}</p><section className="stat-hero"><div><span>{en?"ACTUAL RETENTION":"RÉTENTION RÉELLE"}</span><b>{success}%</b><p>{en?"Target":"Objectif"} : {Math.round(store.preferences.retention*100)}%</p></div><i><span style={{width:`${success}%`}}/></i></section><div className="charts"><section><h2>{en?"Recent reviews":"Révisions récentes"}</h2><p>{en?"Each square represents one day.":"Chaque carré représente une journée."}</p><div className="heat">{Array.from({length:42},(_,i)=><i className={`h${Math.min(4,Math.floor(((i*7+store.logs.length*3)%12)/3))}`} key={i}/>)}</div></section><section><h2>{en?"Upcoming load":"Charge à venir"}</h2><div className="bars">{[42,64,38,78,50,34,58].map((h,i)=><i key={i}><span style={{height:`${h}%`}}/><b>{["M","M","J","V","S","D","L"][i]}</b></i>)}</div></section></div><section className="optimize"><Brain/><div><h3>{en?"Personalized optimization":"Optimisation personnalisée"}</h3><p>{store.logs.length}/400 {en?"reviews. Lexique can then tune FSRS to your memory.":"révisions. Ensuite, Lexique pourra ajuster FSRS à votre mémoire."}</p></div><button disabled>{en?"Not available yet":"Pas encore disponible"}</button></section></div>}

function Prefs({store,dispatch}:{store:Store;dispatch:React.Dispatch<Action>}){
  const p=store.preferences,en=p.language==="en";
  return <div className="page narrow">
    <p className="eyebrow">{en?"PREFERENCES":"PRÉFÉRENCES"}</p>
    <h1>{en?"Settings":"Réglages"}</h1>
    <p className="lead">{en?"Adjust the workload without breaking spaced repetition.":"Adaptez la charge, sans casser la science de l’espacement."}</p>
    <section className="settings-card">
      <Setting title={en?"Target retention":"Rétention cible"} detail={`${Math.round(p.retention*100)}% · ${en?"higher means more reviews":"plus haut signifie plus de révisions"}`}><input type="range" min="80" max="95" value={p.retention*100} onChange={e=>dispatch({type:"prefs",patch:{retention:+e.target.value/100}})}/></Setting>
      <Setting title={en?"Busy week":"Semaine chargée"} detail={en?"Temporarily lower the target to 85%":"Passe temporairement l’objectif à 85%"}><Toggle value={p.busy} change={v=>dispatch({type:"prefs",patch:{busy:v}})}/></Setting>
      <Setting title={en?"New cards per day":"Nouvelles cartes par jour"} detail={`${p.newLimit} ${en?"maximum; due cards stay first":"maximum; les cartes dues restent prioritaires"}`}><input type="range" min="1" max="30" value={p.newLimit} onChange={e=>dispatch({type:"prefs",patch:{newLimit:+e.target.value}})}/></Setting>
      <Setting title={en?"Session length":"Durée de séance"} detail={`${p.minutes} ${en?"minutes maximum":"minutes maximum"}`}><select value={p.minutes} onChange={e=>dispatch({type:"prefs",patch:{minutes:+e.target.value}})}><option>10</option><option>20</option><option>30</option></select></Setting>
      <Setting title={en?"Automatic audio":"Lecture automatique"} detail={en?"Play audio at the start of listening cards":"Audio au début des cartes d’écoute"}><Toggle value={p.autoplay} change={v=>dispatch({type:"prefs",patch:{autoplay:v}})}/></Setting>
      <Setting title={en?"Audio speed":"Vitesse audio"} detail={`${p.rate.toFixed(1)}×`}><input type="range" min="0.6" max="1.2" step="0.1" value={p.rate} onChange={e=>dispatch({type:"prefs",patch:{rate:+e.target.value}})}/></Setting>
    </section>
    <section className="api"><Sparkles/><div><h3>{en?"Add words with your AI":"Ajouter des mots avec votre IA"}</h3><p>{en?"Create a key, then ask your assistant to add French verbs to Lexique.":"Créez une clé, puis demandez à votre assistant d’ajouter des verbes français dans Lexique."}</p><McpKey en={en}/></div></section>
  </div>
}
function McpKey({en=false}:{en?:boolean}){const[token,setToken]=useState("");const[busy,setBusy]=useState(false);async function create(){setBusy(true);try{const r=await fetch("/api/keys",{method:"POST"});if(!r.ok)throw new Error();const data=await r.json() as {token:string};setToken(data.token);await navigator.clipboard?.writeText(data.token)}catch{alert(en?"Sign in to the published app to create a key.":"Connectez-vous dans la version publiée pour créer une clé.")}finally{setBusy(false)}}return token?<code className="key-code">{token}</code>:<button className="secondary" disabled={busy} onClick={create}>{busy?(en?"Creating…":"Création…"):(en?"Create and copy a key":"Créer et copier une clé")}</button>}
function Setting({title,detail,children}:{title:string;detail:string;children:React.ReactNode}){return <div className="setting"><div><b>{title}</b><span>{detail}</span></div>{children}</div>}
function Toggle({value,change}:{value:boolean;change:(v:boolean)=>void}){return <button role="switch" aria-checked={value} onClick={()=>change(!value)} className={`toggle ${value?"on":""}`}><i/></button>}
