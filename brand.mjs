// Service copy comes from the existing program catalogue. Character poses are
// illustrative official artwork, not promises that an activity is offered.
export const BRAND_ASSETS = {
  agency: './assets/brand/logos/agency.webp',
  hero: './assets/brand/characters/hero.webp'
};
export const FACILITY_BRAND = {
  central: {description:'소통과 협동, 도전의 경험으로 함께 성장하는 시간'},
  pyeongchang: {description:'자연 속에서 함께 도전하고, 관계를 넓히는 시간'},
  space: {description:'로켓과 별, 우주인 체험으로 우주과학을 탐구하는 시간'},
  bio: {description:'생명과 바이오를 탐구하고, 함께하는 즐거움을 발견하는 시간'},
  marine: {description:'바다와 선박, 해양안전을 체험하며 더 넓게 배우는 시간'},
  future: {description:'환경 문제를 탐구하고, 지속가능한 미래를 생각하는 시간'},
  ecology: {description:'을숙도의 생태를 관찰하고, 자연과의 관계를 배우는 시간'}
};
for (const [id, value] of Object.entries(FACILITY_BRAND)) {
  value.logo = `./assets/brand/logos/${id}.webp`;
  value.character = `./assets/brand/characters/${id}.webp`;
  Object.freeze(value);
}
Object.freeze(FACILITY_BRAND);
