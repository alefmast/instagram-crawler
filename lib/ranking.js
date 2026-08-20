const STOP = new Set(['the','and','for','with','from','this','that','instagram','official','page','پست','اینستاگرام']);
const GENERIC = new Set(['official','page','profile','instagram','insta','music','video']);
function normalize(s=''){return s.toLocaleLowerCase().replace(/[\u200c]/g,' ').replace(/[^\p{L}\p{N}_#@]+/gu,' ').replace(/\s+/g,' ').trim();}
function terms(q){return normalize(q).split(/\s+/).filter(Boolean).filter(x=>!STOP.has(x));}
function tokenMatch(text,t){return text===t||text.split(' ').some(x=>x===t);}
export function rankResults(results,query){
 const raw=query.trim(),q=normalize(raw),ts=terms(raw),accountQuery=raw.startsWith('@'),hashQuery=raw.startsWith('#');
 return results.map(item=>{
  const title=normalize(item.title),snippet=normalize(item.snippet),account=normalize(item.account),url=normalize(item.url),text=[title,snippet,account].filter(Boolean).join(' ');
  let score=0;const matched=[];
  if(accountQuery){const a=q;if(account===a){score=150;matched.push('account-exact');}else if(account.includes(a.slice(1))){score=45;matched.push('account-partial');}else score=-100;}
  else if(hashQuery){const h=q.slice(1);if(url.includes(`/explore/tags/${h}`)){score+=150;matched.push('hashtag-url');}if(tokenMatch(text,h)){score+=80;matched.push('hashtag-exact');}else if(text.includes(h)){score+=25;matched.push('hashtag-partial');}if(item.kind==='reel')score+=5;}
  else {for(const t of ts){if(tokenMatch(account,t)){score+=60;matched.push(`account:${t}`);}if(tokenMatch(title,t)){score+=35;matched.push(`title:${t}`);}else if(title.includes(t)){score+=12;matched.push(`title-partial:${t}`);}if(tokenMatch(snippet,t)){score+=25;matched.push(`snippet:${t}`);}if(url.includes('/p/')||url.includes('/reel/'))score+=2;}if(ts.length>1&&ts.every(t=>tokenMatch(text,t)))score+=35;if(ts.length===1&&GENERIC.has(ts[0]))score-=15;}
  if(item.kind==='profile'&&!accountQuery)score-=3;
  return {...item,score,matchedTerms:[...new Set(matched)]};
 }).filter(x=>x.score>=20).sort((a,b)=>b.score-a.score||String(a.url).localeCompare(String(b.url)));
}
