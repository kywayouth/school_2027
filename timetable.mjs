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

// Compatibility for older marine timetable text saved before the final PDF.
// The current source uses pipe-separated simultaneous groups directly.
function marineParallelItems(text, programId) {
  if (!String(programId).startsWith('marine-') || !/[（(]\s*택\s*[1１]\s*[)）]\s*$/.test(text)) return null;
  const body = text.replace(/[（(]\s*택\s*[1１]\s*[)）]\s*$/, '');
  const items = [];
  let depth = 0, start = 0;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character === '(' || character === '（') depth += 1;
    else if (character === ')' || character === '）') depth = Math.max(0, depth - 1);
    else if ((character === ',' || character === '，') && depth === 0) {
      items.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }
  items.push(body.slice(start).trim());
  const names = items.filter(Boolean);
  return names.length > 1 ? names : null;
}

// Use explicit clock bounds before the extracted duration, which is inconsistent
// in a few source rows. Overnight bounds (e.g. 23:00–07:00 sleep) end next day.
// An open-ended clock range never gains a guessed boundary from adjacent rows.
export function timetableDurationLabel(event) {
  const clockMinutes = value => {
    if (typeof value !== 'string') return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const hours = Number(match[1]), minutes = Number(match[2]);
    return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
  };
  const start = clockMinutes(event?.time?.start), end = clockMinutes(event?.time?.end);
  if (start !== null && end !== null && start !== end) {
    return `${end > start ? end - start : end + 24 * 60 - start}분`;
  }
  const explicit = event?.durationMinutes;
  return Number.isInteger(explicit) && explicit > 0 && explicit <= 24 * 60 ? `${explicit}분` : '—';
}

export function timetableCellMarkup(event, activities = [], programId = '') {
  const text = String(event.detail || event.category || '');
  const emphasized = name => `<strong class="timetable-activity">${escapeText(name)}</strong>`;
  if (!isMainActivity(event, activities)) return escapeText(text);
  const marineItems = marineParallelItems(text, programId);
  if (marineItems) return `<div class="timetable-groups">
    <p class="timetable-group-heading">동시간대 · ${marineItems.length}개 그룹으로 나누어 진행</p>
    <ul class="timetable-group-list" style="--activity-columns:${Math.min(marineItems.length, 3)}">
      ${marineItems.map((name, index) => `<li><span class="group-label">그룹 ${index + 1}</span>${emphasized(name)}</li>`).join('')}
    </ul>
  </div>`;
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
