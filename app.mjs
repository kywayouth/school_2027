import {catalogFrom,parseStatus,emptyStatus,GRADES,STAY_DAYS,DAY,epoch,iso,dateLabel,rangeLabel,capacityLabel,availableRuns,matches,covered,isSavedClosed,validDate,matchingMonths,nearestMonth} from './domain.mjs';
import {icon,FACILITY_ICONS} from './icons.mjs';
import {timetableCellMarkup} from './timetable.mjs';
import {BRAND_ASSETS,FACILITY_BRAND} from './brand.mjs';

// Static shell icons use the same embedded drawings as dynamically rendered views.
document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});

const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='national-youth-2027-favorites-v1';
let catalog,status=emptyStatus(),statusOK=false,statusError='',inFlight=null,lastRefresh=0,tab='search',month=3,selected='2027-03-03',programFacility='central',dialogSlot=null;
let filters={mode:'all',grade:'elementary',people:null,facility:'',stay:''},saved=[];
let monthMessage='';
let resultPointerDown=false,pendingPeopleValue;
const CONSULT_NOTICE='세부 날짜와 숙박 형태는 시설과 전화로 협의해 주세요';
try { const raw=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(raw))saved=raw.filter(v=>v&&typeof v.code==='string'&&typeof v.key==='string'&&validDate(v.start,2027)&&validDate(v.end,2027)).map(v=>({...v,note:String(v.note??'').slice(0,1000)})); } catch { /* Storage can be denied in a private/restricted browser. */ }
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3600);}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(saved));}catch{toast('이 브라우저에서는 저장할 수 없습니다. 창을 닫으면 관심 일정과 메모가 사라질 수 있습니다.');}}
const option=(value,label,current)=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`;
function themeStyle(f){return `--facility:${f.color};--facility-ink:${f.ink};--facility-tint:${f.tint};--facility-soft:${f.soft};--facility-border:${f.border}`;}
function facilityNameMarkup(f){return esc(f.name).replace('청소년','청소년<wbr>');}
function gradeText(slot){return slot.schoolLevels.map(g=>GRADES[g]).join(' · ');}
function stayLabel(slot){return `${slot.allowedStayTypes.join(', ')}${slot.facilityId==='pyeongchang'?' 가능':''}`;}
function periodMarkup(slot){return `<p class="period-label">운영 가능 기간</p><h3>${rangeLabel(slot.startDate,slot.endDate)}<span class="stay-label"> · ${stayLabel(slot)}</span></h3>`;}
function consultNotice(){return `<p class="consult-notice">${CONSULT_NOTICE}</p>`;}
function phone(f){return `<a class="phone" href="tel:${esc(f.reservationPhone)}">${icon('phone')} ${esc(f.reservationPhone)}<span class="phone-label">전화 문의</span></a>`;}
function noticeFor(slot){return slot.facilityId==='pyeongchang'?'<p class="small-note">초등학교는 150명 미만으로 운영합니다. 100명 미만 학교는 안내된 날짜 외에도 운영 가능하니 전화로 협의해 주세요.</p>':slot.facilityId==='future'?'<p class="small-note">150명 이상 학교는 신청 전 시설과 사전 협의가 필요합니다.</p>':'';}
function refreshHeader(){
  if(status.asOf){const d=new Date(status.asOf),parts=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hourCycle:'h23'}).formatToParts(d),get=t=>Number(parts.find(p=>p.type===t)?.value);$('#asof').textContent=`${get('month')}월 ${get('day')}일 ${get('hour')}시${get('minute')?` ${get('minute')}분`:''} 기준`;
    $('#freshness').textContent=Date.now()-d.getTime()>36*3600000?'최근 갱신 여부를 전화로 확인해 주세요.':'';
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
  const markup=tab==='search'?searchMarkup():tab==='saved'?savedMarkup():programsMarkup();
  const finder=$('#main .finder');
  if(tab==='search'&&finder){
    // Keep the live filter controls mounted: blur must not swallow a tap on the
    // next select, reopen the mobile keyboard, or discard an unfinished number.
    const template=document.createElement('template');template.innerHTML=markup;
    const next=template.content.querySelector('.finder');
    if(finder.dataset.activeMode!==filters.mode)finder.querySelector('.filters').replaceWith(next.querySelector('.filters'));
    finder.dataset.activeMode=filters.mode;
    finder.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===filters.mode)));
    finder.querySelector('.feedback-area').innerHTML=next.querySelector('.feedback-area').innerHTML;
    // Preserve month controls too: a number-field blur must not remove the
    // dropdown while a teacher is opening it or tabbing into it.
    const layout=$('#main .schedule-layout'),nextLayout=template.content.querySelector('.schedule-layout');
    layout.querySelector('.month-title-text').textContent=nextLayout.querySelector('.month-title-text').textContent;
    for(const direction of ['-1','1'])layout.querySelector(`[data-month="${direction}"]`).disabled=nextLayout.querySelector(`[data-month="${direction}"]`).disabled;
    const monthSelect=layout.querySelector('#month'),nextSelect=nextLayout.querySelector('#month');
    [...monthSelect.options].forEach((o,i)=>o.textContent=nextSelect.options[i].textContent);monthSelect.value=String(month);
    for(const selector of ['.month-feedback','.legend','.calendar','.calendar-help','.day-heading','.day-list'])layout.querySelector(selector).innerHTML=nextLayout.querySelector(selector).innerHTML;
  }else $('#main').innerHTML=markup;
}
function matchingSlots(){return statusOK?catalog.slots.filter(s=>matches(s,status,filters)):[];}
function searchReady(){return filters.mode==='all'||(Number.isInteger(filters.people)&&filters.people>0&&filters.people<=99999);}
function availableMonths(){return statusOK&&searchReady()?matchingMonths(catalog.slots,status,filters):[];}
function firstMatchingDate(targetMonth){
  const start=`2027-${String(targetMonth).padStart(2,'0')}-01`,end=iso(Date.UTC(2027,targetMonth,0));
  return matchingSlots().flatMap(s=>availableRuns(s,status,filters.stay)).filter(r=>r.start<=end&&r.end>=start).map(r=>r.start>start?r.start:start).sort()[0]??start;
}
function alignCalendar(autoMove){
  monthMessage='';const months=availableMonths();if(!months.length)return;
  if(!months.includes(month)&&autoMove){const previous=month;month=nearestMonth(months,month);monthMessage=`${previous}월에는 조건에 맞는 일정이 없어 가장 가까운 ${month}월로 이동했어요.`;selected=firstMatchingDate(month);}
  else if(months.includes(month)&&!matchingSlots().some(s=>covered(selected,availableRuns(s,status,filters.stay))))selected=firstMatchingDate(month);
}
function filterSummary(){
  if(!searchReady())return '참가 인원을 양의 정수로 입력한 뒤 입력칸을 벗어나거나 엔터를 눌러 주세요.';
  const facility=filters.facility?catalog.facilities.find(f=>f.id===filters.facility).short:'';
  const conditions=[...(filters.mode==='match'?[GRADES[filters.grade],`${filters.people}명`]:['학교급·인원 제한 없이']),filters.stay||'모든 숙박 형태',facility].filter(Boolean).join(' · ');
  return `${conditions}${filters.mode==='match'?' 조건에 맞는':'의'} 일정을 표시하고 있어요.`;
}
function monthFeedback(months){
  if(!statusOK)return '<p class="month-message">현재 일정 정보를 확인할 수 없습니다. 최신 정보 확인을 눌러 주세요.</p>';
  if(!searchReady())return '<p class="month-message">참가 인원을 적용하면 일정이 있는 달을 표시합니다.</p>';
  if(!months.length)return '<p class="month-message">조건에 맞는 운영 기간이 없습니다. 참가 인원·숙박 형태·시설을 바꾸거나 전체 일정 보기를 선택해 주세요.</p>';
  if(!months.includes(month)){const nearest=nearestMonth(months,month);return `<p class="month-message">${month}월에는 조건에 맞는 일정이 없습니다. <button class="text-button" data-jump-month="${nearest}">가까운 ${nearest}월 보기 →</button></p>`;}
  return `<p class="month-message">${monthMessage||'월 선택에서 ‘일정 있음’이 표시된 달을 살펴보세요.'}</p>`;
}
function searchMarkup(){
  const list=matchingSlots(),runs=new Map(list.map(s=>[s.code,availableRuns(s,status,filters.stay)]));
  const ready=searchReady(),months=availableMonths();
  return `<section class="finder" data-active-mode="${filters.mode}" aria-label="일정 찾기 조건"><div class="section-kicker heading-with-icon">${icon('sliders')}<span>어떤 일정이 필요하세요?</span></div><div class="mode-switch"><button data-mode="match" aria-pressed="${filters.mode==='match'}">우리 학교 조건으로 찾기</button><button data-mode="all" aria-pressed="${filters.mode==='all'}">전체 일정 보기</button></div>
  <div class="filters">${filters.mode==='match'?`<label>학교급<select id="grade">${Object.entries(GRADES).map(([k,v])=>option(k,v,filters.grade)).join('')}</select></label><label>참가 인원 <span class="muted">(인솔자 포함)</span><input id="people" type="number" min="1" max="99999" step="1" inputmode="numeric" enterkeyhint="done" aria-describedby="filter-summary" placeholder="예: 150" value="${filters.people??''}"></label>`:'<p class="all-hint">학교 조건과 관계없이 살펴보세요.<br>학년별로 나눠 신청할 일정도 찾아볼 수 있습니다.</p>'}
  <label>시설<select id="facility">${option('','전체 시설',filters.facility)}${catalog.facilities.map(f=>option(f.id,f.short,filters.facility)).join('')}</select></label><label>숙박 형태<select id="stay">${option('','모든 형태',filters.stay)}${Object.keys(STAY_DAYS).map(v=>option(v,v,filters.stay)).join('')}</select></label></div>
  <div class="feedback-area" aria-live="polite" aria-atomic="true"><p id="filter-summary" class="filter-summary">${filterSummary()}</p>${filters.mode==='match'&&filters.people<100&&filters.people>0?'<p class="small-note">평창은 100명 미만 학교의 경우 제시된 날짜 외에도 협의할 수 있습니다. <a href="tel:033-330-0965">033-330-0965</a></p>':''}</div></section>
  <div class="schedule-layout"><section class="calendar-panel" aria-label="운영 가능 날짜 달력"><div class="calendar-title"><div><span class="eyebrow">2027년 운영 일정</span><h2 class="heading-with-icon">${icon('calendar')}<span class="month-title-text">${month}월</span></h2></div><div class="month-controls"><button data-month="-1" aria-label="이전 달" ${month===1?'disabled':''}>${icon('arrow-left')}</button><select id="month" aria-label="달 선택">${Array.from({length:12},(_,i)=>option(String(i+1),`${i+1}월${months.includes(i+1)?' · 일정 있음':''}`,String(month))).join('')}</select><button data-month="1" aria-label="다음 달" ${month===12?'disabled':''}>${icon('arrow-right')}</button></div></div>
  <div class="month-feedback" role="status" aria-live="polite">${monthFeedback(months)}</div>
  <div class="legend" aria-label="시설 범례">${catalog.facilities.filter(f=>!filters.facility||f.id===filters.facility).map(f=>`<button data-legend="${f.id}" aria-label="${f.short} 시설만 보기"><i style="--facility:${f.color}" aria-hidden="true"></i>${f.short}</button>`).join('')}${filters.facility?'<button data-legend="all">전체 시설 보기</button>':''}</div>
  <div class="weekdays" aria-hidden="true">${['일','월','화','수','목','금','토'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar">${calendarCells(list,runs)}</div>
  <p class="calendar-help">색이 있는 날짜를 누르면 상세 일정을 볼 수 있습니다. 입소일부터 퇴소일까지 모두 표시합니다.${!filters.facility?' 띠는 범례 순서대로 위에서 아래에 놓입니다. 시설명을 누르면 해당 시설만 볼 수 있습니다.':''}${!filters.stay?' 가능한 숙박 형태 중 하나라도 운영할 수 있는 날짜를 표시합니다.':''}</p></section>
  <section class="day-panel" aria-label="선택한 날짜 상세"><div class="day-heading"><span class="eyebrow">선택한 날짜</span><h2 class="heading-with-icon">${icon('pin')}<span>${dateLabel(selected)}</span></h2></div><div class="day-list">${list.filter(s=>covered(selected,runs.get(s.code))).map(s=>slotCard(s)).join('')||`<div class="empty"><span aria-hidden="true">${icon('calendar')}</span><h3>${!statusOK?'정보를 확인해 주세요':!ready?'학교 조건을 입력해 주세요':'다른 날짜도 살펴보세요'}</h3><p>${!statusOK?'최신 정보 확인 버튼을 누르거나 시설에 전화해 주세요.':!ready?'참가 인원을 입력하거나 전체 일정 보기를 선택해 주세요.':'이 날짜에는 표시할 일정이 없습니다. 달력에서 다른 날짜를 선택하거나 조건을 바꿔보세요.'}</p></div>`}</div></section></div>`;
}
function calendarCells(list,runs){
  const first=`2027-${String(month).padStart(2,'0')}-01`,offset=new Date(epoch(first)).getUTCDay(),length=new Date(Date.UTC(2027,month,0)).getUTCDate();let html='<div class="blank" aria-hidden="true"></div>'.repeat(offset);
  for(let day=1;day<=length;day++){
    const date=`2027-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,active=list.filter(s=>covered(date,runs.get(s.code))),facilities=catalog.facilities.filter(f=>!filters.facility||f.id===filters.facility),names=[...new Set(active.map(s=>s.facility.short))].join(', ');
    html+=`<button class="day ${selected===date?'selected':''} ${filters.facility?'single':''}" data-date="${date}" aria-pressed="${selected===date}" aria-label="${dateLabel(date)} ${names?`${names} 운영 가능`:'표시된 일정 없음'}"><span class="day-number">${day}</span><span class="tracks" aria-hidden="true">${facilities.map(f=>{const items=active.filter(s=>s.facilityId===f.id);return `<i class="track ${items.length?'active':''}" data-facility="${f.id}" style="--facility:${f.color}"></i>`;}).join('')}</span></button>`;
  }return html;
}
function slotCard(slot){const f=slot.facility;return `<article class="slot-card facility-theme" style="${themeStyle(f)}"><div class="card-top"><span class="facility-tag">${f.short} <span>${f.location}</span></span></div>${periodMarkup(slot)}<p class="muted">${gradeText(slot)}</p><p class="capacity">운영 가능 규모 <strong>${capacityLabel(slot,status,filters.mode==='match'?filters.grade:'')}</strong></p>${consultNotice()}<div class="card-actions">${phone(f)}<button class="with-icon" data-detail="${slot.code}">${icon('heart')}<span>상세·관심 담기</span></button></div></article>`;}
function mealMarkup(f){return `<section class="meal-info" aria-label="식사 기준"><h4>식사 기준</h4><p class="meal-count"><strong>${f.mealPolicy.allowedMealCounts.join('·')}식</strong><span>2박3일 기준</span></p><p class="small-note">${esc(f.mealPolicy.sevenMealCondition)}.</p><p class="meal-footnote">1박2일·당일형 식사는 시설과 별도 협의해 주세요.</p></section>`;}
function programMarkup(p){
  const cap=p.capacity.maxExclusive?`${p.capacity.maxExclusive}명 미만`:`${p.capacity.interpretation==='reference'?'참고 규모':'최대'} ${p.capacity.value}명`;
  return `<article class="program-detail"><span class="eyebrow">${GRADES[p.schoolLevel]} · 2박3일 기준</span><h3>${esc(p.name)}</h3><div class="program-meta"><span>과정 안내 인원 <strong>${cap}</strong></span><span>인증번호 <strong>${esc(p.certificationNumber||'원문 별도 표기 없음')}</strong></span></div>${p.advanceReportNumbers?.length?`<p class="small-note">사전신고 번호: ${p.advanceReportNumbers.map(esc).join(', ')}</p>`:''}<p class="small-note">과정 안내 인원은 참고 정보이며, 일정 검색은 각 일정의 운영 가능 규모를 기준으로 합니다.</p>
  <h4>주요 활동</h4><div class="activities">${p.activities.map(a=>`<div><strong>${esc(a.name)}</strong><p>${esc(a.description)}</p></div>`).join('')}</div>
  <details class="timetable"><summary>2박3일 세부 일정표 펼치기</summary><div class="timetable-days">${p.timetable.map(d=>`<section><h4>${d.day}일차</h4><table><thead><tr><th scope="col">시간</th><th scope="col">활동</th></tr></thead><tbody>${d.events.map(e=>`<tr><td>${esc(e.time.label)}</td><td>${timetableCellMarkup(e,p.activities)}</td></tr>`).join('')}</tbody></table></section>`).join('')}</div></details>${p.notes.map(n=>`<p class="small-note">${esc(n)}</p>`).join('')}</article>`;
}
function courseAccordion(p){return `<details class="program-accordion"><summary><span class="course-grade">${GRADES[p.schoolLevel]}</span><span class="course-heading"><strong>${esc(p.name)}</strong><span>2박3일 기준 프로그램</span></span><span class="course-chevron" aria-hidden="true">${icon('arrow-right')}</span></summary>${programMarkup(p)}</details>`;}
function programsMarkup(){
  const f=catalog.facilities.find(f=>f.id===programFacility),brand=FACILITY_BRAND[f.id];
  return `<section class="programs facility-theme" data-facility="${f.id}" style="${themeStyle(f)}">
    <div class="section-heading program-page-heading"><div><p class="eyebrow">경험이 배움이 되는 곳</p><h2 class="heading-with-icon">${icon('book')}<span>시설별 프로그램 안내</span></h2></div><label>살펴볼 시설<select id="program-facility" aria-label="시설 선택">${catalog.facilities.map(f=>option(f.id,f.short,programFacility)).join('')}</select></label></div>
    <div class="facility-hero">
      <div class="facility-hero-copy"><div class="facility-overline"><span class="location-pill">${f.location}</span><span>2027 학교단체 수련활동</span></div><h3 class="facility-logo-panel"><img class="facility-logo" src="${brand.logo}" alt="${esc(f.name)}" decoding="async"></h3><p class="facility-hero-description">${esc(brand.description)}</p></div>
      <div class="facility-hero-art" aria-hidden="true"><img src="${brand.character}" alt="" loading="lazy" decoding="async"></div>
      <div class="facility-contact"><div><span class="contact-label">프로그램·일정 문의</span><p>학교에 맞는 활동을 시설과 함께 정해보세요.<br>신청은 전화 선착순으로 진행됩니다.</p></div><div class="facility-contact-actions">${phone(f)}<button class="with-icon" data-find-facility="${f.id}">${icon('calendar')}<span>이 시설 일정 찾기</span></button></div></div>
    </div>
    <div class="program-layout">
      <div class="program-content"><div class="program-list-heading"><h3>교급별 프로그램</h3><p>과정을 펼쳐 주요 활동과 시간표를 확인하세요.</p></div>${f.programs.map(courseAccordion).join('')}</div>
      <aside class="program-aside" aria-label="프로그램 이용 안내"><div class="program-guide">${mealMarkup(f)}</div><div class="adaptation-note"><span class="guide-label">숙박 형태에 따른 운영 안내</span><p>${esc(catalog.notice)}</p></div></aside>
    </div>
  </section>`;
}
function savedMarkup(){return `<section class="saved"><div class="section-heading"><div><p class="eyebrow">전화하기 전, 한눈에 비교</p><h2 class="heading-with-icon">${icon('heart')}<span>관심 일정</span></h2></div><button class="with-icon" data-back>${icon('search')}<span>일정 더 찾아보기</span></button></div><p class="muted">학년별 후보를 담고 메모해 두세요. 이 기기·브라우저에만 저장되며, 브라우저 데이터를 지우면 삭제됩니다.</p><div class="compare-grid">${saved.map(v=>{
  const s=catalog.byCode.get(v.code);if(!s)return `<article class="saved-card"><h3>원본 일정을 찾을 수 없습니다</h3><button data-remove="${esc(v.key)}">관심 일정 삭제</button></article>`;
  const closed=statusOK&&isSavedClosed(s,status,v),f=s.facility;return `<article class="saved-card facility-theme ${closed?'closed':''}" style="${themeStyle(f)}"><div class="card-top"><span class="facility-tag">${f.short}</span><button class="remove" data-remove="${esc(v.key)}" aria-label="${esc(f.short)} ${esc(rangeLabel(v.start,v.end))} 관심 일정 삭제">${icon('x')}</button></div><h3>${f.name}</h3>${periodMarkup(s)}<p class="saved-state ${closed?'closed-text':''}">${!statusOK?'신청 가능 여부 확인 필요':closed?'접수 완료':'전화로 신청 확인'}</p><dl><dt>담은 일정</dt><dd>${rangeLabel(v.start,v.end)} · ${esc(v.stay)}</dd><dt>대상</dt><dd>${gradeText(s)}</dd><dt>운영 가능 규모</dt><dd>${closed?'접수 완료':capacityLabel(s,status)}</dd><dt>과정</dt><dd>${f.programs.filter(p=>s.schoolLevels.includes(p.schoolLevel)).map(p=>`${GRADES[p.schoolLevel]} · ${esc(p.name)}`).join('<br>')}</dd></dl>${consultNotice()}${phone(f)}<label class="memo-label">학교 메모 <span class="muted">(개인정보 제외)</span><textarea data-note="${esc(v.key)}" rows="3" maxlength="1000" placeholder="예: 5학년 후보 / 인솔자 포함 120명">${esc(v.note)}</textarea></label><button class="with-icon" data-detail="${s.code}">${icon('info')}<span>프로그램·일정 상세</span></button></article>`;
  }).join('')||`<div class="empty wide"><div class="empty-art" aria-hidden="true"><img src="${BRAND_ASSETS.hero}" alt="" width="150" height="100" loading="lazy" decoding="async"></div><h3>마음에 드는 일정을 담아보세요</h3><p>일정 상세에서 관심 일정에 담으면 이곳에서 비교할 수 있습니다.</p><button class="with-icon" data-back>${icon('search')}<span>일정 찾기</span></button></div>`}</div></section>`;}
function openSlot(code,preserve=false){
  const s=catalog.byCode.get(code);if(!s)return;const dialog=$('#detail'),previous=preserve?{stay:$('#pick-stay')?.value,date:$('#pick-date')?.value}:null;dialogSlot=s;
  const f=s.facility,fixed=s.type==='fixed_round',closed=statusOK&&!availableRuns(s,status).length;
  dialog.classList.add('facility-theme');dialog.setAttribute('style',themeStyle(f));dialog.dataset.facility=f.id;
  dialog.innerHTML=`<div class="dialog-header"><div><p class="eyebrow">${f.location} · ${s.code}</p><h2 id="dialog-title" class="heading-with-icon facility-title">${icon(FACILITY_ICONS[f.id])}<span>${facilityNameMarkup(f)}</span></h2><a class="dialog-quick-phone with-icon" href="tel:${esc(f.reservationPhone)}">${icon('phone')}<span>예약 문의 ${esc(f.reservationPhone)}</span></a></div><button data-close aria-label="상세 닫기">${icon('x')}</button></div><div class="dialog-body">${periodMarkup(s)}<p>${gradeText(s)}</p><p class="capacity">운영 가능 규모 <strong>${capacityLabel(s,status)}</strong> <span class="muted">(인솔자 포함)</span></p>${consultNotice()}${noticeFor(s)}${!statusOK?'<p class="warning">현재 신청 가능 여부를 확인할 수 없습니다. 전화로 확인해 주세요.</p>':closed?'<p class="warning">접수 완료된 일정입니다.</p>':''}
  ${!fixed?`<section class="date-picker"><h4>희망 날짜 선택</h4><p class="small-note">표시된 기간 안에서 실제 운영일을 시설과 협의합니다. 아래 날짜를 선택해 관심 일정에 담아두세요.</p><div class="filters"><label>운영 형태<select id="pick-stay">${s.allowedStayTypes.map(t=>option(t,t,previous?.stay||filters.stay||s.allowedStayTypes[0])).join('')}</select></label><label>희망 입소일<input id="pick-date" type="date" min="${s.startDate}" max="${s.endDate}" value="${previous?.date||s.startDate}"></label></div><div id="pick-result"></div></section>`:''}
  <div class="dialog-actions">${phone(f)}<button id="save-slot" class="with-icon" ${closed||!statusOK?'disabled':''}>${icon('heart')}<span>관심 일정에 담기</span></button></div><p class="small-note">관심 일정 담기는 예약이 아닙니다. 신청 전 전화로 확인해 주세요.</p><h3 class="program-section-title heading-with-icon">${icon('book')}<span>교급별 과정 안내</span></h3>${mealMarkup(f)}<p class="info-box">${esc(catalog.notice)}</p>${f.programs.filter(p=>s.schoolLevels.includes(p.schoolLevel)).map(courseAccordion).join('')}</div>`;
  if(!fixed){if(!previous){const stay=$('#pick-stay').value,run=availableRuns(s,status,stay).find(r=>covered(selected,[r]))||availableRuns(s,status,stay)[0];if(run){const last=epoch(run.end)-(STAY_DAYS[stay]-1)*DAY;$('#pick-date').value=iso(Math.max(epoch(run.start),Math.min(epoch(selected),last)));}}updatePick();}
  if(!dialog.open)dialog.showModal();
}
function chosen(){if(!dialogSlot)return null;const s=dialogSlot;if(s.type==='fixed_round')return {code:s.code,start:s.startDate,end:s.endDate,stay:s.allowedStayTypes[0]};const stay=$('#pick-stay').value,start=$('#pick-date').value;if(!validDate(start,2027))return null;return {code:s.code,start,end:iso(epoch(start)+(STAY_DAYS[stay]-1)*DAY),stay};}
function pickValid(v){return !!v&&statusOK&&availableRuns(dialogSlot,status,v.stay).some(r=>v.start>=r.start&&v.end<=r.end);}
function updatePick(){const v=chosen(),valid=pickValid(v);$('#save-slot').disabled=!valid;$('#pick-result').innerHTML=valid?`<p class="small-note">희망 일정: <strong>${rangeLabel(v.start,v.end)}</strong> · 시설과 확정해 주세요.</p>`:'<p class="warning">선택한 형태로 연속 운영 가능한 날짜가 아닙니다. 다른 입소일이나 형태를 선택해 주세요.</p>';}
function saveCurrent(){const v=chosen();if(!pickValid(v))return;v.key=[v.code,v.start,v.end,v.stay].join('|');if(saved.some(s=>s.key===v.key)){toast('이미 관심 일정에 담겨 있습니다.');return;}saved.push({...v,note:''});persist();toast('관심 일정에 담았습니다. 관심 일정·비교에서 확인하세요.');if(tab==='saved')render();}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.tab){tab=b.dataset.tab;render();}
  if(b.hasAttribute('data-back')){tab='search';render();}
  if(b.dataset.findFacility){filters.facility=b.dataset.findFacility;tab='search';alignCalendar(true);render();$('#main').scrollIntoView({block:'start'});$('#facility').focus({preventScroll:true});}
  if(b.dataset.mode){filters.mode=b.dataset.mode;alignCalendar(true);render();}
  if(b.dataset.month){month+=Number(b.dataset.month);selected=firstMatchingDate(month);alignCalendar(false);render();$(`[data-month="${b.dataset.month}"]`)?.focus();}
  if(b.dataset.jumpMonth){month=Number(b.dataset.jumpMonth);selected=firstMatchingDate(month);alignCalendar(false);render();$('#month').focus();}
  if(b.dataset.legend){filters.facility=b.dataset.legend==='all'?'':b.dataset.legend;$('#facility').value=filters.facility;alignCalendar(true);render();$('#facility').focus();}
  if(b.dataset.date){selected=b.dataset.date;render();$(`[data-date="${selected}"]`)?.focus();if(innerWidth<760)$('.day-panel')?.scrollIntoView({behavior:'smooth',block:'start'});}
  if(b.dataset.detail)openSlot(b.dataset.detail);
  if(b.hasAttribute('data-close'))$('#detail').close();
  if(b.id==='save-slot')saveCurrent();
  if(b.dataset.remove){saved=saved.filter(v=>v.key!==b.dataset.remove);persist();render();toast('관심 일정에서 삭제했습니다.');}
  if(b.id==='refresh')refreshStatus(true);
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(['grade','facility','stay'].includes(el.id)){filters[el.id]=el.value;alignCalendar(true);render();}
  if(el.id==='month'){month=Number(el.value);selected=firstMatchingDate(month);alignCalendar(false);render();$('#month').focus();}
  if(el.id==='program-facility'){programFacility=el.value;render();$('#program-facility').focus();}
  if(el.id==='pick-stay'||el.id==='pick-date')updatePick();
});
function commitPeople(value){const people=value===''?null:Number(value);if(Object.is(people,filters.people))return;filters.people=people;alignCalendar(true);render();}
function finishResultPointer(){resultPointerDown=false;if(pendingPeopleValue!==undefined){const value=pendingPeopleValue;pendingPeopleValue=undefined;commitPeople(value);}}
document.addEventListener('pointerdown',e=>{resultPointerDown=!!e.target.closest('.schedule-layout button');},true);
// Allow an in-progress tap on a calendar/result button to finish before replacing
// its node. This also handles a cancelled gesture without leaving input pending.
document.addEventListener('click',finishResultPointer);
document.addEventListener('pointerup',()=>setTimeout(finishResultPointer,0));
document.addEventListener('pointercancel',finishResultPointer);
document.addEventListener('focusout',e=>{if(e.target.id==='people'){if(resultPointerDown)pendingPeopleValue=e.target.value;else commitPeople(e.target.value);}});
document.addEventListener('keydown',e=>{if(e.target.id==='people'&&e.key==='Enter'&&!e.isComposing){e.preventDefault();commitPeople(e.target.value);e.target.blur();}});
document.addEventListener('input',e=>{if(e.target.dataset.note){const v=saved.find(v=>v.key===e.target.dataset.note);if(v){v.note=e.target.value;persist();}}});
$('#detail').addEventListener('close',()=>{dialogSlot=null;});
window.addEventListener('storage',e=>{if(e.key===STORAGE){try{const next=JSON.parse(e.newValue||'[]');if(Array.isArray(next)){saved=next.filter(v=>v&&catalog?.byCode.has(v.code)&&typeof v.key==='string'&&validDate(v.start,2027)&&validDate(v.end,2027));render();}}catch{}}});
// No service worker. Re-fetch the tiny status file on return and every five visible minutes.
function onReturn(){if(document.visibilityState==='visible'&&Date.now()-lastRefresh>60000)refreshStatus();}
document.addEventListener('visibilitychange',onReturn);window.addEventListener('pageshow',onReturn);
setInterval(()=>{if(document.visibilityState==='visible')refreshStatus();},300000);
try{const response=await fetch('./data/national-youth-facilities-2027.json',{cache:'no-cache'});if(!response.ok)throw Error(`HTTP ${response.status}`);catalog=catalogFrom(await response.json());await refreshStatus();}
catch(error){console.error(error);$('#main').innerHTML='<div class="empty"><h2>기본 일정 파일을 불러오지 못했습니다.</h2><p>잠시 후 페이지를 새로고침해 주세요. 운영자는 data 폴더가 함께 업로드되었는지 확인해 주세요.</p></div>';$('#asof').textContent='일정 정보 확인 불가';}
