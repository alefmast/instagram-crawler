const STOP = new Set(['the','and','for','with','from','this','that','instagram','official','page','پست','اینستاگرام']);
function normalize(s=''){return s.toLocaleLowerCase().replace(/[\u200c]/g,' ').replace(/[^\p{L}\p{N}_#@]+/gu,' ').trim();}
function terms(q){return normalize(q).split(/\s+/).filter(Boolean).filter(x=>!STOP.has(x));}
export function rankResults(results, query){
  const q=normalize(query), ts=terms(query), accountQuery=query.trim().startsWith('@'), hashQuery=query.trim().startsWith('#');
  return results.map(item=>{
    const text=normalize([item.title,item.snippet,item.account].filter(Boolean).join(' '));
    const url=normalize(item.url); let score=0; const matched=[];
    if(accountQuery){const a=normalize(query);if(normalize(item.account)===a){score+=100;matched.push('account-exact')}else if(text.includes(a.replace('@',''))){score+=30;matched.push('account-partial')}else score-=80;}
    else if(hashQuery){const h=q.replace(/^#/,'');if(text.includes(h)){score+=55;matched.push('hashtag-text')}if(url.includes(`/explore/tags/${h}`)){score+=70;matched.push('hashtag-url')}if(url.includes('/reel/'))score+=5;}
    else {for(const t of ts){if(text.includes(t)){score+=20;matched.push(t)}if(normalize(item.account).includes(t))score+=35;if(url.includes('/p/')||url.includes('/reel/'))score+=4;}}
    if(item.kind==='profile'&&!accountQuery)score-=5;
    if(ts.length>1&&ts.every(t=>text.includes(t)))score+=25;
    return {...item,score,matchedTerms:[...new Set(matched)]};
  }).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score);
}
