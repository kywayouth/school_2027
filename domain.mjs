// Shared, browser-independent interpretation of the immutable source and daily status.
export const FACILITY_STYLE = {
  // Facility-inspired hues. Fixed track positions and names supplement color.
  // Base colors identify facilities; darker ink and pale surfaces keep text readable.
  central:{prefix:'C',short:'중앙',color:'#D64751',ink:'#A52D38',tint:'#FDF3F4',soft:'#FAE5E7',border:'#EAC0C5'},
  pyeongchang:{prefix:'P',short:'평창',color:'#2E7D32',ink:'#256529',tint:'#F2F8F2',soft:'#E5F1E5',border:'#BDDBBF'},
  space:{prefix:'S',short:'우주',color:'#7B4CC0',ink:'#63369F',tint:'#F7F3FC',soft:'#EEE5F8',border:'#D5C2EA'},
  bio:{prefix:'B',short:'바이오생명',color:'#D4B000',ink:'#755D00',tint:'#FDF9E9',soft:'#F8EFC7',border:'#E4D386'},
  marine:{prefix:'M',short:'해양',color:'#1476C8',ink:'#105C9B',tint:'#F0F7FD',soft:'#E1EFFB',border:'#B9D7F0'},
  future:{prefix:'F',short:'미래환경',color:'#009688',ink:'#006A60',tint:'#EEF9F7',soft:'#DCF1EC',border:'#AFDCD4'},
  ecology:{prefix:'E',short:'생태',color:'#B66828',ink:'#8B4B18',tint:'#FCF5EE',soft:'#F7E9D9',border:'#E4C5A6'}
};
export const GRADES={elementary:'초등학교',middle:'중학교',high:'고등학교'};
export const STAY_DAYS={'2박3일':3,'1박2일':2,'당일형':1};
export const DAY=86400000;
export const iso=n=>new Date(n).toISOString().slice(0,10);
export const epoch=s=>Date.parse(`${s}T00:00:00Z`);
export function validDate(s,year){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(epoch(s))&&iso(epoch(s))===s&&(!year||s.startsWith(`${year}-`));}
export function dates(start,end){const out=[];for(let t=epoch(start);t<=epoch(end);t+=DAY)out.push(iso(t));return out;}
export function dateLabel(s){const d=new Date(epoch(s));return `${d.getUTCMonth()+1}.${d.getUTCDate()}.(${['일','월','화','수','목','금','토'][d.getUTCDay()]})`;}
export const rangeLabel=(a,b)=>a===b?dateLabel(a):`${dateLabel(a)} – ${dateLabel(b)}`;
export function catalogFrom(source){
  const facilities=source.facilities.map(f=>({...f,...FACILITY_STYLE[f.id]}));
  const slots=facilities.flatMap(f=>f.availability.map((s,i)=>({...s,code:`${f.prefix}${String(i+1).padStart(3,'0')}`,facilityId:f.id,facility:f})));
  return {facilities,slots,byCode:new Map(slots.map(s=>[s.code,s])),byId:new Map(slots.map(s=>[s.id,s])),notice:source.businessRules.oneNightProgramDisplay.notice};
}
export function emptyStatus(){return {asOf:null,closed:new Set(),capacities:new Map(),blocked:new Map(),errors:[]};}
export function parseStatus(text,catalog,warn=console.warn){
  const out=emptyStatus(),problem=(line,message)=>{out.errors.push({line,message});warn(`[status.txt ${line}행] ${message}`);};
  text.replace(/^\uFEFF/,'').split(/\r?\n/).forEach((raw,i)=>{
    const line=raw.split('#')[0].trim();if(!line)return;const p=line.split(/\s+/),command=p[0];
    if(command==='기준'){
      if(p.length!==3||!validDate(p[1])||!/^([01]\d|2[0-3]):[0-5]\d$/.test(p[2]))return problem(i+1,'기준 YYYY-MM-DD HH:MM 형식으로 입력하세요.');
      out.asOf=`${p[1]}T${p[2]}:00+09:00`;return;
    }
    const slot=catalog.byCode.get(p[1]?.toUpperCase());if(!slot)return problem(i+1,`알 수 없는 회차 번호 또는 명령: ${line}`);
    if(command==='마감'){
      if(p.length!==2||slot.type!=='fixed_round')return problem(i+1,'마감은 회차형에만 사용합니다. 협의형은 날짜마감을 사용하세요.');
      out.closed.add(slot.code);return;
    }
    if(command==='규모'){
      if(slot.type!=='fixed_round'||![3,4].includes(p.length)||!p.slice(2).every(v=>/^\d+$/.test(v)))return problem(i+1,'회차형에 규모 번호 최대인원 또는 규모 번호 최소인원 최대인원을 입력하세요.');
      const min=p.length===4?Number(p[2]):slot.capacity.min,max=Number(p.at(-1));
      if(!Number.isSafeInteger(max)||max<1||max>slot.capacity.max)return problem(i+1,`최대 인원은 1~${slot.capacity.max}명이어야 합니다.`);
      if(min!==null&&(!Number.isSafeInteger(min)||min<1||min>max))return problem(i+1,'원래 최소 인원보다 작습니다. 마감하거나, 규모 번호 조정최소인원 최대인원을 입력하세요.');
      if(p.length===4&&min>(slot.capacity.min??1))return problem(i+1,'최소 인원은 원래 최소 인원보다 높일 수 없습니다.');
      out.capacities.set(slot.code,{min,max});return;
    }
    if(command==='날짜마감'){
      if(p.length!==4||slot.type!=='negotiable_period'||!validDate(p[2],2027)||!validDate(p[3],2027)||p[2]>p[3]||p[2]<slot.startDate||p[3]>slot.endDate)return problem(i+1,'협의형 기간 안의 시작일·종료일을 YYYY-MM-DD로 입력하세요.');
      const intervals=out.blocked.get(slot.code)||[];intervals.push({start:p[2],end:p[3]});out.blocked.set(slot.code,intervals);return;
    }
    problem(i+1,`알 수 없는 명령: ${command}`);
  });
  if(!out.asOf)problem(0,'유효한 기준 시각이 없습니다.');return out;
}
export function capacityFor(slot,status,grade){
  if(status.capacities.has(slot.code))return status.capacities.get(slot.code);
  if(slot.capacity)return {min:slot.capacity.min,max:slot.capacity.max};
  const r=slot.capacityRules.find(r=>r.schoolLevels.includes(grade));return r?{min:r.min,max:r.max??r.maxExclusive-1}:null;
}
export function capacityLabel(slot,status,grade){const c=capacityFor(slot,status,grade);if(!c)return '초등 150명 미만 · 중·고 150–300명';return c.min===null?`최대 ${c.max}명`:`${c.min}–${c.max}명`;}
export function availableRuns(slot,status,stay=''){
  if(status.closed.has(slot.code)||(stay&&!slot.allowedStayTypes.includes(stay)))return [];
  if(slot.type==='fixed_round')return [{start:slot.startDate,end:slot.endDate}];
  const required=stay?STAY_DAYS[stay]:Math.min(...slot.allowedStayTypes.map(v=>STAY_DAYS[v])),blocked=status.blocked.get(slot.code)||[],runs=[];let current=[];
  const flush=()=>{if(current.length>=required)runs.push({start:current[0],end:current.at(-1)});current=[];};
  for(const date of dates(slot.startDate,slot.endDate)){if(blocked.some(r=>date>=r.start&&date<=r.end))flush();else current.push(date);}flush();return runs;
}
export function matches(slot,status,f){
  if(f.facility&&f.facility!==slot.facilityId)return false;if(!availableRuns(slot,status,f.stay).length)return false;if(f.mode!=='match')return true;
  if(!slot.schoolLevels.includes(f.grade)||!Number.isInteger(f.people)||f.people<1)return false;const c=capacityFor(slot,status,f.grade);return !!c&&f.people>=(c.min??1)&&f.people<=c.max;
}
export function covered(date,runs){return runs.some(r=>date>=r.start&&date<=r.end);}
export function isSavedClosed(slot,status,saved){const runs=availableRuns(slot,status,saved.stay||'');return slot.type==='fixed_round'?!runs.length:!runs.some(r=>saved.start>=r.start&&saved.end<=r.end);}
export function matchingMonths(slots,status,filters){
  const months=new Set();
  for(const slot of slots.filter(s=>matches(s,status,filters))){
    for(const run of availableRuns(slot,status,filters.stay)){
      for(const date of dates(run.start,run.end))months.add(Number(date.slice(5,7)));
    }
  }
  return [...months].sort((a,b)=>a-b);
}
export function nearestMonth(months,current){return [...months].sort((a,b)=>Math.abs(a-current)-Math.abs(b-current)||b-a)[0]??null;}
