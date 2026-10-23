const test=require('node:test'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
global.crypto=webcrypto;
const R=require('../app/src/main/assets/core.js'),E=require('../app/src/main/assets/vendor/ethers-5.8.0.min.js');
test('decimal amounts retain all 18 decimal places and reject ambiguous input',()=>{
 assert.equal(R.amount('123456789.123456789123456789').toString(),'123456789123456789123456789');
 for(const x of ['0','-1','1e6','1,000','1.2.3','Infinity',''])assert.throws(()=>R.amount(x));
 assert.equal(R.amount('1.25',6).toString(),'1250000');
});
test('display never rounds tiny balances into an apparently available spendable amount',()=>{
 assert.equal(R.display(E.BigNumber.from(1)),'<0.000001');assert.equal(R.display(E.utils.parseEther('1000.123456789')),'1,000.123456');
});
test('recipient validation and slippage minimum output',()=>{
 assert.throws(()=>R.address(E.constants.AddressZero));assert.throws(()=>R.address('0x1234'));
 assert.equal(R.minOut(E.BigNumber.from(100000),R.slippage('0.5')).toString(),'99500');
 for(const x of [0,6,NaN,-1])assert.throws(()=>R.slippage(x));
});
test('all configured addresses and contract method encodings are valid',()=>{
 Object.values(R.C).forEach(a=>assert.equal(E.utils.getAddress(a),a));
 for(const abi of [R.ERC20,R.STAKE,R.WRAP,R.ROUTER,R.BRIDGE_HOME,R.BRIDGE_BSC])new E.utils.Interface(abi);
 assert.equal(new E.utils.Interface(R.WRAP).encodeFunctionData('deposit',[]),'0xd0e30db0');
});
test('network verification uses the RPC chain ID, not a configured provider label',async()=>{
 await R.verifyNetwork({send:async()=>E.utils.hexValue(70088)},'rgn');
 await assert.rejects(()=>R.verifyNetwork({send:async()=>'0x38'},'rgn'),/wrong chain/);
});
test('encrypted keystore round trip, wrong password and tamper rejection',async()=>{
 const pk='0x'+'1'.padStart(64,'0'),enc=await R.encrypt(pk,'TEST ONLY password 123');
 assert.equal(enc.iterations,600000);assert.equal(await R.decrypt(enc,'TEST ONLY password 123'),pk);
 await assert.rejects(()=>R.decrypt(enc,'wrong password'));
 const bad={...enc,ct:enc.ct.slice(0,-4)+'AAAA'};await assert.rejects(()=>R.decrypt(bad,'TEST ONLY password 123'));
 await assert.rejects(()=>R.encrypt(pk,'short'));
});
test('old 150k PBKDF2 OGG keystore is readable',async()=>{
 const salt=webcrypto.getRandomValues(new Uint8Array(16)),iv=webcrypto.getRandomValues(new Uint8Array(12));
 const base=await webcrypto.subtle.importKey('raw',new TextEncoder().encode('old-password'),'PBKDF2',false,['deriveKey']);
 const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
 const text='0x'+'2'.padStart(64,'0'),ct=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text));
 const b64=x=>Buffer.from(x).toString('base64');assert.equal(await R.decrypt({salt:b64(salt),iv:b64(iv),ct:b64(ct)},'old-password'),text);
});
test('bridge delivery requires source hash, recipient and exact amount',()=>{
 const entry={sourceHash:'0x'+'12'.repeat(32),owner:'0x'+'34'.repeat(20),amount:'1.234'};
 const event={args:{sourceTxHash:entry.sourceHash,to:entry.owner,amount:E.utils.parseEther(entry.amount)}};
 assert.equal(R.matchesBridge(event,entry),true);
 assert.equal(R.matchesBridge({...event,args:{...event.args,sourceTxHash:'0x'+'56'.repeat(32)}},entry),false);
 assert.equal(R.matchesBridge({...event,args:{...event.args,to:'0x'+'78'.repeat(20)}},entry),false);
 assert.equal(R.matchesBridge({...event,args:{...event.args,amount:E.utils.parseEther('1.235')}},entry),false);
});
test('untrusted token metadata is escaped before rendering',()=>{
 assert.equal(R.escape('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
});
