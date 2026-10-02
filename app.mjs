import {setupSiteUpdate} from './site-update.mjs?v=17ce08c48dbacdd4';
import {catalogFrom,parseStatus,emptyStatus,GRADES,STAY_DAYS,DAY,epoch,iso,dateLabel,rangeLabel,capacityLabel,availableRuns,covered,isSavedClosed,validDate,nearestMonth} from './domain.mjs?v=17ce08c48dbacdd4';
import {SEARCH_STAYS,DAY_VISIT_NOTICE,displayedStayTypes,searchRuns,searchMatches,searchMonths,favoriteKey,hasSavedChoice,hasSavedSlot} from './teacher-view.mjs?v=17ce08c48dbacdd4';
import {icon,FACILITY_ICONS} from './icons.mjs?v=17ce08c48dbacdd4';
import {timetableCellMarkup,timetableDurationLabel} from './timetable.mjs?v=17ce08c48dbacdd4';
import {BRAND_ASSETS,FACILITY_BRAND} from './brand.mjs?v=17ce08c48dbacdd4';
import {PROGRAM_OVERVIEWS,OVERVIEW_SOURCE_NOTE} from './program-overviews.mjs?v=17ce08c48dbacdd4';
import {PROGRAM_PHOTOS} from './program-photos.mjs?v=17ce08c48dbacdd4';
import {setupPartnershipViewer} from './image-viewer.mjs?v=17ce08c48dbacdd4';
import {setupPhotoViewer} from './photo-viewer.mjs?v=17ce08c48dbacdd4';
import {feesMarkup,setupFeesViewer} from './fees.mjs?v=17ce08c48dbacdd4';

// Static shell icons use the same embedded drawings as dynamically rendered views.
document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
setupPartnershipViewer(document);
setupPhotoViewer(document,PROGRAM_PHOTOS);
setupFeesViewer(document);
setupSiteUpdate(document);

const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='national-youth-2027-favorites-v1';
let catalog,status=emptyStatus(),statusOK=false,statusError='',inFlight=null,lastRefresh=0,tab='search',month=3,selected='2027-03-03',programFacility='central',dialogSlot=null;
let filters={mode:'all',grade:'elementary',people:null,facility:'',stay:''},saved=[];
let draftFilters={...filters},filterMessage='',filterError='';
let monthMessage='';
let dialogCourseId='';
const CONSULT_NOTICE='세부 날짜와 숙박 형태는 시설과 전화로 협의해 주세요';
const SAVE_GUIDANCE='‘관심 일정에 담기’를 누르면 선택한 일정은 상단의 ‘관심 일정·비교’ 탭에서 다시 확인할 수 있습니다.';
try { const raw=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(raw))saved=raw.filter(v=>v&&typeof v.code==='string'&&typeof v.key==='string'&&validDate(v.start,2027)&&validDate(v.end,2027)).map(v=>({...v,note:String(v.note??'').slice(0,1000)})); } catch { /* Storage can be denied in a private/restricted browser. */ }
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3600);}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(saved));return true;}catch{toast('이 브라우저에서는 저장할 수 없습니다. 창을 닫으면 관심 일정과 메모가 사라질 수 있습니다.');return false;}}
const option=(value,label,current)=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`;
function themeStyle(f){return `--facility:${f.color};--facility-ink:${f.ink};--facility-tint:${f.tint};--facility-soft:${f.soft};--facility-border:${f.border}`;}
function facilityNameMarkup(f){return esc(f.name).replace('청소년','청소년<wbr>');}
function gradeText(slot){return slot.schoolLevels.map(g=>GRADES[g]).join(' · ');}
function stayLabel(slot){const stays=displayedStayTypes(slot);return stays.length?`${stays.join(', ')}${slot.facilityId==='pyeongchang'?' 가능':''}`:'시설 문의 필요';}
function favoriteMarker(active,label=active?'관심 일정에 담은 일정':'아직 관심 일정에 담지 않은 일정',text=active?'담은 일정':''){return `<span class="favorite-marker ${active?'is-saved':''}" role="img" aria-label="${esc(label)}">${icon('heart')}${text?`<span class="favorite-label" aria-hidden="true">${esc(text)}</span>`:''}</span>`;}
function periodMarkup(slot){return `<p class="period-label">운영 가능 기간</p><h3>${rangeLabel(slot.startDate,slot.endDate)}<span class="stay-label"> · ${stayLabel(slot)}</span></h3>`;}
function consultNotice(){return `<p class="consult-notice">${CONSULT_NOTICE}</p>`;}
function phone(f){return `<a class="phone" href="tel:${esc(f.reservationPhone)}">${icon('phone')} ${esc(f.reservationPhone)}<span class="phone-label">전화 문의</span></a>`;}
function programDownload(f){return `<a class="with-icon program-download" href="./assets/programs/${esc(f.id)}-2027.pdf" download="2027_${esc(f.short)}_프로그램안내.pdf">${icon('download')}<span>프로그램 안내 PDF 다운로드</span></a>`;}
function noticeFor(slot){return slot.facilityId==='pyeongchang'?'<p class="small-note">초등학교는 150명 미만으로 운영합니다. 100명 미만(교사 포함) 학교는 제시된 날짜 외에도 운영할 수 있습니다. 가능한 날짜는 시설에 전화로 문의해 주세요.</p>':slot.facilityId==='future'?'<p class="small-note">운영 가능 규모 30~150명(인솔자 포함). 30명 이하 또는 150명 이상은 신청 전에 시설과 협의해 주세요.</p>':'';}
function refreshHeader(){
  if(status.asOf){const d=new Date(status.asOf),parts=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hourCycle:'h23'}).formatToParts(d),get=t=>Number(parts.find(p=>p.type===t)?.value);$('#asof').textContent=`${get('month')}월 ${get('day')}일 ${get('hour')}시${get('minute')?` ${get('minute')}분`:''} 기준`;
    $('#freshness').textContent=Date.now()-d.getTime()>36*3600000?'업데이트 확인 필요':'';
  }else{$('#asof').textContent='기준 시각 확인 필요';$('#freshness').textContent='';}
  $('#notice').innerHTML=statusError?`<p class="warning">${esc(statusError)} 현재 신청 가능 여부는 전화로 확인해 주세요.</p>`:status.errors.length?'<p class="warning">일부 상태 정보를 확인하지 못했습니다. 표시된 일정도 신청 전 반드시 전화로 확인해 주세요.</p>':'';
}
async function refreshStatus(manual=false){
  if(!catalog)return;if(inFlight)return inFlight;
  $('#refresh').disabled=true;
  inFlight=(async()=>{
    try{const url=new URL('./status.txt',location.href);url.searchParams.set('_',`${Date.now()}-${Math.random().toString(36).slice(2)}`);const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error(`HTTP ${response.status}`);
      const text=await response.text();if(/^\s*</.test(text))throw Error('상태 파일 대신 HTML이 반환되었습니다.');
      status=parseStatus(text,catalog);statusOK=true;statusError='';lastRefresh=Date.now();alignCalendar(false);if(manual)toast('현재 게시된 상태 파일을 다시 확인했습니다.');
    }catch(error){console.warn('상태 파일을 읽지 못했습니다.',error);statusOK=false;statusError='상태 파일을 불러오지 못해 달력의 운영 가능 표시를 잠시 중단했습니다.';}
    finally{inFlight=null;$('#refresh').disabled=false;refreshHeader();render();if(dialogSlot)openSlot(dialogSlot.code,true);}
  })();return inFlight;
}
function render(){
  if(!catalog)return;
  document.querySelectorAll('[data-tab]').forEach(b=>{if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  // Fee content is static; keep disclosures and focus intact during status refreshes.
  if(tab==='fees'&&$('#main .fees'))return;
  const markup=tab==='search'?searchMarkup():tab==='saved'?savedMarkup():tab==='fees'?feesMarkup():programsMarkup();
  const finder=$('#main .finder');
  if(tab==='search'&&finder){
    // Keep draft controls mounted while results or daily status refresh.
    // Changing a field never replaces the applied result until form submission.
    const template=document.createElement('template');template.innerHTML=markup;
    const next=template.content.querySelector('.finder');
    if(finder.dataset.activeMode!==draftFilters.mode)finder.querySelector('.filters').replaceWith(next.querySelector('.filters'));
    finder.dataset.activeMode=draftFilters.mode;
    finder.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===draftFilters.mode)));
    finder.querySelector('.feedback-area').innerHTML=next.querySelector('.feedback-area').innerHTML;
    updateDraftFeedback();
    // Month controls always describe the applied filters, not pending edits.
    const layout=$('#main .schedule-layout'),nextLayout=template.content.querySelector('.schedule-layout');
    layout.querySelector('.month-title-text').textContent=nextLayout.querySelector('.month-title-text').textContent;
    for(const direction of ['-1','1'])layout.querySelector(`[data-month="${direction}"]`).disabled=nextLayout.querySelector(`[data-month="${direction}"]`).disabled;
    const monthSelect=layout.querySelector('#month'),nextSelect=nextLayout.querySelector('#month');
    [...monthSelect.options].forEach((o,i)=>{o.textContent=nextSelect.options[i].textContent;o.className=nextSelect.options[i].className;});monthSelect.value=String(month);monthSelect.className=nextSelect.className;
    for(const selector of ['.month-feedback','.legend','.calendar','.calendar-help','.day-heading','.day-list'])layout.querySelector(selector).innerHTML=nextLayout.querySelector(selector).innerHTML;
  }else $('#main').innerHTML=markup;
}
function matchingSlots(){return statusOK?catalog.slots.filter(s=>searchMatches(s,status,filters)):[];}
function searchReady(){return filters.mode==='all'||(Number.isInteger(filters.people)&&filters.people>0&&filters.people<=99999);}
function availableMonths(){return statusOK&&searchReady()?searchMonths(catalog.slots,status,filters):[];}
function firstMatchingDate(targetMonth){
  const start=`2027-${String(targetMonth).padStart(2,'0')}-01`,end=iso(Date.UTC(2027,targetMonth,0));
  return matchingSlots().flatMap(s=>searchRuns(s,status,filters.stay)).filter(r=>r.start<=end&&r.end>=start).map(r=>r.start>start?r.start:start).sort()[0]??start;
}
function alignCalendar(autoMove){
  monthMessage='';const months=availableMonths();if(!months.length)return;
  if(!months.includes(month)&&autoMove){const previous=month;month=nearestMonth(months,month);monthMessage=`${previous}월에는 조건에 맞는 일정이 없어 가장 가까운 ${month}월로 이동했어요.`;selected=firstMatchingDate(month);}
  else if(months.includes(month)&&!matchingSlots().some(s=>covered(selected,searchRuns(s,status,filters.stay))))selected=firstMatchingDate(month);
}
function filterSummary(){
  const facility=filters.facility?catalog.facilities.find(f=>f.id===filters.facility).short:'전체 시설';
  return [...(filters.mode==='match'?[GRADES[filters.grade],`${filters.people}명`]:['학교급·인원 전체']),facility,filters.stay||'숙박형 전체'].join(' · ');
}
function hasDraftChanges(){return ['mode','facility','stay',...(draftFilters.mode==='match'?['grade','people']:[])].some(key=>!Object.is(draftFilters[key],filters[key]));}
function draftValid(){return draftFilters.mode==='all'||(Number.isInteger(draftFilters.people)&&draftFilters.people>0&&draftFilters.people<=99999);}
function draftStatusText(){return filterError||(hasDraftChanges()?'아직 적용하지 않은 조건입니다. ‘조건 적용’을 눌러 결과를 확인해 주세요.':filterMessage);}
function updateDraftFeedback(){
  const message=$('#draft-status');if(!message)return;
  message.textContent=draftStatusText();message.classList.toggle('is-pending',hasDraftChanges());message.classList.toggle('is-error',!!filterError);
  $('#people')?.setAttribute('aria-invalid',String(!!filterError));
}
function updateDraft(key,value){
  draftFilters[key]=key==='people'?(value===''?null:Number(value)):value;
  filterError='';filterMessage='';
  if(key==='mode')render();else updateDraftFeedback();
}
function applyFilters(){
  if(!draftValid()){
    filterError='참가 인원을 1명 이상 99,999명 이하의 정수로 입력해 주세요.';
    updateDraftFeedback();$('#people')?.focus();return false;
  }
  filters={...draftFilters};filterError='';filterMessage='조건을 적용했습니다. 아래 달력과 일정은 이 조건의 결과입니다.';
  alignCalendar(true);render();
  $('.feedback-area')?.scrollIntoView({behavior:'smooth',block:'start'});
  return true;
}
function chooseFacility(value){
  // These shortcuts select a draft facility; they never silently apply other edits.
  draftFilters.facility=value;filterError='';filterMessage='';tab='search';render();
  $('#facility').value=value;updateDraftFeedback();$('.finder').scrollIntoView({block:'start'});$('#facility').focus({preventScroll:true});
}
function monthOptionLabel(value,months=availableMonths()){
  if(!statusOK||!searchReady())return `${value}월`;
  return `${value}월 · ${months.includes(value)?'예약 가능':'예약 마감'}`;
}
function monthFeedback(months){
  if(!statusOK)return '<p class="month-message">현재 일정 정보를 확인할 수 없습니다. 최신 정보 확인을 눌러 주세요.</p>';
  if(!searchReady())return '<p class="month-message">참가 인원을 입력하고 ‘조건 적용’을 눌러 일정을 확인해 주세요.</p>';
  if(!months.length)return '<p class="month-message">조건에 맞는 운영 기간이 없습니다. 조건을 바꾸거나 전체 일정 보기를 선택한 뒤 ‘조건 적용’을 눌러 주세요.</p>';
  if(!months.includes(month)){const nearest=nearestMonth(months,month);return `<p class="month-message">${month}월에는 조건에 맞는 일정이 없습니다. <button class="text-button" data-jump-month="${nearest}">가까운 ${nearest}월 보기 →</button></p>`;}
  return monthMessage?`<p class="month-message">${monthMessage}</p>`:'';
}
function searchMarkup(){
  const list=matchingSlots(),runs=new Map(list.map(s=>[s.code,searchRuns(s,status,filters.stay)]));
  const ready=searchReady(),months=availableMonths();
  return `<section class="finder" data-active-mode="${draftFilters.mode}" aria-label="일정 찾기 조건">
  <div class="finder-heading"><h2 class="section-kicker heading-with-icon">${icon('sliders')}<span>일정 검색</span></h2><p>조건을 고른 뒤 ‘조건 적용’을 눌러 주세요.</p></div>
  <form id="search-form" novalidate><div class="mode-switch" role="group" aria-label="검색 방식"><button type="button" data-mode="match" aria-pressed="${draftFilters.mode==='match'}">우리 학교 조건으로 찾기</button><button type="button" data-mode="all" aria-pressed="${draftFilters.mode==='all'}">전체 일정 보기</button></div>
  <div class="filters">${draftFilters.mode==='match'?`<label>학교급<select id="grade">${Object.entries(GRADES).map(([k,v])=>option(k,v,draftFilters.grade)).join('')}</select></label><label>참가 인원 <span class="muted">(인솔자 포함)</span><input id="people" type="number" min="1" max="99999" step="1" inputmode="numeric" enterkeyhint="search" aria-describedby="draft-status" aria-invalid="${!!filterError}" placeholder="예: 150" value="${draftFilters.people??''}"></label>`:''}
  <label>시설<select id="facility">${option('','전체 시설',draftFilters.facility)}${catalog.facilities.map(f=>option(f.id,f.short,draftFilters.facility)).join('')}</select></label><label>숙박 형태<select id="stay" aria-describedby="day-visit-search-note">${option('','숙박형 전체',draftFilters.stay)}${SEARCH_STAYS.map(v=>option(v,v,draftFilters.stay)).join('')}</select></label></div>
  <div class="filter-actions"><p id="day-visit-search-note" class="day-visit-note">${DAY_VISIT_NOTICE}</p><button id="apply-filters" type="submit" class="with-icon">${icon('search')}<span>조건 적용</span></button></div>
  <p id="draft-status" class="draft-status ${hasDraftChanges()?'is-pending':''} ${filterError?'is-error':''}" role="status" aria-live="polite">${esc(draftStatusText())}</p></form>
  <div class="feedback-area" aria-live="polite" aria-atomic="true"><p id="filter-summary" class="filter-summary"><span class="applied-label">적용된 조건</span><strong>${filterSummary()}</strong></p>${filters.mode==='match'&&filters.people<100&&filters.people>0?'<p class="small-note">평창은 100명 미만 학교의 경우 제시된 날짜 외에도 협의할 수 있습니다. <a href="tel:033-330-0965">033-330-0965</a></p>':''}</div></section>
  <div class="schedule-layout"><section class="calendar-panel" aria-label="운영 가능 날짜 달력"><div class="calendar-title"><div><span class="eyebrow">2027년 운영 일정</span><h2 class="heading-with-icon">${icon('calendar')}<span class="month-title-text">${month}월</span></h2></div><div class="month-controls"><button data-month="-1" aria-label="이전 달" ${month===1?'disabled':''}>${icon('arrow-left')}</button><select id="month" aria-label="달 선택" class="${statusOK&&ready?(months.includes(month)?'month-open':'month-closed'):''}">${Array.from({length:12},(_,i)=>`<option value="${i+1}" class="${statusOK&&ready?(months.includes(i+1)?'month-open':'month-closed'):''}" ${i+1===month?'selected':''}>${esc(monthOptionLabel(i+1,months))}</option>`).join('')}</select><button data-month="1" aria-label="다음 달" ${month===12?'disabled':''}>${icon('arrow-right')}</button></div></div>
  <div class="month-feedback" role="status" aria-live="polite">${monthFeedback(months)}</div>
  <div class="legend" aria-label="시설 범례">${catalog.facilities.filter(f=>!filters.facility||f.id===filters.facility).map(f=>`<button data-legend="${f.id}" aria-label="${f.short} 시설 검색 조건으로 선택"><i style="--facility:${f.color}" aria-hidden="true"></i>${f.short}</button>`).join('')}${filters.facility?'<button data-legend="all">전체 시설 선택</button>':''}</div>
  <div class="weekdays" aria-hidden="true">${['일','월','화','수','목','금','토'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar">${calendarCells(list,runs)}</div>
  <p class="calendar-help">색이 있는 날짜를 누르면 상세 일정을 볼 수 있습니다. 입소일부터 퇴소일까지 모두 표시합니다.${!filters.facility?' 띠는 범례 순서대로 위에서 아래에 놓입니다. 시설명을 누르면 검색 조건으로 선택되며, 조건 적용 후 해당 시설을 볼 수 있습니다.':''}${!filters.stay?' 가능한 숙박 형태 중 하나라도 운영할 수 있는 날짜를 표시합니다.':''}</p></section>
  <section class="day-panel" aria-label="선택한 날짜 상세"><div class="day-heading"><span class="eyebrow">선택한 날짜</span><h2 class="heading-with-icon">${icon('pin')}<span>${dateLabel(selected)}</span></h2></div><div class="day-list">${list.filter(s=>covered(selected,runs.get(s.code))).map(s=>slotCard(s)).join('')||`<div class="empty"><span aria-hidden="true">${icon('calendar')}</span><h3>${!statusOK?'정보를 확인해 주세요':!ready?'학교 조건을 입력해 주세요':'다른 날짜도 살펴보세요'}</h3><p>${!statusOK?'최신 정보 확인 버튼을 누르거나 시설에 전화해 주세요.':!ready?'참가 인원을 입력하거나 전체 일정 보기를 선택해 주세요.':'이 날짜에는 표시할 일정이 없습니다. 달력에서 다른 날짜를 선택하거나 조건을 바꿔보세요.'}</p></div>`}</div></section></div>`;
}
function calendarCells(list,runs){
  const first=`2027-${String(month).padStart(2,'0')}-01`,offset=new Date(epoch(first)).getUTCDay(),length=new Date(Date.UTC(2027,month,0)).getUTCDate();let html='<div class="blank" aria-hidden="true"></div>'.repeat(offset);
  for(let day=1;day<=length;day++){
    const date=`2027-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,active=list.filter(s=>covered(date,runs.get(s.code))),facilities=catalog.facilities.filter(f=>!filters.facility||f.id===filters.facility),names=[...new Set(active.map(s=>s.facility.short))].join(', ');
    html+=`<button class="day ${selected===date?'selected':''} ${filters.facility?'single':''}" data-date="${date}" aria-pressed="${selected===date}" aria-label="${dateLabel(date)} ${names?`${names} 운영 가능`:'표시된 일정 없음'}"><span class="day-number">${day}</span><span class="tracks" aria-hidden="true">${facilities.map(f=>{const items=active.filter(s=>s.facilityId===f.id);return `<i class="track ${items.length?'active':''}" data-facility="${f.id}" style="--facility:${f.color}"></i>`;}).join('')}</span></button>`;
  }return html;
}
function slotCard(slot){const f=slot.facility,active=hasSavedSlot(saved,slot),label=slot.type==='negotiable_period'?'담은 날짜 있음':'담은 일정';return `<article class="slot-card facility-theme" style="${themeStyle(f)}"><div class="card-top"><div class="card-identity">${favoriteMarker(active,active?label:'아직 관심 일정에 담지 않은 일정',active?label:'')}<span class="facility-tag">${f.short} <span>${f.location}</span></span></div></div>${periodMarkup(slot)}<p class="muted">${gradeText(slot)}</p><p class="capacity">운영 가능 규모 <strong>${capacityLabel(slot,status,filters.mode==='match'?filters.grade:'')}</strong></p>${noticeFor(slot)}${consultNotice()}<div class="card-actions">${phone(f)}<button class="with-icon" data-detail="${slot.code}">${icon('info')}<span>프로그램 상세보기</span></button></div></article>`;}
function mealMarkup(f){return `<section class="meal-info" aria-label="식사 기준"><h4>식사 기준</h4><p class="meal-count"><strong>${f.mealPolicy.allowedMealCounts.join('·')}식</strong><span>2박3일 기준</span></p><p class="small-note">${esc(f.mealPolicy.sevenMealCondition)}.</p><p class="meal-footnote">1박2일 식사는 시설과 별도 협의해 주세요.</p><p class="day-visit-note">${DAY_VISIT_NOTICE}</p></section>`;}
function courseOverviewMarkup(p){
  const overview=PROGRAM_OVERVIEWS[p.id];if(!overview)return '';
  return `<section class="program-overview" aria-label="과정의 목적과 흐름"><h4>이 과정에서 경험하는 것</h4><p class="course-purpose">${esc(overview.purpose)}</p><h4>2박3일, 이렇게 이어집니다</h4><ol class="course-flow">${overview.days.map(d=>`<li><span class="flow-day">${d.day}일차</span><strong>${esc(d.title)}</strong><p>${esc(d.description)}</p></li>`).join('')}</ol><p class="overview-source">${esc(OVERVIEW_SOURCE_NOTE)}</p></section>`;
}
function programMarkup(p){
  const cap=p.capacity.maxExclusive?`${p.capacity.maxExclusive}명 미만`:`${p.capacity.interpretation==='reference'?'참고 규모':'최대'} ${p.capacity.value}명`;
  return `<article class="program-detail"><span class="eyebrow">${GRADES[p.schoolLevel]} · 2박3일 기준</span><h3>${esc(p.name)}</h3>${courseOverviewMarkup(p)}<p class="course-duration-note">2박3일 기준 구성입니다. 1박2일은 활동 내용과 시간표를 시설과 조정합니다.</p><div class="program-meta"><span>과정 안내 인원 <strong>${cap}</strong></span><span>인증번호 <strong>${esc(p.certificationNumber||'원문 별도 표기 없음')}</strong></span></div>${p.advanceReportNumbers?.length?`<p class="small-note">사전신고 번호: ${p.advanceReportNumbers.map(esc).join(', ')}</p>`:''}<p class="small-note">과정 안내 인원은 참고 정보이며, 일정 검색은 각 일정의 운영 가능 규모를 기준으로 합니다.</p>
  <details class="timetable" data-disclosure="timetable"><summary>2박3일 세부 일정표 펼치기</summary><p class="timetable-duration-note">소요시간은 표시된 시간 구간 기준입니다. 구간이 불명확하면 안내문에 명시된 시간을 표시하며, 확인할 수 없는 항목은 ‘—’로 표시합니다.</p><div class="timetable-days">${p.timetable.map(d=>`<section><h4>${d.day}일차</h4><table><caption class="sr-only">${esc(p.name)} ${d.day}일차 시간·소요시간·활동</caption><thead><tr><th scope="col" class="time-column">시간</th><th scope="col" class="duration-column">소요시간</th><th scope="col">활동</th></tr></thead><tbody>${d.events.map(e=>`<tr><td class="time-column">${esc(e.time.label)}</td><td class="duration-column">${esc(timetableDurationLabel(e))}</td><td>${timetableCellMarkup(e,p.activities,p.id)}</td></tr>`).join('')}</tbody></table></section>`).join('')}</div></details>
  <details class="activity-details" data-disclosure="activities"><summary>단위 프로그램 살펴보기</summary><div class="activities">${p.activities.map(a=>`<div><strong>${esc(a.name)}</strong><p>${esc(a.description)}</p></div>`).join('')}</div></details>${p.notes.map(n=>`<p class="small-note">${esc(n)}</p>`).join('')}</article>`;
}
function courseAccordion(p){return `<details class="program-accordion"><summary><span class="course-grade">${GRADES[p.schoolLevel]}</span><span class="course-heading"><strong>${esc(p.name)}</strong><span>2박3일 기준 프로그램</span></span><span class="course-chevron" aria-hidden="true">${icon('arrow-right')}</span></summary>${programMarkup(p)}</details>`;}
function programPhotos(f){
  const photos=PROGRAM_PHOTOS[f.id]||[];if(!photos.length)return '';
  return `<section class="facility-photo-section" aria-label="${esc(f.short)} 활동·시설 사진"><details class="photo-disclosure"><summary><span class="with-icon">${icon('photo')}<span>활동사진 보기</span></span><span class="photo-chevron" aria-hidden="true">${icon('arrow-right')}</span></summary><div class="facility-photo-grid">${photos.map((photo,index)=>`<figure><button type="button" class="photo-frame" data-open-photo="${esc(f.id)}" data-photo-index="${index}" data-photo-facility="${esc(f.short)}" aria-label="${esc(f.short)} 활동사진 ${index+1} 크게 보기" aria-haspopup="dialog" aria-controls="activity-photo-viewer"><img src="${esc(photo.src)}" alt="${esc(photo.alt)}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async"><span class="photo-zoom" aria-hidden="true">${icon('search')}</span></button></figure>`).join('')}</div></details></section>`;
}
function programsMarkup(){
  const f=catalog.facilities.find(f=>f.id===programFacility),brand=FACILITY_BRAND[f.id];
  return `<section class="programs facility-theme" data-facility="${f.id}" style="${themeStyle(f)}">
    <div class="section-heading program-page-heading"><div><p class="eyebrow">경험이 배움이 되는 곳</p><h2 class="heading-with-icon">${icon('book')}<span>시설별 프로그램 안내</span></h2></div></div>
    <section class="program-facility-picker" aria-labelledby="program-picker-title"><div class="program-picker-heading"><h3 id="program-picker-title">살펴볼 시설</h3><p>시설을 누르면 아래 프로그램이 바뀝니다.</p></div><div class="program-facility-options" role="group" aria-label="프로그램을 살펴볼 시설">${catalog.facilities.map(item=>`<button data-program-facility="${item.id}" aria-pressed="${item.id===programFacility}" aria-controls="program-facility-content"><span class="picker-name"><picture><source srcset="${FACILITY_BRAND[item.id].illustration.replace(/\.png$/,'.webp')}" type="image/webp"><img class="picker-illustration" src="${FACILITY_BRAND[item.id].illustration}" alt="" width="64" height="64" loading="lazy" decoding="async"></picture><span>${esc(item.short)}</span></span><small>${esc(item.location)}</small></button>`).join('')}</div></section>
    <div id="program-facility-content">
    <div class="facility-hero">
      <div class="facility-hero-copy"><div class="facility-overline"><span class="location-pill">${f.location}</span><span>2027 학교단체 수련활동</span></div><h3 class="facility-logo-panel"><img class="facility-logo" src="${brand.logo}" alt="${esc(f.name)}" decoding="async"></h3><p class="facility-hero-description">${esc(brand.description)}</p></div>
      <div class="facility-hero-art" aria-hidden="true"><picture><source srcset="${brand.illustration.replace(/\.png$/,'.webp')}" type="image/webp"><img src="${brand.illustration}" alt="" width="240" height="240" loading="lazy" decoding="async"></picture></div>
      <div class="facility-contact"><div><span class="contact-label">프로그램·일정 문의</span><p>학교에 맞는 활동을 시설과 함께 정해보세요.<br>신청은 전화 선착순으로 진행됩니다.</p>${f.id==='pyeongchang'?'<p class="facility-specific-note">100명 미만(교사 포함) 학교는 제시된 날짜 외에도 운영할 수 있습니다. 가능한 날짜는 전화로 문의해 주세요.</p>':''}${f.id==='future'?'<p class="facility-specific-note">운영 가능 규모 30~150명(인솔자 포함). 30명 이하 또는 150명 이상은 신청 전에 협의해 주세요.</p>':''}</div><div class="facility-contact-actions">${phone(f)}${programDownload(f)}<button class="with-icon" data-find-facility="${f.id}">${icon('calendar')}<span>이 시설 일정 찾기</span></button></div></div>
    </div>
    <div class="program-layout">
      <div class="program-content"><div class="program-list-heading"><h3>교급별 프로그램</h3><p>과정을 펼쳐 목적과 흐름, 주요 활동과 시간표를 확인하세요.</p></div>${f.programs.map(courseAccordion).join('')}${programPhotos(f)}</div>
      <aside class="program-aside" aria-label="프로그램 이용 안내"><div class="program-guide">${mealMarkup(f)}</div><div class="adaptation-note"><span class="guide-label">숙박 형태에 따른 운영 안내</span><p>${esc(catalog.notice)}</p></div>${f.id==='marine'?'<section class="partnership-card" aria-label="경주월드 제휴할인 안내"><h3>경주월드 제휴할인 안내</h3><button type="button" class="partnership-preview" data-open-partnership aria-haspopup="dialog" aria-controls="partnership-viewer" aria-label="경주월드 제휴할인 안내 이미지 확대"><img src="./assets/programs/marine-gyeongju-world.png" width="592" height="673" alt="해양센터 경주월드 제휴할인 안내" loading="lazy" decoding="async"><span>이미지를 눌러 크게 보기</span></button></section>':''}</aside>
    </div></div>
  </section>`;
}
function changeProgramFacility(id){
  if(id===programFacility||!catalog.facilities.some(f=>f.id===id))return;
  programFacility=id;render();$(`[data-program-facility="${id}"]`)?.focus({preventScroll:true});
}
function savedMarkup(){return `<section class="saved"><div class="section-heading"><div><p class="eyebrow">전화하기 전, 한눈에 비교</p><h2 class="heading-with-icon">${icon('heart')}<span>관심 일정</span></h2></div><button class="with-icon" data-back>${icon('search')}<span>일정 더 찾아보기</span></button></div><p class="muted">학년별 후보를 담고 메모해 두세요. 이 기기·브라우저에만 저장되며, 브라우저 데이터를 지우면 삭제됩니다.</p><div class="compare-grid">${saved.map(v=>{
  const s=catalog.byCode.get(v.code);if(!s)return `<article class="saved-card"><h3>원본 일정을 찾을 수 없습니다</h3><button data-remove="${esc(v.key)}">관심 일정 삭제</button></article>`;
  const changed=s.type==='fixed_round'&&(v.start!==s.startDate||v.end!==s.endDate),closed=statusOK&&isSavedClosed(s,status,v),f=s.facility;return `<article class="saved-card facility-theme ${closed?'closed':''}" style="${themeStyle(f)}"><div class="card-top"><div class="card-identity">${favoriteMarker(true)}<span class="facility-tag">${f.short}</span></div><button class="remove" data-remove="${esc(v.key)}" aria-label="${esc(f.short)} ${esc(rangeLabel(v.start,v.end))} 관심 일정 삭제">${icon('x')}</button></div><h3>${f.name}</h3>${periodMarkup(s)}<p class="saved-state ${closed?'closed-text':''}">${!statusOK?'신청 가능 여부 확인 필요':changed?'일정 변경 · 날짜를 다시 확인해 주세요':closed?'접수 완료':'전화로 신청 확인'}</p><dl><dt>담은 일정</dt><dd>${rangeLabel(v.start,v.end)} · ${esc(v.stay)}</dd><dt>대상</dt><dd>${gradeText(s)}</dd><dt>운영 가능 규모</dt><dd>${closed?'접수 완료':capacityLabel(s,status)}</dd><dt>과정</dt><dd>${f.programs.filter(p=>s.schoolLevels.includes(p.schoolLevel)).map(p=>`${GRADES[p.schoolLevel]} · ${esc(p.name)}`).join('<br>')}</dd></dl>${v.stay==='당일형'?`<p class="day-visit-note">이전에 담은 당일형 일정과 메모입니다. ${DAY_VISIT_NOTICE}</p>`:''}${noticeFor(s)}${consultNotice()}${phone(f)}<label class="memo-label">학교 메모 <span class="muted">(개인정보 제외)</span><textarea data-note="${esc(v.key)}" rows="3" maxlength="1000" placeholder="예: 5학년 후보 / 인솔자 포함 120명">${esc(v.note)}</textarea></label><button class="with-icon" data-detail="${s.code}" data-saved-choice="${esc(v.key)}">${icon('info')}<span>프로그램·일정 상세</span></button></article>`;
  }).join('')||`<div class="empty wide"><div class="empty-art" aria-hidden="true"><img src="${BRAND_ASSETS.hero}" alt="" width="150" height="100" loading="lazy" decoding="async"></div><h3>마음에 드는 일정을 담아보세요</h3><p>일정 상세에서 관심 일정에 담으면 이곳에서 비교할 수 있습니다.</p><button class="with-icon" data-back>${icon('search')}<span>일정 찾기</span></button></div>`}</div></section>`;}
function dialogPrograms(slot){
  const order=['elementary','middle','high'];
  return slot.facility.programs.filter(p=>slot.schoolLevels.includes(p.schoolLevel)).sort((a,b)=>order.indexOf(a.schoolLevel)-order.indexOf(b.schoolLevel));
}
function preferredDialogProgram(slot,preferredId){
  const programs=dialogPrograms(slot);
  return programs.find(p=>p.id===preferredId)||programs.find(p=>filters.mode==='match'&&p.schoolLevel===filters.grade)||programs[0];
}
function selectDialogCourse(id){
  if(!dialogSlot)return;const p=dialogPrograms(dialogSlot).find(p=>p.id===id);if(!p)return;
  dialogCourseId=p.id;$('#dialog-course').innerHTML=programMarkup(p);
  document.querySelectorAll('#detail [data-course]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.course===id)));
}
function showBookingOptions(){
  const panel=$('#booking-panel');if(!panel)return;panel.open=true;
  panel.scrollIntoView({block:'start',behavior:'smooth'});$('#pick-date')?.focus({preventScroll:true});
}
function openSlot(code,preserve=false,initialChoice=null){
  const s=catalog.byCode.get(code);if(!s)return;const dialog=$('#detail'),previous=preserve?{stay:$('#pick-stay')?.value,date:$('#pick-date')?.value,course:dialogCourseId,scroll:$('#detail-scroll')?.scrollTop||0,expanded:[...dialog.querySelectorAll('details[data-disclosure]')].filter(d=>d.open).map(d=>d.dataset.disclosure),focus:dialog.contains(document.activeElement)?document.activeElement.id:null}:null;dialogSlot=s;
  const f=s.facility,fixed=s.type==='fixed_round',closed=statusOK&&!availableRuns(s,status).length,stays=displayedStayTypes(s),noOvernight=statusOK&&!searchRuns(s,status).length;
  const defaultStay=[previous?.stay,initialChoice?.stay,filters.stay].find(value=>stays.includes(value))||stays.find(value=>searchRuns(s,status,value).length)||stays[0];
  const programs=dialogPrograms(s),current=preferredDialogProgram(s,previous?.course);dialogCourseId=current?.id||'';
  const saveButton=`<button id="save-slot" class="with-icon" aria-describedby="save-guidance" ${noOvernight||!statusOK?'disabled':''}><span class="save-heart">${icon('heart')}</span><span>관심 일정에 담기</span></button>`;
  const saveFeedback='<p id="save-feedback" class="save-feedback" role="status" aria-live="polite"></p>';
  dialog.classList.add('facility-theme');dialog.setAttribute('style',themeStyle(f));dialog.dataset.facility=f.id;
  dialog.innerHTML=`<div class="dialog-header"><div class="dialog-heading"><div class="dialog-topline"><span class="dialog-favorite"></span><span class="eyebrow">${f.location} · ${s.code}</span></div><h2 id="dialog-title" class="heading-with-icon facility-title">${icon(FACILITY_ICONS[f.id])}<span>${facilityNameMarkup(f)}</span></h2></div><button data-close aria-label="상세 닫기">${icon('x')}</button></div>
  <div id="detail-scroll" class="detail-scroll"><section class="detail-summary" aria-label="일정 요약"><dl><div class="detail-period"><dt>운영 가능 기간</dt><dd>${rangeLabel(s.startDate,s.endDate)}<span>${stayLabel(s)}</span></dd></div><div><dt>대상</dt><dd>${gradeText(s)}</dd></div><div><dt>운영 가능 규모 <small>(인솔자 포함)</small></dt><dd>${closed?'접수 완료':capacityLabel(s,status)}</dd></div></dl><div class="detail-summary-actions"><p class="detail-consult">${CONSULT_NOTICE}</p>${programDownload(f)}</div></section>
  ${!statusOK?'<p class="warning">현재 신청 가능 여부를 확인할 수 없습니다. 전화로 확인해 주세요.</p>':closed?'<p class="warning">접수 완료된 일정입니다.</p>':noOvernight?'<p class="warning">현재 숙박형으로 연속 운영 가능한 날짜가 없습니다. 다른 기간을 선택하거나 시설에 문의해 주세요.</p>':''}
  <div class="detail-layout"><section class="detail-courses" aria-label="교급별 과정 안내"><h3 class="program-section-title heading-with-icon">${icon('book')}<span>교급별 과정 안내</span></h3><div class="course-tabs" role="group" aria-label="살펴볼 학교급">${programs.map(p=>`<button id="course-${p.id}" data-course="${p.id}" aria-pressed="${p.id===dialogCourseId}" aria-controls="dialog-course">${GRADES[p.schoolLevel]}</button>`).join('')}</div><div id="dialog-course">${current?programMarkup(current):'<p>과정은 시설에 문의해 주세요.</p>'}</div></section>
  <aside class="detail-aside" aria-label="일정 이용 안내"><details id="booking-panel" class="practical-guide" data-disclosure="booking" ${innerWidth>=900?'open':''}><summary>${icon(fixed?'info':'calendar')}<span>${fixed?'식사·이용 안내':'희망 날짜 선택·이용 안내'}</span></summary><div class="practical-body">
  ${!fixed?`<section class="date-picker"><h4>관심 일정에 담을 날짜</h4><p class="small-note">기간 안에서 희망 입소일을 고르세요. 실제 운영일은 전화로 확정해 주세요.</p><div class="filters"><label>운영 형태<select id="pick-stay">${stays.map(t=>option(t,t,defaultStay)).join('')}</select></label><label>희망 입소일<input id="pick-date" type="date" min="${s.startDate}" max="${s.endDate}" value="${esc(previous?.date||initialChoice?.start||s.startDate)}"></label></div><div id="pick-result"></div>${saveButton}${saveFeedback}</section>`:''}
  <p class="booking-notice">예약신청은 국립시설별 전화 선착순입니다. 마감된 일정이 있을 수 있으니 신청 전 시설에 전화로 확인해 주세요.</p>${noticeFor(s)}${mealMarkup(f)}<div class="adaptation-note"><span class="guide-label">숙박 형태에 따른 운영 안내</span><p>${esc(catalog.notice)}</p></div></div></details></aside></div></div>
  <div class="dialog-footer"><div class="dialog-actions">${phone(f)}${fixed?saveButton:`<button class="with-icon" data-pick-dates>${icon('heart')}<span>날짜 선택·<wbr>관심 관리</span></button>`}</div>${fixed?saveFeedback:''}<div class="footer-note"><span>관심 일정 담기는 예약이 아닙니다.</span><button class="saved-shortcut" data-open-saved>관심 일정·비교로 이동 →</button></div><p class="save-guidance sr-only" id="save-guidance">${SAVE_GUIDANCE}</p></div>`;
  if(!fixed){if(initialChoice&&!previous)$('#pick-date').value=initialChoice.start;if(!previous&&!initialChoice){const stay=$('#pick-stay').value,run=searchRuns(s,status,stay).find(r=>covered(selected,[r]))||searchRuns(s,status,stay)[0];if(run){const last=epoch(run.end)-(STAY_DAYS[stay]-1)*DAY;$('#pick-date').value=iso(Math.max(epoch(run.start),Math.min(epoch(selected),last)));}}updatePick();}else syncSaveState();
  if(!dialog.open)dialog.showModal();
  if(previous){dialog.querySelectorAll('details[data-disclosure]').forEach(d=>d.open=previous.expanded.includes(d.dataset.disclosure));if(previous.focus)document.getElementById(previous.focus)?.focus({preventScroll:true});}
  $('#detail-scroll').scrollTop=previous?.scroll||0;
}
function chosen(){if(!dialogSlot)return null;const s=dialogSlot;if(s.type==='fixed_round'){const stay=displayedStayTypes(s)[0];return stay?{code:s.code,start:s.startDate,end:s.endDate,stay}:null;}const stay=$('#pick-stay').value,start=$('#pick-date').value;if(!SEARCH_STAYS.includes(stay)||!validDate(start,2027))return null;return {code:s.code,start,end:iso(epoch(start)+(STAY_DAYS[stay]-1)*DAY),stay};}
function pickValid(v){return !!v&&statusOK&&searchRuns(dialogSlot,status,v.stay).some(r=>v.start>=r.start&&v.end<=r.end);}
function syncSaveState(message){
  if(!dialogSlot)return;const v=chosen(),active=hasSavedChoice(saved,v),button=$('#save-slot');
  button.disabled=!active&&!pickValid(v);button.classList.toggle('is-saved',active);button.setAttribute('aria-pressed',String(active));
  button.innerHTML=`<span class="save-heart">${icon('heart')}</span><span>${active?'관심 일정 해제':'관심 일정에 담기'}</span>`;
  $('.dialog-favorite').innerHTML=favoriteMarker(active,active?'선택한 날짜를 관심 일정에 담았습니다':'선택한 날짜는 아직 관심 일정에 담지 않았습니다');
  $('#save-feedback').textContent=message??(active?'상단의 ‘관심 일정·비교’ 탭에서 담은 일정과 메모를 다시 확인할 수 있습니다.':'');
}
function updatePick(){const v=chosen(),valid=pickValid(v);$('#pick-result').innerHTML=valid?`<p class="small-note">희망 일정: <strong>${rangeLabel(v.start,v.end)}</strong> · 시설과 확정해 주세요.</p>`:'<p class="warning">선택한 형태로 연속 운영 가능한 날짜가 아닙니다. 다른 입소일이나 형태를 선택해 주세요.</p>';syncSaveState();}
function saveCurrent(){const v=chosen();if(!pickValid(v))return;if(hasSavedChoice(saved,v)){syncSaveState();return;}v.key=favoriteKey(v);saved.push({...v,note:''});const stored=persist();render();syncSaveState(stored?'관심 일정에 담았습니다. 선택한 일정은 상단의 ‘관심 일정·비교’ 탭에서 다시 확인할 수 있습니다.':'현재 화면에는 담았지만 이 브라우저에 저장할 수 없습니다. 창을 닫으면 관심 일정과 메모가 사라질 수 있습니다.');}
function toggleCurrentFavorite(){
  const v=chosen();if(!hasSavedChoice(saved,v)){saveCurrent();return;}
  saved=saved.filter(item=>favoriteKey(item)!==favoriteKey(v));
  const stored=persist();render();syncSaveState(stored?'관심 일정에서 해제했습니다. 이 일정에 작성한 메모도 함께 삭제됩니다.':'현재 화면에서는 해제했지만 브라우저 저장에 실패했습니다. 새로고침하면 다시 표시될 수 있습니다.');
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.tab){tab=b.dataset.tab;render();}
  if(b.hasAttribute('data-back')){tab='search';render();}
  if(b.hasAttribute('data-open-saved')){$('#detail').close();tab='saved';render();$('#main').scrollIntoView({block:'start'});$('#main').focus({preventScroll:true});}
  if(b.dataset.findFacility)chooseFacility(b.dataset.findFacility);
  if(b.dataset.programFacility)changeProgramFacility(b.dataset.programFacility);
  if(b.dataset.mode)updateDraft('mode',b.dataset.mode);
  if(b.dataset.month){month+=Number(b.dataset.month);selected=firstMatchingDate(month);alignCalendar(false);render();$(`[data-month="${b.dataset.month}"]`)?.focus();}
  if(b.dataset.jumpMonth){month=Number(b.dataset.jumpMonth);selected=firstMatchingDate(month);alignCalendar(false);render();$('#month').focus();}
  if(b.dataset.legend)chooseFacility(b.dataset.legend==='all'?'':b.dataset.legend);
  if(b.dataset.date){selected=b.dataset.date;render();$(`[data-date="${selected}"]`)?.focus();if(innerWidth<760)$('.day-panel')?.scrollIntoView({behavior:'smooth',block:'start'});}
  if(b.dataset.detail)openSlot(b.dataset.detail,false,saved.find(v=>v.key===b.dataset.savedChoice));
  if(b.dataset.course)selectDialogCourse(b.dataset.course);
  if(b.hasAttribute('data-pick-dates'))showBookingOptions();
  if(b.hasAttribute('data-close'))$('#detail').close();
  if(b.id==='save-slot')toggleCurrentFavorite();
  if(b.dataset.remove){saved=saved.filter(v=>v.key!==b.dataset.remove);persist();render();toast('관심 일정에서 삭제했습니다.');}
  if(b.id==='refresh')refreshStatus(true);
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(['grade','facility','stay'].includes(el.id))updateDraft(el.id,el.value);
  if(el.id==='month'){month=Number(el.value);selected=firstMatchingDate(month);alignCalendar(false);render();$('#month').focus();}
  if(el.id==='pick-stay'||el.id==='pick-date')updatePick();
});
document.addEventListener('submit',e=>{if(e.target.id==='search-form'){e.preventDefault();if(applyFilters())$('#people')?.blur();}});
document.addEventListener('input',e=>{if(e.target.id==='people')updateDraft('people',e.target.value);if(e.target.dataset.note){const v=saved.find(v=>v.key===e.target.dataset.note);if(v){v.note=e.target.value;persist();}}});
$('#detail').addEventListener('close',()=>{dialogSlot=null;});
window.addEventListener('storage',e=>{if(e.key===STORAGE){try{const next=JSON.parse(e.newValue||'[]');if(Array.isArray(next)){saved=next.filter(v=>v&&catalog?.byCode.has(v.code)&&typeof v.key==='string'&&validDate(v.start,2027)&&validDate(v.end,2027)).map(v=>({...v,note:String(v.note??'').slice(0,1000)}));render();if(dialogSlot)syncSaveState();}}catch{}}});
// No service worker. Re-fetch the tiny status file on return and every five visible minutes.
function onReturn(){if(document.visibilityState==='visible'&&Date.now()-lastRefresh>60000)refreshStatus();}
document.addEventListener('visibilitychange',onReturn);window.addEventListener('pageshow',onReturn);
setInterval(()=>{if(document.visibilityState==='visible')refreshStatus();},300000);
try{const response=await fetch('./data/national-youth-facilities-2027.json',{cache:'no-cache'});if(!response.ok)throw Error(`HTTP ${response.status}`);catalog=catalogFrom(await response.json());await refreshStatus();}
catch(error){console.error(error);$('#main').innerHTML='<div class="empty"><h2>기본 일정 파일을 불러오지 못했습니다.</h2><p>잠시 후 페이지를 새로고침해 주세요. 운영자는 data 폴더가 함께 업로드되었는지 확인해 주세요.</p></div>';$('#asof').textContent='일정 정보 확인 불가';}
