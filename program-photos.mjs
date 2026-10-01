// Original JPEGs extracted without alteration from the supplied final PDF.
// Captions describe the visible scene, not an inferred program/course name.
// Low-resolution originals are intentionally not upscaled or AI-enhanced.
const photo = (facility, number, caption, sourcePage, width, height) => ({
  src: `./assets/programs/${facility}-activity-${number}.jpg`,
  alt: caption,
  caption,
  sourcePage,
  width,
  height,
});

export const PROGRAM_PHOTOS = {
  central: [
    photo('central', 1, '야외 인공암벽을 오르는 참가자', 2, 227, 170),
    photo('central', 2, '강당 무대와 객석의 참가자들', 2, 227, 170),
    photo('central', 3, '야외에서 활을 쏘는 참가자', 2, 227, 170),
    photo('central', 4, '체육관에서 함께하는 단체 활동', 2, 227, 170),
  ],
  pyeongchang: [
    // PDF image-object names sort differently from the visual left-to-right order.
    photo('pyeongchang', 2, '잔디밭에서 함께하는 야외 활동', 8, 227, 167),
    photo('pyeongchang', 3, '공을 이용한 실내 협동 활동', 8, 227, 173),
    photo('pyeongchang', 4, '실내 모험시설에서 균형을 잡는 참가자', 8, 227, 170),
    photo('pyeongchang', 1, '야외 모험시설에서 체험하는 참가자', 8, 227, 166),
  ],
  space: [
    photo('space', 1, '돔형 상영관에서 영상을 관람하는 참가자들', 14, 224, 153),
    photo('space', 2, '구형 지구 영상을 살펴보는 참가자들', 14, 144, 98),
    photo('space', 3, '실내 과학 체험에 참여하는 모습', 14, 224, 153),
    photo('space', 4, '망원경과 함께한 참가자들', 14, 144, 98),
  ],
  bio: [
    photo('bio', 1, '큰 공을 함께 들어 올리는 단체 활동', 20, 245, 158),
    photo('bio', 2, '그릇과 재료를 이용한 실내 체험', 20, 153, 104),
    photo('bio', 3, '강당에서 함께하는 단체 활동', 20, 248, 161),
    photo('bio', 4, '야외에서 식물을 살펴보는 참가자들', 20, 151, 103),
  ],
  marine: [
    photo('marine', 1, '실내 수조에서 구명장비를 이용한 활동', 26, 748, 512),
    photo('marine', 2, '구명조끼를 입고 바다에서 노를 젓는 참가자들', 26, 748, 512),
    photo('marine', 3, '바다를 따라 이어진 길을 걷는 참가자들', 26, 748, 512),
    photo('marine', 4, '해안에서 쌍안경으로 관찰하는 참가자', 26, 748, 512),
  ],
  future: [
    photo('future', 1, '지구 그림과 환경 메시지를 담은 활동 결과물', 33, 144, 98),
    photo('future', 2, '실내 체험장비를 살펴보는 참가자들', 33, 144, 98),
    photo('future', 3, '촬영 장비와 화면이 있는 실내 활동 공간', 33, 144, 98),
    photo('future', 4, '자연광이 들어오는 실내 체험 공간', 33, 144, 98),
  ],
  ecology: [
    photo('ecology', 1, '국립청소년생태센터 건물 전경', 39, 144, 98),
    photo('ecology', 2, '수중 생태를 표현한 전시 화면', 39, 144, 98),
    photo('ecology', 3, '식물과 나무로 구성된 실내 전시 공간', 39, 144, 98),
    photo('ecology', 4, '생태 관련 자료가 진열된 전시 공간', 39, 144, 98),
  ],
};

export const PROGRAM_PHOTO_SOURCE_NOTE = '최종 프로그램 안내문에 수록된 활동·시설 사진입니다. 사진은 이해를 돕기 위한 예시이며 실제 운영 내용은 시설과 협의해 주세요.';
