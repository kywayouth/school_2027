// Timetables use both numbered activity rows and activity names as categories.
// Match the displayed text so routine descriptions keep their normal styling.
export function isMainActivity(event, activities = []) {
  if (/^활동\s*\d+$/.test(event.category ?? '')) return true;
  const compact = value => String(value ?? '').replace(/\s+/g, '');
  const displayed = compact(event.detail || event.category);
  return activities.some(activity => {
    const name = compact(activity.name);
    return name.length > 0 && displayed.includes(name);
  });
}

const escapeText = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

// These source labels describe learning themes, not additional programs/groups.
const ACTIVITY_TOPICS = new Set([
  '생태탐구', '생태감성', '생태실천', '지식·협동', '사회성',
  '숙련도·탐구', '탐험·호기심', '예술·미래기술', '교양', '공감'
]);

export function timetableCellMarkup(event, activities = []) {
  const text = String(event.detail || event.category || '');
  const emphasized = name => `<strong class="timetable-activity">${escapeText(name)}</strong>`;
  if (!isMainActivity(event, activities)) return escapeText(text);
  if (!text.includes('|')) return emphasized(text);

  const items = [], topics = [], notes = [];
  let choiceGroups = false, individualChoice = false;
  for (const part of text.split('|').map(value => value.trim()).filter(Boolean)) {
    const compact = part.replace(/\s+/g, '');
    if (compact === '선택형분반프로그램') {
      choiceGroups = true;
      notes.push(part);
    } else if (/^\*?개인선택형활동\(택1\)$/.test(compact)) {
      individualChoice = true;
      notes.push(part);
    } else if (ACTIVITY_TOPICS.has(compact)) {
      topics.push(part);
    } else {
      items.push(part);
    }
  }

  // Keep unexpected metadata-only rows intact rather than silently dropping text.
  if (!items.length) return emphasized(text);
  const topicMarkup = topics.length
    ? `<span class="timetable-topic">활동 주제: ${topics.map(escapeText).join(' / ')}</span>` : '';
  if (items.length === 1 && !choiceGroups && !individualChoice) {
    return `${topicMarkup}${emphasized(items[0])}`;
  }
  // A few source rows also carry an activity name in category. Keep that context
  // visible without treating a flattened detail list as an exact group count.
  const namedCategory = event.detail && !/^활동\s*\d+$/.test(event.category ?? '')
    && isMainActivity({ category: event.category }, activities);
  const isParallel = !choiceGroups && !individualChoice && !namedCategory;
  const heading = individualChoice ? '개인 선택형 · 택1'
    : choiceGroups ? '선택형 분반 운영'
    : namedCategory ? '동시간대 · 그룹별 진행' : `동시간대 · ${items.length}개 그룹으로 나누어 진행`;
  const contextMarkup = namedCategory
    ? `<span class="timetable-context">활동 구분: ${escapeText(event.category)}</span>` : '';
  const noteMarkup = notes.length
    ? `<p class="timetable-group-note">${notes.map(escapeText).join(' · ')}</p>` : '';
  return `<div class="timetable-groups">
    <p class="timetable-group-heading">${heading}</p>${contextMarkup}${topicMarkup}
    <ul class="timetable-group-list" style="--activity-columns:${Math.min(items.length, 3)}">
      ${items.map((name, index) => `<li>${isParallel ? `<span class="group-label">그룹 ${index + 1}</span>` : ''}${emphasized(name)}</li>`).join('')}
    </ul>${noteMarkup}
  </div>`;
}
