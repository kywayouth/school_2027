// Shared viewer for the original, locally bundled facility photos.
export function setupPhotoViewer(doc, photosMap){
  if(doc.getElementById('activity-photo-viewer'))return;
  function element(tag,options={}){
    const node=doc.createElement(tag);
    if(options.className)node.className=options.className;
    if(options.text)node.textContent=options.text;
    for(const [name,value] of Object.entries(options.attrs||{}))node.setAttribute(name,value);
    return node;
  }
  const dialog=element('dialog',{className:'activity-photo-viewer',attrs:{id:'activity-photo-viewer','aria-labelledby':'activity-photo-title'}});
  const heading=element('div',{className:'activity-photo-heading'});
  const title=element('h2',{attrs:{id:'activity-photo-title'}});
  const close=element('button',{text:'닫기 ×',attrs:{type:'button','data-photo-close':'','aria-label':'활동사진 닫기',autofocus:''}});
  const stage=element('div',{className:'activity-photo-stage'});
  const image=element('img');
  image.decoding='async';
  const toolbar=element('div',{className:'activity-photo-toolbar'});
  const previous=element('button',{text:'‹ 이전',attrs:{type:'button','data-photo-prev':'','aria-label':'이전 사진'}});
  const next=element('button',{text:'다음 ›',attrs:{type:'button','data-photo-next':'','aria-label':'다음 사진'}});
  const counter=element('p',{attrs:{role:'status','aria-live':'polite','aria-atomic':'true'}});
  heading.append(title,close);stage.append(image);toolbar.append(previous,counter,next);
  dialog.append(heading,stage,toolbar);doc.body.append(dialog);
  let opener=null,facility='',index=0,photos=[];
  const isPhoto=(photo,id)=>photo&&typeof photo.src==='string'
    &&new RegExp(`^\\./assets/programs/${id}-activity-[1-9]\\d*\\.jpg$`).test(photo.src)
    &&Number.isInteger(photo.width)&&photo.width>0&&Number.isInteger(photo.height)&&photo.height>0;
  function render(){
    const photo=photos[index];
    image.src=photo.src;
    image.alt=typeof photo.alt==='string'?photo.alt:'';
    image.width=photo.width;image.height=photo.height;
    image.style.width=`${photo.width*2}px`;
    counter.textContent=`${index+1} / ${photos.length}`;
    previous.disabled=index===0;next.disabled=index===photos.length-1;
  }
  function move(amount){
    const candidate=index+amount;
    if(candidate<0||candidate>=photos.length)return;
    index=candidate;render();
  }
  doc.addEventListener('click',event=>{
    const trigger=event.target?.closest?.('[data-open-photo]');
    if(!trigger||dialog.open)return;
    const id=trigger.dataset.openPhoto,rawIndex=trigger.dataset.photoIndex;
    if(typeof id!=='string'||!/^[a-z]+$/.test(id)||!Object.hasOwn(photosMap,id)||!/^(0|[1-9]\d*)$/.test(rawIndex||''))return;
    const items=photosMap[id],selected=Number(rawIndex);
    if(!Array.isArray(items)||!items.length||!Number.isSafeInteger(selected)||selected>=items.length||!items.every(photo=>isPhoto(photo,id)))return;
    event.preventDefault?.();
    opener=trigger;facility=id;index=selected;photos=items;
    title.textContent=`${trigger.dataset.photoFacility||id} 활동사진`;
    render();dialog.showModal();doc.body.classList.add('photo-viewer-open');
  });
  dialog.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-photo-close]')){dialog.close();return;}
    if(event.target?.closest?.('[data-photo-prev]')){move(-1);return;}
    if(event.target?.closest?.('[data-photo-next]')){move(1);return;}
    if(event.target===dialog){
      const rect=dialog.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
    }
  });
  dialog.addEventListener('keydown',event=>{
    if(!dialog.open||event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();move(event.key==='ArrowLeft'?-1:1);
    }
  });
  dialog.addEventListener('close',()=>{
    doc.body.classList.remove('photo-viewer-open');
    const originalIndex=opener?.dataset.photoIndex;
    const fallback=[...doc.querySelectorAll('[data-open-photo]')].find(button=>button.dataset.openPhoto===facility&&button.dataset.photoIndex===originalIndex);
    (opener?.isConnected?opener:fallback)?.focus({preventScroll:true});
  });
}
