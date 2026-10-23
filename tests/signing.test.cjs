const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../app/src/main/assets/vendor/ethers-5.8.0.min.js'),R=require('../app/src/main/assets/core.js');
function harness(){
 const elements=new Map(),storage=new Map();const noop=()=>{};
 function el(id){if(!elements.has(id))elements.set(id,{hidden:false,innerHTML:'',textContent:'',value:'',dataset:{},classList:{toggle:noop},focus:noop,querySelector:()=>null});return elements.get(id);}
 const document={getElementById:el,querySelectorAll:()=>[],addEventListener:noop,body:{dataset:{},classList:{toggle:noop}},hidden:false};
 const context=vm.createContext({RogueCore:R,ethers:E,document,window:{scrollTo:noop},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>1,clearTimeout:noop,setInterval:noop,console,Map,Date,crypto:require('node:crypto').webcrypto});
 vm.runInContext(fs.readFileSync(require.resolve('../app/src/main/assets/wallet.js'),'utf8'),context);
 vm.runInContext(`S.wallet=new E.Wallet('0x'+'1'.padStart(64,'0'));S.slot={id:'test',name:'Disposable test'};`,context);
 let broadcasts=0,mode='success';
 const p={send:async()=>E.utils.hexValue(mode==='wrong-chain'?56:70088),getGasPrice:async()=>E.BigNumber.from(1e9),estimateGas:async()=>E.BigNumber.from(21000),getTransactionCount:async()=>2,getBalance:async()=>E.utils.parseEther(mode==='low-balance'?'0':'100'),sendTransaction:async raw=>{broadcasts++;if(mode==='network-error')throw Error('timeout');return{hash:E.utils.keccak256(raw)};},waitForTransaction:async()=>{if(mode==='pending')throw Error('timeout');return{status:mode==='revert'?0:1};}};
 context.mockProvider=p;vm.runInContext('providers.rgn=mockProvider',context);
 return {context,storage,broadcasts:()=>broadcasts,mode:v=>mode=v,run:code=>vm.runInContext(code,context)};
}
async function reviewed(h,action){
 const promise=h.run(`transact('rgn',{to:'0x'+'3'.repeat(40),value:E.utils.parseEther('1')},'Test payment')`);
 await new Promise(r=>setImmediate(r));assert.equal(h.broadcasts(),0);
 h.run(action);return promise;
}
test('review is required and signed broadcast is persisted for restart recovery',async()=>{
 const h=harness(),result=await reviewed(h,'actions.approveReview()');assert.equal(h.broadcasts(),1);
 assert.equal(JSON.parse(h.storage.get('rogueActivity_v3'))[0].status,'confirmed');assert.ok(result.hash);
});
test('cancelling and locking a pending review send nothing',async()=>{
 for(const action of ['closeReview()','lock()']){const h=harness();await assert.rejects(()=>reviewed(h,action),/cancelled|locked/);assert.equal(h.broadcasts(),0);}
});
test('wrong chain and insufficient gas block signing',async()=>{
 for(const mode of ['wrong-chain','low-balance']){const h=harness();h.mode(mode);await assert.rejects(()=>h.run(`transact('rgn',{to:'0x'+'3'.repeat(40),value:1},'Test')`));assert.equal(h.broadcasts(),0);}
});
test('uncertain broadcast is retained by exact signed hash and never auto-retried',async()=>{
 const h=harness();h.mode('network-error');await assert.rejects(()=>reviewed(h,'actions.approveReview()'),/uncertain/);assert.equal(h.broadcasts(),1);assert.equal(JSON.parse(h.storage.get('rogueActivity_v3'))[0].status,'unknown');
});
test('confirmation timeout remains pending and reverted execution is reported',async()=>{
 const h=harness();h.mode('pending');const result=await reviewed(h,'actions.approveReview()');assert.equal(result.pending,true);assert.equal(JSON.parse(h.storage.get('rogueActivity_v3'))[0].status,'pending');
 const r=harness();r.mode('revert');await assert.rejects(()=>reviewed(r,'actions.approveReview()'),/reverted/);assert.equal(JSON.parse(r.storage.get('rogueActivity_v3'))[0].status,'reverted');
});
