const GRAPH_BASE='https://graph.facebook.com/v23.0';

function configured(){ return Boolean(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ID); }
async function graph(path, params={}) {
  const u=new URL(`${GRAPH_BASE}${path}`); Object.entries({...params,access_token:process.env.INSTAGRAM_ACCESS_TOKEN}).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  const r=await fetch(u); const data=await r.json(); if(!r.ok) throw new Error(data?.error?.message||'Instagram Graph API request failed'); return data;
}

export const name='instagram-graph-api';
export function available(){return configured();}
export async function discover({query,limit=20}) {
  if(!configured()) return {results:[],pagesFetched:0,timedOut:false,searchedQueries:[],available:false};
  // Meta's official API is scoped to eligible professional accounts and permissions.
  // Keep this provider opt-in; never expose access tokens to the browser.
  if(query.startsWith('#')) {
    const tag=query.slice(1).trim();
    const found=await graph('/ig_hashtag_search',{user_id:process.env.INSTAGRAM_BUSINESS_ID,q:tag});
    const id=found?.data?.[0]?.id; if(!id) return {results:[],pagesFetched:1,timedOut:false,searchedQueries:['instagram graph hashtag search'],available:true};
    const media=await graph(`/${id}/recent_media`,{user_id:process.env.INSTAGRAM_BUSINESS_ID,fields:'id,caption,media_type,permalink,timestamp',limit});
    return {available:true,pagesFetched:1,searchedQueries:['instagram graph hashtag recent_media'],results:(media.data||[]).map(x=>({title:x.caption?.slice(0,220)||'Instagram media',snippet:x.caption||'',url:x.permalink,account:'',kind:String(x.media_type||'').toLowerCase()==='video'?'reel':'post',source:'Instagram Graph API'}))};
  }
  return {available:true,pagesFetched:0,timedOut:false,searchedQueries:[],results:[],note:'Official Graph API provider currently supports hashtag discovery here; general keyword search is intentionally not fabricated.'};
}
