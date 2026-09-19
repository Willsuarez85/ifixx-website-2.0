import fs from 'fs'; import vm from 'vm';
const code = fs.readFileSync(process.argv[2],'utf8');
function store(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
function run(visits,{cookie=''}={}){const ss=store(),ls=store();let out;
 for(const v of visits){const u=new URL('https://x.com'+v);
  const w={sessionStorage:ss,localStorage:ls,location:{pathname:u.pathname,search:u.search}};
  const ctx={window:w,document:{cookie,referrer:''},URLSearchParams,Date,JSON,isFinite,Number,String,decodeURIComponent};
  vm.runInNewContext(code,ctx);out=w.ifixxAttribution.get();}
 return out}
let fail=0;const t=(n,got,exp)=>{const ok=Object.entries(exp).every(([k,v])=>got[k]===v);if(!ok)fail++;console.log(ok?'PASS':'FAIL',n,ok?'':JSON.stringify(got))};
t('astra: google->facebook same session', run(['/deck-repair-south-charlotte?utm_source=google&utm_medium=cpc&utm_campaign=deck&gclid=A','/lp/handyman?utm_source=facebook&utm_medium=social&utm_campaign=handyman']),{gclid:'',utm_campaign:'handyman',utm_source:'facebook',landing_page:'/lp/handyman'});
t('facebook visit with old google cookie', run(['/lp/handyman?utm_source=facebook&utm_campaign=h'],{cookie:'_gcl_aw=GCL.1.A'}),{gclid:'',utm_source:'facebook'});
t('campaign A -> campaign B both google', run(['/a?utm_source=google&utm_campaign=deck&gclid=A&utm_term=x','/b?utm_source=google&utm_campaign=handy&gclid=B']),{gclid:'B',utm_campaign:'handy',utm_term:''});
t('ad click then internal nav keeps set', run(['/a?utm_source=google&utm_campaign=deck&gclid=A','/contact']),{gclid:'A',utm_campaign:'deck',landing_page:'/a'});
t('no params, cookie only (auto-tag handled by gtag)', run(['/contact'],{cookie:'_gcl_aw=GCL.1.C'}),{gclid:'C'});
const fresh='_gcl_aw=GCL.'+Math.floor(Date.now()/1000+5)+'.C';
t('auditor: new google campaign without gclid does NOT inherit an old cookie click', run(['/lp/handyman?utm_source=google&utm_campaign=nueva'],{cookie:'_gcl_aw=GCL.1.A'}),{gclid:'',utm_campaign:'nueva'});
t('google paid utm without gclid uses the cookie written on that same visit', run(['/a?utm_source=google&utm_medium=cpc&utm_campaign=deck'],{cookie:fresh}),{gclid:'C',utm_campaign:'deck'});
t('google business profile link (organic) never takes the ads cookie', run(['/?utm_source=google&utm_medium=organic&utm_campaign=gbp'],{cookie:fresh}),{gclid:'',utm_campaign:'gbp'});
t('google_ads and adwords sources still accept a same-visit cookie', run(['/a?utm_source=adwords&utm_campaign=x'],{cookie:fresh}),{gclid:'C'});
t('bing visit with google cookie present', run(['/a?utm_source=bing&utm_medium=cpc'],{cookie:fresh}),{gclid:''});
t('gbraid click ignores old cookie', run(['/a?gbraid=G1'],{cookie:'_gcl_aw=GCL.1.C'}),{gclid:'',gbraid:'G1'});
process.exit(fail?1:0)
