import {icon} from './icons.mjs?v=44e7b639b2459bdb';
import {setupImageViewer} from './image-viewer.mjs?v=44e7b639b2459bdb';

const FEE_NOTICE='2027년 이용요금은 관계 부처와의 협의 결과에 따라 변경될 수 있습니다.';

export function feesMarkup(){
  return `<section class="fees" aria-labelledby="fees-title">
    <div class="section-heading fees-heading"><h2 id="fees-title" class="heading-with-icon">${icon('info')}<span>이용요금 안내</span></h2></div>
    <div class="fee-notice" aria-label="요금 기준 및 변동 안내">
      <p class="fee-reference"><strong>2026년 기준</strong><span>2027년 이용계획 참고용</span></p>
      <p>2027년 이용계획 수립에 참고하실 수 있도록 2026년 국립청소년시설 이용요금을 안내드립니다.</p>
      <p class="fee-change"><strong>${FEE_NOTICE}</strong></p>
    </div>
    <section class="fee-summary" aria-labelledby="fee-summary-title">
      <h3 id="fee-summary-title">1인 참가비 안내</h3>
      <p class="fee-common">초등학생·중학생·고등학생 요금은 동일합니다.</p>
      <table class="fee-table fee-totals">
        <caption class="sr-only">2026년 기준 학생 및 인솔교사 이용요금 총액</caption>
        <thead><tr><th scope="col">이용 구성</th><th scope="col">학생</th><th scope="col">인솔교사<small class="fee-instructor-note">(안전요원 포함)</small></th></tr></thead>
        <tbody><tr><th scope="row">1박 3식</th><td><strong>77,200<span>원</span></strong></td><td><strong>52,700<span>원</span></strong></td></tr>
        <tr><th scope="row">2박 6식</th><td><strong>154,400<span>원</span></strong></td><td><strong>105,400<span>원</span></strong></td></tr></tbody>
      </table>
    </section>
    <details class="fee-details">
      <summary>세부 요금 보기 <span class="fee-chevron" aria-hidden="true">${icon('arrow-right')}</span></summary>
      <div class="fee-details-body">
        <table class="fee-table fee-breakdown" aria-describedby="fee-empty-note">
          <caption class="sr-only">2026년 기준 항목별 세부 요금</caption>
          <thead><tr><th scope="col">항목</th><th scope="col">기준</th><th scope="col">학생</th><th scope="col">인솔교사<small class="fee-instructor-note">(안전요원 포함)</small></th></tr></thead>
          <tbody><tr><th scope="row">숙박비</th><td>1박</td><td>12,700원</td><td>27,800원</td></tr>
          <tr><th scope="row">식비</th><td>1식</td><td>8,300원</td><td>8,300원</td></tr>
          <tr><th scope="row">청소년활동비</th><td>1일/1인</td><td>33,200원</td><td><span aria-label="별도 금액 기재 없음">—</span></td></tr>
          <tr><th scope="row">시설이용료</th><td>1일/1인</td><td>6,400원</td><td><span aria-label="별도 금액 기재 없음">—</span></td></tr></tbody>
        </table>
        <p id="fee-empty-note" class="fee-empty-note">※ ‘—’는 원본 표에 별도 금액이 기재되지 않은 항목입니다.</p>
      </div>
    </details>
    <div class="fee-source"><button type="button" class="with-icon" data-open-fees aria-haspopup="dialog" aria-controls="fees-viewer">${icon('search')}<span>원본 요금표 크게 보기</span></button></div>
  </section>`;
}

export function setupFeesViewer(doc){
  setupImageViewer(doc,{
    id:'fees-viewer',trigger:'[data-open-fees]',title:'2026년 국립청소년시설 이용요금표',
    src:'./assets/fees/national-youth-facilities-2026.png',width:1038,height:664,
    alt:'2026년 청소년활동 이용요금 원본 표. 초·중·고 공통 요금이며 학생 1박 3식 77,200원, 2박 6식 154,400원, 인솔교사 1박 3식 52,700원, 2박 6식 105,400원. 세부 내역은 이용요금 안내 본문에서 확인할 수 있습니다.',
    notice:FEE_NOTICE,originalLink:false,
  });
}
