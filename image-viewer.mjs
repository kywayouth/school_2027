// Self-contained viewer for the supplied partnership poster. No remote assets.
export function setupPartnershipViewer(doc){
  if(doc.getElementById('partnership-viewer'))return;
  const dialog=doc.createElement('dialog');
  dialog.id='partnership-viewer';
  dialog.className='image-viewer';
  dialog.setAttribute('aria-labelledby','partnership-viewer-title');
  dialog.innerHTML=`<div class="image-viewer-heading"><h2 id="partnership-viewer-title">경주월드 제휴할인 안내</h2><button type="button" data-image-close aria-label="확대 이미지 닫기" autofocus>닫기 ×</button></div>
    <div class="image-viewer-toolbar" aria-label="이미지 크기 조절"><button type="button" data-image-zoom="out" aria-label="이미지 축소">− 축소</button><button type="button" data-image-zoom="fit">화면에 맞추기</button><button type="button" data-image-zoom="in" aria-label="이미지 확대">+ 확대</button><output aria-live="polite" aria-label="화면 맞춤 대비 확대 비율">100%</output><a href="./assets/programs/marine-gyeongju-world.png" target="_blank" rel="noopener">원본 보기 ↗</a></div>
    <p class="image-viewer-hint" id="image-viewer-hint">확대 후 화면을 위아래·좌우로 움직여 내용을 확인하세요.</p>
    <div class="image-viewer-viewport" tabindex="0" aria-label="제휴할인 안내 이미지" aria-describedby="image-viewer-hint"><div class="image-viewer-canvas"><img src="./assets/programs/marine-gyeongju-world.png" width="592" height="673" alt="국립청소년해양센터와 경주월드 제휴할인 안내문" decoding="async"></div></div>`;
  doc.body.append(dialog);
  const viewport=dialog.querySelector('.image-viewer-viewport');
  const canvas=dialog.querySelector('.image-viewer-canvas');
  const image=dialog.querySelector('img');
  const output=dialog.querySelector('output');
  const zoomOut=dialog.querySelector('[data-image-zoom="out"]');
  const zoomIn=dialog.querySelector('[data-image-zoom="in"]');
  let zoom=1,opener=null;
  function resize(resetScroll=false){
    const width=image.naturalWidth||592,height=image.naturalHeight||673;
    const fit=Math.min(Math.max(1,viewport.clientWidth-24)/width,Math.max(1,viewport.clientHeight-24)/height,1.5);
    const displayWidth=Math.round(width*fit*zoom),displayHeight=Math.round(height*fit*zoom);
    const centerX=(viewport.scrollLeft+viewport.clientWidth/2)/(canvas.clientWidth||1);
    const centerY=(viewport.scrollTop+viewport.clientHeight/2)/(canvas.clientHeight||1);
    image.style.width=`${displayWidth}px`;image.style.height=`${displayHeight}px`;
    canvas.style.width=`${Math.max(viewport.clientWidth,displayWidth+24)}px`;
    canvas.style.height=`${Math.max(viewport.clientHeight,displayHeight+24)}px`;
    output.textContent=`${Math.round(zoom*100)}%`;
    zoomOut.disabled=zoom<=1;zoomIn.disabled=zoom>=4;
    viewport.scrollLeft=resetScroll?0:centerX*canvas.clientWidth-viewport.clientWidth/2;
    viewport.scrollTop=resetScroll?0:centerY*canvas.clientHeight-viewport.clientHeight/2;
  }
  doc.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-open-partnership]');if(!trigger)return;
    opener=trigger;zoom=1;dialog.showModal();doc.body.classList.add('image-viewer-open');resize(true);
  });
  dialog.addEventListener('click',event=>{
    if(event.target.closest('[data-image-close]')){dialog.close();return;}
    const action=event.target.closest('[data-image-zoom]')?.dataset.imageZoom;
    if(action){zoom=action==='fit'?1:Math.max(1,Math.min(4,zoom+(action==='in'?0.5:-0.5)));resize(action==='fit');}
    if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}
  });
  dialog.addEventListener('close',()=>{doc.body.classList.remove('image-viewer-open');(opener?.isConnected?opener:doc.querySelector('[data-open-partnership]'))?.focus({preventScroll:true});});
  image.addEventListener('load',()=>{if(dialog.open)resize(true);});
  doc.defaultView?.addEventListener('resize',()=>{if(dialog.open)resize();});
}
