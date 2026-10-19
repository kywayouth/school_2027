import {UI_EN} from './i18n-ui.mjs?v=78e9f70cf0822503';
import {PROGRAM_EN} from './i18n-programs.mjs?v=78e9f70cf0822503';

// Presentation only: catalogue identifiers, status commands, form values and
// saved choices remain in their original format in either language.
export const LANGUAGE_KEY='national-youth-2027-language';
const normalize=value=>String(value).replace(/\s+/g,' ').trim();
const dictionary=new Map(Object.entries({...PROGRAM_EN,...UI_EN}).map(([ko,en])=>[normalize(ko),en]));
const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const phrases=[...dictionary.keys()].filter(key=>/[가-힣]/.test(key)&&key.length>1).sort((a,b)=>b.length-a.length);
const phrasePattern=new RegExp(phrases.map(escapeRegex).join('|'),'g');
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS={일:'Sun',월:'Mon',화:'Tue',수:'Wed',목:'Thu',금:'Fri',토:'Sat'};
const cache=new Map();
const monthName=value=>MONTHS[Number(value)-1]||String(value);

export function selectLanguage(href,stored){
  try{const requested=new URL(href).searchParams.get('lang');if(requested==='ko'||requested==='en')return requested;}catch{}
  return stored==='en'?'en':'ko';
}

function dynamicEnglish(text){
  return text
    .replace(/(\d{1,2})월 (\d{1,2})일 (\d{1,2})시(?: (\d{1,2})분)? 기준/g,(_,m,d,h,min)=>`As of ${MONTHS[Number(m)-1]} ${d}, ${h.padStart(2,'0')}:${(min||'0').padStart(2,'0')} KST`)
    .replace(/(\d{1,2})\.(\d{1,2})\.\(([일월화수목금토])\)/g,(_,m,d,w)=>`${MONTHS[Number(m)-1]} ${d} (${WEEKDAYS[w]})`)
    .replace(/(\d+)박\s*(\d+)일/g,(_,n,d)=>`${n} ${n==='1'?'night':'nights'} / ${d} days`)
    .replace(/(\d+)박\s*(\d+)식/g,(_,n,m)=>`${n} ${n==='1'?'night':'nights'} / ${m} meals`)
    .replace(/(\d+)일차/g,'Day $1')
    .replace(/(\d+)개 그룹/g,'$1 groups')
    .replace(/(\d+)그룹/g,'Group $1')
    .replace(/활동\s*(\d+)/g,'Activity $1')
    .replace(/최대\s*([\d,]+)명/g,'Up to $1 people')
    .replace(/([\d,]+)명\s*미만/g,'Fewer than $1 people')
    .replace(/([\d,]+)명\s*이하/g,'Up to $1 people')
    .replace(/([\d,]+)명\s*이상/g,'$1 people or more')
    .replace(/([\d,]+(?:[–~－-][\d,]+)?)명/g,'$1 people')
    .replace(/(\d+)분/g,'$1 min')
    .replace(/(\d+)식/g,'$1 meals')
    .replace(/(\d+)월/g,(_,m)=>MONTHS[Number(m)-1]||`${m}`)
    .replace(/(\d{4})년도?/g,'$1')
    .replace(/([\d,]+)원/g,'KRW $1')
    .replace(/(\d+)호/g,'No. $1');
}

function generatedEnglish(text){
  let match;
  if((match=text.match(/^(\d{1,2})월 (\d{1,2})일 (\d{1,2})시(?: (\d{1,2})분)? 기준$/)))return `As of ${monthName(match[1])} ${match[2]}, ${match[3].padStart(2,'0')}:${(match[4]||'0').padStart(2,'0')} KST`;
  if((match=text.match(/^(\d+)월에는 조건에 맞는 일정이 없어 가장 가까운 (\d+)월로 이동했어요\.$/)))return `No matching dates in ${monthName(match[1])}. Showing the nearest month with listed dates, ${monthName(match[2])}.`;
  if((match=text.match(/^(\d+)월에는 조건에 맞는 일정이 없습니다\.$/)))return `No dates match your filters in ${monthName(match[1])}.`;
  if((match=text.match(/^가까운 (\d+)월 보기 →$/)))return `View ${monthName(match[1])} →`;
  if((match=text.match(/^(.+) 시설 검색 조건으로 선택$/)))return `Select ${translateText(match[1])} as a filter`;
  if((match=text.match(/^(.+) 활동사진 (\d+) 크게 보기$/)))return `View ${translateText(match[1])} activity photo ${match[2]}`;
  if((match=text.match(/^동시간대 · (\d+)개 그룹으로 나누어 진행$/)))return `Simultaneous activities in ${match[1]} groups`;
  if((match=text.match(/^그룹 (\d+)$/)))return `Group ${match[1]}`;
  if((match=text.match(/^([\d·]+)식$/)))return `${match[1].replaceAll('·',' or ')} meals`;
  if((match=text.match(/^(.+) 시간·소요시간·활동$/)))return `${translateText(match[1])}: time, duration and activities`;
  if((match=text.match(/^(.+) 이미지$/)))return `${translateText(match[1])} image`;
  if((match=text.match(/^(\d+)월 · (게시 일정 있음|게시 일정 없음)$/)))return `${monthName(match[1])} · ${translateText(match[2])}`;
  if((match=text.match(/^(.+) 게시 일정 있음$/)))return `${translateText(match[1])}: dates listed`;
  if((match=text.match(/^(.+) 게시 일정 없음$/)))return `${translateText(match[1])}: no dates listed`;
  if((match=text.match(/^(.+) 운영 가능$/)))return `${translateText(match[1])} available`;
  if((match=text.match(/^(.+) 표시된 일정 없음$/)))return `${translateText(match[1])}: no dates listed`;
  if((match=text.match(/^(· )?((?:\d박\d일)(?:, \d박\d일)*) 가능$/)))return `${match[1]||''}${translateText(match[2])} available`;
  if((match=text.match(/^(.+) 관심 일정 삭제$/)))return `Remove saved date: ${translateText(match[1])}`;
  if((match=text.match(/^참고 규모 (.+)$/)))return `Reference group size: ${translateText(match[1])}`;
  return null;
}

export function translateText(value,language='en'){
  const raw=String(value??'');
  if(language!=='en'||!raw.trim())return raw;
  if(cache.has(raw))return cache.get(raw);
  const core=normalize(raw);
  let translated=dictionary.get(core)??generatedEnglish(core);
  if(translated===null){
    // Whole source sentences take precedence over reusable labels. A second
    // pass formats numbers in interpolated labels without changing data.
    const dated=core.replace(/(\d{1,2})\.(\d{1,2})\.\(([일월화수목금토])\)/g,(_,m,d,w)=>`${monthName(m)} ${d} (${WEEKDAYS[w]})`);
    translated=dated.replace(phrasePattern,match=>dictionary.get(match));
    translated=dynamicEnglish(translated);
    translated=translated.replace(phrasePattern,match=>dictionary.get(match));
  }
  translated=translated.replace(/\b0(\d{1,2})-(\d{3,4})-(\d{4})\b/g,'+82 $1-$2-$3');
  const result=raw.slice(0,raw.length-raw.trimStart().length)+translated+raw.slice(raw.trimEnd().length);
  if(cache.size>6000)cache.clear();
  cache.set(raw,result);return result;
}

const SKIP='script,style,textarea,input,[contenteditable],[translate="no"],[data-user-content]';
const ATTRIBUTES=['aria-label','aria-description','title','alt','placeholder'];
const instances=new WeakMap();

export function setupI18n(doc,win=doc.defaultView){
  if(instances.has(doc))return instances.get(doc);
  let stored;try{stored=win.localStorage.getItem(LANGUAGE_KEY);}catch{}
  let language=selectLanguage(win.location.href,stored),queued=false,disposed=false;
  const texts=new WeakMap(),attributes=new WeakMap();
  const original=(records,key,current)=>{
    let record=records.get(key);
    if(!record||record.last!==current){record={source:current,last:current};records.set(key,record);}
    return record;
  };
  const ignored=element=>!element||!!element.closest(SKIP);
  let observer;
  function apply(){
    if(disposed)return;
    observer?.disconnect();
    doc.documentElement.lang=language;
    const walker=doc.createTreeWalker(doc.documentElement,win.NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(ignored(node.parentElement))continue;
      // An option without an explicit value derives its value from its text.
      if(node.parentElement.tagName==='OPTION'&&!node.parentElement.hasAttribute('value'))continue;
      const record=original(texts,node,node.data);
      const next=translateText(record.source,language);
      if(node.data!==next)node.data=next;
      record.last=next;
    }
    for(const element of doc.querySelectorAll('[aria-label],[aria-description],[title],[alt],[placeholder],meta[name="description"],a[href^="tel:"]')){
      if(element.closest('[translate="no"],[data-user-content]'))continue;
      let records=attributes.get(element);if(!records){records=new Map();attributes.set(element,records);}
      const names=[...ATTRIBUTES];
      if(element.matches('meta[name="description"]'))names.push('content');
      if(element.matches('a[href^="tel:"]'))names.push('href');
      for(const name of names){
        if(!element.hasAttribute(name))continue;
        const current=element.getAttribute(name),record=original(records,name,current);
        const next=name==='href'?(language==='en'?record.source.replace(/^tel:0/,'tel:+82'):record.source):translateText(record.source,language);
        if(current!==next)element.setAttribute(name,next);
        record.last=next;
      }
    }
    for(const button of doc.querySelectorAll('[data-language]'))button.setAttribute('aria-pressed',String(button.dataset.language===language));
    observer?.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...ATTRIBUTES,'content','href']});
  }
  function schedule(){if(queued||disposed)return;queued=true;win.queueMicrotask(()=>{queued=false;apply();});}
  observer=new win.MutationObserver(schedule);
  function setLanguage(next,{updateUrl=true,persist=true}={}){
    if(next!=='ko'&&next!=='en')return;
    language=next;
    if(persist)try{win.localStorage.setItem(LANGUAGE_KEY,next);}catch{}
    if(updateUrl)try{const url=new URL(win.location.href);url.searchParams.set('lang',next);win.history.replaceState(win.history.state,'',url.href);}catch{}
    apply();
    doc.dispatchEvent(new win.CustomEvent('languagechange',{detail:{language}}));
  }
  const onClick=event=>{const button=event.target.closest('[data-language]');if(button)setLanguage(button.dataset.language);};
  const onStorage=event=>{if(event.key===LANGUAGE_KEY&&(event.newValue==='ko'||event.newValue==='en'))setLanguage(event.newValue,{persist:false});};
  doc.addEventListener('click',onClick);win.addEventListener('storage',onStorage);
  const controller={get language(){return language;},setLanguage,refresh:apply,dispose(){disposed=true;observer.disconnect();doc.removeEventListener('click',onClick);win.removeEventListener('storage',onStorage);instances.delete(doc);}};
  instances.set(doc,controller);
  // An explicit shared link becomes the preference for subsequent visits.
  setLanguage(language,{updateUrl:false});
  return controller;
}
