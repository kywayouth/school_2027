// Check for a newer page without interrupting reading or editing.
const instances=new WeakMap();
const validVersion=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value);

export function readSiteVersion(html,Parser){
  try{
    const parsed=new Parser().parseFromString(html,'text/html');
    const version=parsed.querySelector('meta[name="site-version"]')?.getAttribute('content');
    const source=parsed.querySelector('script[type="module"][src]')?.getAttribute('src');
    if(!validVersion(version)||!source?.startsWith('./app.mjs?'))return null;
    const entry=new URL(source,'https://version.invalid/');
    return entry.searchParams.get('v')===version?version:null;
  }catch{return null;}
}

export function setupSiteUpdate(doc,win=doc.defaultView){
  if(instances.has(doc))return instances.get(doc);
  const currentVersion=doc.querySelector('meta[name="site-version"]')?.getAttribute('content');
  const banner=doc.getElementById('site-update'),button=doc.getElementById('site-update-reload');
  if(!validVersion(currentVersion)||!banner||!button||!win)return null;
  let latestVersion=null,lastCheck=-Infinity,inFlight=null,disposed=false,requestAbort=null,requestTimeout=null;
  banner.hidden=true;
  function check(force=false){
    if(disposed||(!force&&doc.visibilityState==='hidden'))return Promise.resolve();
    if(inFlight)return inFlight;
    if(!force&&win.Date.now()-lastCheck<60000)return Promise.resolve();
    lastCheck=win.Date.now();
    const url=new URL('./index.html',win.location.href);
    url.searchParams.set('_site_check',`${lastCheck}-${Math.random().toString(36).slice(2)}`);
    inFlight=(async()=>{
      try{
        requestAbort=new AbortController();
        requestTimeout=setTimeout(()=>requestAbort?.abort(),12000);
        const response=await win.fetch(url,{cache:'no-store',signal:requestAbort.signal});
        if(!response.ok)return;
        const candidate=readSiteVersion(await response.text(),win.DOMParser);
        if(disposed||!candidate)return;
        latestVersion=candidate===currentVersion?null:candidate;
        banner.hidden=!latestVersion;
      }catch{
        // Offline or a partial deployment is not evidence of a new version.
      }
    })().finally(()=>{clearTimeout(requestTimeout);requestTimeout=null;requestAbort=null;inFlight=null;});
    return inFlight;
  }
  function showNewPage(){
    if(disposed||!latestVersion)return;
    const url=new URL(win.location.href);
    url.searchParams.set('_site_update',`${latestVersion}-${win.Date.now()}`);
    win.location.replace(url.href);
  }
  const onReturn=()=>{void check();};
  const onManual=()=>{void check(true);};
  button.addEventListener('click',showNewPage);
  const refresh=doc.getElementById('refresh');
  refresh?.addEventListener('click',onManual);
  doc.addEventListener('visibilitychange',onReturn);
  win.addEventListener('pageshow',onReturn);
  win.addEventListener('focus',onReturn);
  const timer=win.setInterval(onReturn,300000);
  const controller={check,dispose(){
    disposed=true;win.clearInterval(timer);requestAbort?.abort();clearTimeout(requestTimeout);
    button.removeEventListener('click',showNewPage);
    refresh?.removeEventListener('click',onManual);
    doc.removeEventListener('visibilitychange',onReturn);
    win.removeEventListener('pageshow',onReturn);
    win.removeEventListener('focus',onReturn);
    instances.delete(doc);
  }};
  instances.set(doc,controller);
  void check(true);
  return controller;
}