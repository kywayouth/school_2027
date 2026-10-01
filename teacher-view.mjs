// Teacher-facing overnight policy. The immutable catalogue and the original
// domain engine still describe day visits for legacy favorites and operators.
import {STAY_DAYS,availableRuns,matches,dates} from './domain.mjs?v=9c570446ca26e2c3';

export const SEARCH_STAYS=Object.freeze(['2박3일','1박2일']);
export const DAY_VISIT_NOTICE='당일형은 시설별로 직접 문의해 주세요.';
export function displayedStayTypes(slot){return SEARCH_STAYS.filter(stay=>slot.allowedStayTypes.includes(stay));}
function searchStay(slot,stay){
  const allowed=displayedStayTypes(slot);
  if(stay)return allowed.includes(stay)?stay:null;
  return allowed.reduce((shortest,value)=>!shortest||STAY_DAYS[value]<STAY_DAYS[shortest]?value:shortest,null);
}
export function searchRuns(slot,status,stay=''){
  const selected=searchStay(slot,stay);
  return selected?availableRuns(slot,status,selected):[];
}
export function searchMatches(slot,status,filters){
  const selected=searchStay(slot,filters.stay);
  return !!selected&&matches(slot,status,{...filters,stay:selected});
}
export function searchMonths(slots,status,filters){
  const months=new Set();
  for(const slot of slots.filter(value=>searchMatches(value,status,filters))){
    for(const run of searchRuns(slot,status,filters.stay)){
      for(const date of dates(run.start,run.end))months.add(Number(date.slice(5,7)));
    }
  }
  return [...months].sort((a,b)=>a-b);
}
export function favoriteKey(choice){return [choice.code,choice.start,choice.end,choice.stay].join('|');}
export function hasSavedChoice(saved,choice){return !!choice&&saved.some(value=>favoriteKey(value)===favoriteKey(choice));}
export function hasSavedSlot(saved,slot){return saved.some(value=>value.code===slot.code);}
