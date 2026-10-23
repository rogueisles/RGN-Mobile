/* Rogue Wallet 3.0.0 — packaged application code, never remotely loaded. */
/* global ethers, RogueCore, qrcode */
'use strict';
const R=RogueCore,E=ethers,$=id=>document.getElementById(id),esc=R.escape;
const S={wallet:null,slot:null,page:'welcome',net:'rgn',balances:{},stake:null,pool:null,health:{},busy:false,session:0,generated:null,review:null,lastTouch:Date.now()};
const STORAGE={wallets:'rogueWallets_v3',tokens:'rogueTokens_v3',history:'rogueActivity_v3',bridges:'rogueBridges_v3'};
function read(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value));}
function slots(){return read(STORAGE.wallets);}
function assets(){return R.DEFAULT_ASSETS.concat(read(STORAGE.tokens).filter(a=>a&&R.NETWORKS[a.net]&&E.utils.isAddress(a.address)&&Number.isInteger(a.decimals)&&a.decimals>=0&&a.decimals<=36));}
function asset(id){const a=assets().find(a=>a.id===id);if(!a)throw Error('Asset is unavailable.');return a;}
function short(a){return a?a.slice(0,8)+'…'+a.slice(-6):'—';}
function btn(label,action,cls='',data=''){return `<button type="button" class="${cls}" data-action="${action}" ${data}>${label}</button>`;}
function field(label,id,placeholder='',type='text',value=''){return `<label class="field"><span>${label}</span><input id="${id}" type="${type}" placeholder="${placeholder}" value="${esc(value)}" ${type==='password'?'autocomplete="off"':''} ${type==='text'?'spellcheck="false"':''}></label>`;}
function amountField(label,id='amount'){return `<label class="field"><span>${label}</span><div class="max-row"><input class="amount-input" id="${id}" inputmode="decimal" placeholder="0.00" autocomplete="off">${btn('Max','max','secondary')}</div></label>`;}
function back(to='wallet'){return btn('← Back',to,'back');}
function definition(label,value){return `<div class="definition"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;}
function notice(message){$('notice').textContent=String(message).slice(0,240);$('notice').hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>$('notice').hidden=true,6500);}
function error(e){const text=(e&&e.reason)||(e&&e.error&&e.error.message)||(e&&e.message)||String(e);notice(text.replace(/https?:\/\/\S+/g,'RPC').slice(0,220));}
function requireWallet(){if(!S.wallet)throw Error('Unlock your wallet first.');return S.wallet;}
function closeReview(){if(S.review){S.review.resolve(false);S.review=null;}$('review').hidden=true;}
function lock(){
  exportedKey='';
  S.session++;S.wallet=null;S.slot=null;S.generated=null;S.balances={};S.stake=null;S.pool=null;
  closeReview();clearTimeout(exportTimer);navigate('welcome');
}
window.rogueLock=lock;
window.rogueBack=()=>{$('review').hidden?(S.wallet?navigate('wallet'):navigate('welcome')):closeReview();};
function checkSession(session){if(session!==S.session||!S.wallet)throw Error('Wallet locked. Review the action again after unlocking.');}
function setTheme(value){document.body.dataset.theme=value;localStorage.setItem('rogueTheme',value);$('themeButton').textContent=value==='dark'?'☀':'☾';}
function navigate(page){
  if(page!=='export'){exportedKey='';clearTimeout(exportTimer);}
  closeReview();if(!S.wallet&&!['welcome','create','import','settings','unlock'].includes(page))page='welcome';
  if(!['create','import'].includes(page))S.generated=null;
  S.page=page;$('navigation').hidden=!S.wallet;$('lockButton').hidden=!S.wallet;document.body.classList.toggle('unlocked',!!S.wallet);
  document.querySelectorAll('[data-page]').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  render();window.scrollTo(0,0);
  if(page==='staking'&&S.wallet)loadStaking().catch(error);
  if(page==='bridge'&&S.wallet)refreshCapacity().catch(error);
}
function render(){
  const pages={welcome:welcomePage,unlock:unlockPage,create:createPage,import:importPage,wallet:walletPage,send:sendPage,receive:receivePage,staking:stakingPage,swap:swapPage,bridge:bridgePage,settings:settingsPage,accounts:accountsPage,export:exportPage,token:tokenPage};
  $('view').innerHTML=(pages[S.page]||welcomePage)();
  if(S.page==='receive'){
    const code=qrcode(0,'M');code.addData(S.wallet.address);code.make();$('receiveQr').innerHTML=code.createSvgTag({cellSize:5,margin:4,scalable:true});
    $('receiveQr').querySelector('svg').setAttribute('aria-label','Receive address QR code');
  }
}
function welcomePage(){
  const list=slots();return `<img class="welcome-mark" src="rogue-mark.svg" alt="Rogue logo"><div class="eyebrow">YOUR NETWORK. IN YOUR HANDS.</div><h1>Your keys.<br><em>Your horizon.</em></h1><p class="intro">A quieter home for your RGN. Send, swap, bridge and stake, with your keys kept on this device.</p>`+
  (list.length?`<section class="card"><h3>Welcome aboard.</h3><p class="section-caption">Choose a wallet to unlock.</p>${list.map(w=>`<button class="asset" data-action="chooseWallet" data-id="${esc(w.id)}"><span class="asset-icon"><img src="rogue-mark.svg" alt=""></span><span class="asset-detail"><span class="asset-symbol">${esc(w.name)}</span><br><span class="asset-name">${short(w.address)}</span></span><span>→</span></button>`).join('')}</section>`:'')+
  btn('Create a wallet','create','full')+btn('Import an existing wallet','import','secondary full')+`<div class="callout">Self-custody means your backup is your recovery. Never share a private key or recovery phrase with anyone.</div><div class="hint">Rogue Network · Chain 70088<br>Moving from OGG Mobile? Import your backed-up private key here. Keep the old app until you verify the address.</div>`;
}
function unlockPage(){const slot=slots().find(w=>w.id===S.unlockId);if(!slot)return welcomePage();return back('welcome')+`<div class="eyebrow">WELCOME BACK</div><h2>${esc(slot.name)}</h2><p class="mono muted">${esc(slot.address)}</p><form data-form="unlock">${field('Wallet password','password','Your encryption password','password')}<button class="full">Unlock wallet</button></form><div class="hint">Your password decrypts the key locally. It is never sent to an RPC service.</div>`;}
function passwordFields(){return field('Wallet name','walletName','My Rogue Wallet')+field('Encryption password · 10+ characters','password','Choose a strong password','password')+field('Confirm password','passwordAgain','Repeat the password','password');}
function createPage(){return back(S.wallet?'accounts':'welcome')+`<div class="eyebrow">A NEW VOYAGE</div><h2>Create your wallet.</h2><p class="intro">Generate a new address on your device. Make a private backup before adding funds.</p>`+(S.generated?`<div class="card"><div class="label">Your new address</div><p class="mono">${S.generated.address}</p><div class="secret" id="generatedSecret">${S.generated.privateKey}</div>${btn('Copy private key','copyGenerated','secondary full')}<div class="hint">Store this key offline. Anyone with it can spend your funds.</div></div><form data-form="create">${passwordFields()}<label class="field check"><input type="checkbox" id="backupCheck">I have safely backed up this private key.</label><button class="full">Encrypt & save wallet</button></form>`:btn('Generate a new wallet','generate','full'));}
function importPage(){return back(S.wallet?'accounts':'welcome')+`<div class="eyebrow">YOUR EXISTING ADDRESS</div><h2>Bring your wallet.</h2><p class="intro">Import a private key, or a standard Ethereum recovery phrase using account 0. No asset transfer is needed.</p><form data-form="import"><label class="field"><span>Private key or recovery phrase</span><textarea id="importSecret" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Enter privately on this device"></textarea></label>${passwordFields()}<button class="full">Import & encrypt</button></form><div class="callout">Before using a recovery phrase, check that the displayed address matches your original wallet. Custom derivation paths are not selected here.</div>`;}
function networkButtons(){return `<div class="network-select">${['rgn','bsc'].map(n=>btn(n==='rgn'?'Rogue Network':'BNB Smart Chain','network',S.net===n?'selected':'',`data-net="${n}"`)).join('')}</div>`;}
function icon(a){return `<span class="asset-icon ${a.net==='bsc'?'bsc':''}">${a.symbol.includes('RGN')?'<img src="rogue-mark.svg" alt="">':esc(a.symbol.slice(0,2))}</span>`;}
function walletPage(){
  const native=asset(S.net+':native'),h=S.health[S.net],balance=S.balances[native.id];
  return `<div class="hero-card card"><div class="hero-top"><div class="eyebrow">${esc(S.slot.name)}</div>${btn('Wallets ↗','accounts','address-short')}</div><button class="address-short" data-action="copyAddress" aria-label="Copy wallet address">${short(S.wallet.address)} ⧉</button><div class="balance">${R.display(balance)} <small>${native.symbol}</small></div><div class="muted hint">${R.NETWORKS[S.net].name}</div><div class="button-row">${btn('↑ Send','send')}${btn('↓ Receive','receive','secondary')}</div></div>${networkButtons()}<div class="hint"><span class="dot ${h&&h.ok?'':'offline'}"></span> ${h&&h.ok?'Connected · Block '+h.height.toLocaleString():'Network unavailable · Tap refresh to retry'}</div><div class="section-heading"><h3>Your assets</h3>${btn('+ Add token','token','text-button')}</div><div class="card compact">${assets().filter(a=>a.net===S.net).map(a=>`<button class="asset" data-action="sendAsset" data-id="${esc(a.id)}">${icon(a)}<span class="asset-detail"><span class="asset-symbol">${esc(a.symbol)}</span><br><span class="asset-name">${esc(a.name)}</span></span><span class="asset-value">${R.display(S.balances[a.id],a.decimals)}<small>${a.net==='rgn'?'ROGUE NETWORK':'BSC'}</small></span></button>`).join('')}</div><div class="section-heading"><h3>Recent activity</h3>${btn('Refresh','refresh','text-button')}</div>${activityHtml()}<a class="link-row" href="${R.NETWORKS[S.net].explorer}/address/${S.wallet.address}">All activity on the explorer <span>↗</span></a>`;
}
function activityHtml(){const rows=read(STORAGE.history).filter(t=>t.owner.toLowerCase()===S.wallet.address.toLowerCase()).slice(0,8);return rows.length?rows.map(t=>`<div class="activity"><b>${esc(t.title)}</b><span class="status">${esc(t.status)}</span> · ${R.NETWORKS[t.net].name}<br><a href="${R.NETWORKS[t.net].explorer}/tx/${esc(t.hash)}">${short(t.hash)} ↗</a></div>`).join(''):'<div class="empty">Your next voyage starts here.<br>Transactions made in this app appear here.</div>';}
function assetOptions(net,id){return assets().filter(a=>!net||a.net===net).map(a=>`<option value="${esc(a.id)}" ${a.id===id?'selected':''}>${esc(a.symbol+' · '+a.name)}</option>`).join('');}
function sendPage(){S.sendId=S.sendId||S.net+':native';const a=asset(S.sendId);return back()+`<div class="eyebrow">MOVE WITH CONFIDENCE</div><h2>Send ${esc(a.symbol)}.</h2><form data-form="send"><label class="field"><span>Asset & network</span><select id="sendAsset">${assetOptions(null,a.id)}</select></label>${field('Recipient address','recipient','0x…')}${amountField('Amount')}<p class="hint">Available: ${R.display(S.balances[a.id],a.decimals)} ${esc(a.symbol)} · Gas in ${R.NETWORKS[a.net].symbol}</p><button class="full">Review payment</button></form><div class="callout">Check the recipient and network. Transactions cannot be reversed once confirmed.</div>`;}
function receivePage(){return back()+`<div class="eyebrow">YOUR PUBLIC ADDRESS</div><h2>Receive ${S.net==='rgn'?'RGN':'on BSC'}.</h2><div class="card"><div class="qr" id="receiveQr"></div><p class="mono">${S.wallet.address}</p>${btn('Copy address','copyAddress','full')}</div><div class="callout">Use ${R.NETWORKS[S.net].name} (chain ${R.NETWORKS[S.net].chainId}). The same address exists on both supported chains, but balances are separate. SOL / SPL deposits are not supported.</div>`;}
function metric(label,value){return `<div class="metric"><span>${label}</span><strong>${esc(value)}</strong></div>`;}
function stakingPage(){const st=S.stake,pool=S.pool;return `<div class="eyebrow">PUT YOUR RGN TO WORK</div><h2>A stake in the horizon.</h2><p class="section-caption">Existing staking contract. Network-funded rewards, with no fixed or guaranteed APR.</p><div class="hero-card card"><div class="eyebrow">YOUR STAKED RGN</div><div class="balance">${st?R.display(st.stakedAmount):'—'} <small>RGN</small></div><p class="muted hint">Pending rewards: ${st?R.display(st.pendingReward):'—'} RGN</p>${btn('Claim rewards','claim','gold full')}</div><div class="metrics">${metric('NETWORK TOTAL STAKED',pool?R.compact(pool.totalStakedOGG):'—')}${metric('COOLDOWN BALANCE',st?R.display(st.cooldownAmount):'—')}</div><div class="card"><h3>Add to your stake</h3><form data-form="stake">${amountField('RGN to stake')}<p class="hint">Wallet balance: ${R.display(S.balances['rgn:native'])} RGN. Max leaves a gas reserve.</p><button class="full">Review stake</button></form></div><div class="card"><h3>Unstake & withdraw</h3><p class="hint">Unstaking starts the contract’s cooldown. Withdraw after it ends.</p><form data-form="unstake">${field('RGN to unstake','unstakeAmount','0.00')}<button class="secondary full">Review unstake</button></form><div class="callout">${st&&st.cooldownAmount.gt(0)?'Cooldown ends: '+new Date(st.cooldownEnd.toNumber()*1000).toLocaleString():'No funds in cooldown.'}</div>${btn('Withdraw available funds','withdraw','secondary full')}${btn('Refresh staking','refreshStaking','text-button full')}</div><a class="link-row" href="${R.NETWORKS.rgn.explorer}/address/${R.C.staking}">View staking contract <span>↗</span></a>`;}
function swapPage(){const options=assetOptions('rgn',S.swapIn||'rgn:native'),out=assetOptions('rgn',S.swapOut||'rgn:'+R.C.wrapped.toLowerCase());return `<div class="eyebrow">DEEPWATER · ROGUE NETWORK</div><h2>Clear routes.<br>Open waters.</h2><p class="section-caption">Exchange on Rogue Network, or wrap RGN 1:1. Existing token contracts keep their on-chain names.</p><form data-form="swap"><div class="card"><label class="field"><span>You pay</span><select id="swapIn">${options}</select></label>${amountField('Amount')}<label class="field"><span>You receive</span><select id="swapOut">${out}</select></label>${field('Slippage tolerance (%)','slippage','0.5','text','0.5')}<button class="full">Get quote & review</button></div></form><div class="callout">Quotes may change. Minimum output is enforced on-chain. Each required token approval is shown for your confirmation.</div><a class="link-row" href="https://swap.rogueisles.com/">Open Deepwater website <span>↗</span></a>`;}
function bridgePage(){const reverse=S.bridgeDirection==='in';return `<div class="eyebrow">DEEPWATER BRIDGE</div><h2>Across open waters.</h2><p class="section-caption">RGN ↔ RGN (Legacy OGG) on BSC. Bridging depends on the existing relayer and available destination capacity.</p><div class="segmented">${btn('RGN → BSC','bridgeDirection',!reverse?'selected':'','data-dir="out"')}${btn('BSC → RGN','bridgeDirection',reverse?'selected':'','data-dir="in"')}</div><form data-form="bridge"><div class="card"><label class="field"><span>${reverse?'Receive on Rogue Network':'Send from Rogue Network'}</span><select id="bridgeAsset"><option value="native">RGN ${reverse?'(unwrap after arrival)':''}</option><option value="wrapped">wRGN</option></select></label>${amountField(reverse?'RGN (Legacy OGG) on BSC':'Amount to bridge')}<div class="hint" id="capacity">Checking destination capacity…</div><button class="full">Review bridge</button></div></form><div class="callout warning">Native RGN may require wrapping first. Every transaction needs your confirmation. Incoming wRGN can be unwrapped after delivery; keep RGN for gas. A source confirmation is not destination delivery.</div><div class="section-heading"><h3>Bridge activity</h3>${btn('Check','checkBridges','text-button')}</div>${bridgeHistory()}`;}
function bridgeHistory(){const entries=read(STORAGE.bridges).filter(t=>t.owner.toLowerCase()===S.wallet.address.toLowerCase());return entries.length?entries.map(t=>`<div class="activity"><b>${esc(t.amount)} RGN · ${t.dir==='out'?'RGN → BSC':'BSC → RGN'}</b><span class="status">${esc(t.status)}</span>${t.sourceHash?`<br><a href="${R.NETWORKS[t.dir==='out'?'rgn':'bsc'].explorer}/tx/${esc(t.sourceHash)}">Source transaction ↗</a>`:''}${t.destinationHash?` · <a href="${R.NETWORKS[t.dir==='out'?'bsc':'rgn'].explorer}/tx/${esc(t.destinationHash)}">Destination ↗</a>`:''}${t.dir==='in'&&t.status==='delivered'&&t.unwrap&&!t.unwrapped?btn('Review unwrap to RGN','bridgeUnwrap','secondary full',`data-id="${t.id}"`):''}</div>`).join(''):'<div class="empty">No bridge transfers from this wallet yet.</div>';}
function settingsPage(){return back(S.wallet?'wallet':'welcome')+`<div class="eyebrow">MAKE IT YOURS</div><h2>Your compass.</h2><div class="card"><h3>Wallet & security</h3>${S.wallet?btn('Manage wallets','accounts','secondary full')+btn('Back up private key','export','secondary full')+btn('Lock now','lock','full'):'<p class="hint">Unlock a wallet to manage its backup.</p>'}${btn('Switch light / dark appearance','theme','secondary full')}<p class="hint">Locks when the app goes into the background or after 5 minutes of inactivity. Android screenshots and backups are disabled.</p></div><div class="card"><h3>Rogue Network</h3><dl>${definition('App version','3.0.0 · Android')}${definition('Chain ID','70088')}${definition('RPC',R.NETWORKS.rgn.rpc)}</dl><a class="link-row" href="https://scan.rogueisles.com">Rogue Explorer ↗</a><a class="link-row" href="https://rogueisles.com/atlas/">Atlas documentation ↗</a><a class="link-row" href="https://swap.rogueisles.com">Deepwater Swap ↗</a><a class="link-row" href="https://github.com/rogueisles/OGG-Mobile">Open source ↗</a></div><div class="callout">RGN is the display name for the existing chain. wRGN and RGN (Legacy OGG) label existing wrapped and BSC tokens; contract addresses have not changed. Solana support is not available.</div>`;}
function accountsPage(){return back()+`<div class="eyebrow">ONE APP. YOUR WALLETS.</div><h2>Your fleet.</h2><div class="card">${slots().map(w=>`<div class="activity"><b>${esc(w.name)}</b><span class="mono">${short(w.address)}</span><div class="button-row">${btn(w.id===S.slot.id?'Active':'Unlock','chooseWallet','secondary',`data-id="${w.id}"`)}${btn('Remove','removeWallet','danger',`data-id="${w.id}"`)}</div></div>`).join('')}</div>${btn('Create another wallet','create','full')}${btn('Import a wallet','import','secondary full')}`;}
function exportPage(){return back('settings')+`<div class="eyebrow">PRIVATE BACKUP</div><h2>Keep your key safe.</h2><p class="intro">Anyone with this key controls this wallet. Enter your password to reveal it for 30 seconds.</p><form data-form="export">${field('Wallet password','password','Encryption password','password')}<button class="danger full">Reveal private key</button></form><div id="exportResult"></div>`;}
function tokenPage(){return back()+`<div class="eyebrow">YOUR TOKEN LIST</div><h2>Add an asset.</h2><form data-form="token"><label class="field"><span>Network</span><select id="tokenNetwork"><option value="rgn">Rogue Network</option><option value="bsc">BNB Smart Chain</option></select></label>${field('Token contract address','tokenAddress','0x…')}<button class="full">Read & add token</button></form><div class="hint">A token’s name and symbol come from its contract. Adding it does not verify its issuer.</div>${read(STORAGE.tokens).map(t=>`<div class="activity"><b>${esc(t.symbol)}</b>${esc(t.name)}${btn('Remove from list','removeToken','text-button full',`data-id="${esc(t.id)}"`)}</div>`).join('')}`;}

// The native transport is asynchronous so a slow RPC cannot freeze scrolling or typing.
let rpcId=0;const rpcWaiters=new Map();
window.rogueRpcResult=(id,raw)=>{const waiter=rpcWaiters.get(id);if(!waiter)return;rpcWaiters.delete(id);clearTimeout(waiter.timer);try{const json=JSON.parse(raw);if(json.error)waiter.reject(Error(json.error.message||json.error));else waiter.resolve(json.result);}catch(e){waiter.reject(e);}};
class WalletProvider extends E.providers.JsonRpcProvider {
  constructor(net){super(R.NETWORKS[net].rpc,{chainId:R.NETWORKS[net].chainId,name:net});this.net=net;}
  send(method,params){
    if(!window.RogueNative)return super.send(method,params);
    const id=String(++rpcId);return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{rpcWaiters.delete(id);reject(Error('RPC timed out. Check transaction status before retrying a payment.'));},45000);
      rpcWaiters.set(id,{resolve,reject,timer});try{window.RogueNative.request(id,R.NETWORKS[this.net].rpc,method,JSON.stringify(params||[]));}catch(e){clearTimeout(timer);rpcWaiters.delete(id);reject(e);}
    });
  }
}
const providers={rgn:new WalletProvider('rgn'),bsc:new WalletProvider('bsc')};
function contract(net,address,abi){return new E.Contract(address,abi,providers[net]);}
async function readBalance(a,owner){return a.address?contract(a.net,a.address,R.ERC20).balanceOf(owner):providers[a.net].getBalance(owner);}
let refreshing=false;
async function refresh(){
  if(refreshing||!S.wallet)return;refreshing=true;const session=S.session,owner=S.wallet.address;
  try{
    await Promise.all(['rgn','bsc'].map(async net=>{
      try{await R.verifyNetwork(providers[net],net);const height=await providers[net].getBlockNumber();S.health[net]={ok:true,height};}
      catch(e){S.health[net]={ok:false};}
    }));
    for(const a of assets()){
      const balance=S.health[a.net]&&S.health[a.net].ok?await readBalance(a,owner).catch(()=>null):null;
      if(S.session!==session)return;S.balances[a.id]=balance;
    }
    if(S.session===session&&S.page==='wallet')render();
    await recoverActivity();await checkBridges(false);
    if(S.session===session&&S.page==='wallet')render();
  }finally{refreshing=false;}
}
async function loadStaking(){
  const owner=requireWallet().address,session=S.session;
  const c=contract('rgn',R.C.staking,R.STAKE);await R.verifyNetwork(providers.rgn,'rgn');
  const [st,pool]=await Promise.all([c.getUserStatus(owner),c.getPoolStats()]);
  checkSession(session);S.stake=st;S.pool=pool;if(S.page==='staking')render();
}
function addHistory(entry){const list=read(STORAGE.history);save(STORAGE.history,[entry].concat(list.filter(x=>x.hash!==entry.hash)).slice(0,200));}
function patchHistory(hash,patch){save(STORAGE.history,read(STORAGE.history).map(t=>t.hash===hash?Object.assign(t,patch):t));}
async function recoverActivity(){
  if(!S.wallet)return;for(const t of read(STORAGE.history).filter(t=>t.owner.toLowerCase()===S.wallet.address.toLowerCase()&&['broadcasting','pending','unknown'].includes(t.status))){
    const r=await providers[t.net].getTransactionReceipt(t.hash).catch(()=>null);if(r)patchHistory(t.hash,{status:r.status===1?'confirmed':'reverted'});
  }
}
async function showReview(title,rows,label='Confirm & send'){
  closeReview();$('reviewTitle').textContent=title;$('reviewBody').innerHTML='<dl>'+rows.map(r=>definition(r[0],r[1])).join('')+'</dl>';
  $('reviewApprove').textContent=label;$('review').hidden=false;$('reviewApprove').focus();
  return new Promise(resolve=>S.review={resolve});
}
async function transact(net,request,title,details=[]){
  const owner=requireWallet().address,session=S.session,p=providers[net];await R.verifyNetwork(p,net);checkSession(session);
  const to=R.address(request.to),data=request.data||'0x',value=E.BigNumber.from(request.value||0);
  const [gasPrice,estimated,nonce,balance]=await Promise.all([p.getGasPrice(),p.estimateGas({from:owner,to,data,value}),p.getTransactionCount(owner,'pending'),p.getBalance(owner)]);
  const gasLimit=estimated.mul(125).div(100),fee=gasLimit.mul(gasPrice);
  if(balance.lt(value.add(fee)))throw Error('Not enough '+R.NETWORKS[net].symbol+' for this amount and the maximum gas fee.');
  checkSession(session);
  const approved=await showReview(title,[['Network',R.NETWORKS[net].name+' · '+R.NETWORKS[net].chainId],['From',owner],['To / contract',to]].concat(details,[['Maximum gas fee',E.utils.formatEther(fee)+' '+R.NETWORKS[net].symbol],['Nonce',String(nonce)]]));
  if(!approved)throw Error('Transaction cancelled.');checkSession(session);
  await R.verifyNetwork(p,net);checkSession(session);
  const tx={to,data,value,gasLimit,gasPrice,nonce,chainId:R.NETWORKS[net].chainId,type:0};
  const raw=await S.wallet.signTransaction(tx);checkSession(session);
  const hash=E.utils.keccak256(raw);
  // Persist the signed transaction hash before the broadcast. Never auto-resend on timeout.
  addHistory({hash,net,owner,title,status:'broadcasting',time:Date.now()});
  if(request.onRecord)request.onRecord(hash);
  let submitted;
  try{submitted=await p.sendTransaction(raw);patchHistory(hash,{status:'pending'});notice('Submitted. Waiting for a block confirmation.');}
  catch(e){patchHistory(hash,{status:'unknown'});throw Error('Broadcast status is uncertain. Check '+short(hash)+' in Activity before trying again.');}
  let receipt;
  try{receipt=await p.waitForTransaction(hash,1,120000);}catch(e){notice('Confirmation is pending. Check Activity before retrying.');return {hash,pending:true};}
  if(!receipt)return {hash,pending:true};
  patchHistory(hash,{status:receipt.status===1?'confirmed':'reverted'});
  if(receipt.status!==1)throw Error('Transaction reverted on-chain. Gas was charged; the requested action did not complete.');
  notice(title+' confirmed.');return {hash,receipt};
}
async function callTx(net,address,abi,method,args,title,details,value,onRecord){
  const data=new E.utils.Interface(abi).encodeFunctionData(method,args||[]);
  return transact(net,{to:address,data,value:value||0,onRecord},title,details);
}
async function approveIfNeeded(net,token,spender,amount){
  const owner=requireWallet().address,session=S.session,c=contract(net,token,R.ERC20),current=await c.allowance(owner,spender);checkSession(session);
  if(current.gte(amount))return;
  if(!current.isZero()){
    const r=await callTx(net,token,R.ERC20,'approve',[spender,0],'Reset token allowance',[['Spender',spender]]);
    if(r.pending)throw Error('Wait for the allowance reset to confirm before continuing.');checkSession(session);
  }
  const r=await callTx(net,token,R.ERC20,'approve',[spender,amount],'Approve exact token amount',[['Spender',spender],['Token contract',token],['Allowance (raw units)',amount.toString()]]);
  if(r.pending)throw Error('Wait for the token approval to confirm before continuing.');checkSession(session);
}
async function saveWallet(w,name,password,passwordAgain){
  const session=S.session;
  if(password!==passwordAgain)throw Error('The passwords do not match.');
  if(slots().some(s=>s.address.toLowerCase()===w.address.toLowerCase()))throw Error('This address is already saved. Unlock it from the wallet list.');
  const enc=await R.encrypt(w.privateKey,password),id='w'+Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
  if(S.session!==session)throw Error('Wallet creation was interrupted. Please start again.');
  const slot={id,name:(name.trim()||'My Rogue Wallet').slice(0,40),address:w.address,enc};
  save(STORAGE.wallets,slots().concat(slot));S.session++;S.wallet=w;S.slot=slot;S.generated=null;S.lastTouch=Date.now();navigate('wallet');refresh().catch(error);
}
async function copy(text,sensitive=false){
  if(window.RogueNative)window.RogueNative.copy(text,sensitive);else await navigator.clipboard.writeText(text);
  notice(sensitive?'Private key copied. Keep it offline; the Android clipboard clears after 60 seconds.':'Address copied.');
}
let exportTimer,exportedKey='';
async function maxAmount(){
  const owner=requireWallet().address;let a;
  if(S.page==='send')a=asset($('sendAsset').value);
  else if(S.page==='swap')a=asset($('swapIn').value);
  else if(S.page==='bridge')a=S.bridgeDirection==='in'?asset('bsc:'+R.C.legacyBsc.toLowerCase()):asset($('bridgeAsset').value==='wrapped'?'rgn:'+R.C.wrapped.toLowerCase():'rgn:native');
  else a=asset('rgn:native');
  let value=await readBalance(a,owner);
  if(!a.address){const price=await providers[a.net].getGasPrice();const reserve=price.mul(S.page==='send'?100000:800000);value=value.gt(reserve)?value.sub(reserve):E.BigNumber.from(0);}
  if($('amount'))$('amount').value=E.utils.formatUnits(value,a.decimals);
}

async function doSwap(input,output,text,bps){
  const i=asset(input),o=asset(output),amount=R.amount(text,i.decimals),session=S.session,owner=requireWallet().address;
  if(i.net!=='rgn'||o.net!=='rgn'||i.id===o.id)throw Error('Choose two different Rogue Network assets.');
  const balance=await readBalance(i,owner);if(balance.lt(amount))throw Error('Insufficient '+i.symbol+' balance.');
  const iWrapped=i.address&&i.address.toLowerCase()===R.C.wrapped.toLowerCase(),oWrapped=o.address&&o.address.toLowerCase()===R.C.wrapped.toLowerCase();
  if((!i.address&&oWrapped)||(iWrapped&&!o.address))return callTx('rgn',R.C.wrapped,R.WRAP,!i.address?'deposit':'withdraw',!i.address?[]:[amount],!i.address?'Wrap RGN':'Unwrap wRGN',[['Amount',text+' '+i.symbol],['Receive',text+' '+o.symbol]],!i.address?amount:0);
  const from=i.address||R.C.wrapped,to=o.address||R.C.wrapped;
  const path=from.toLowerCase()===R.C.wrapped.toLowerCase()||to.toLowerCase()===R.C.wrapped.toLowerCase()?[from,to]:[from,R.C.wrapped,to];
  const router=contract('rgn',R.C.router,R.ROUTER),quote=await router.getAmountsOut(amount,path),minimum=R.minOut(quote[quote.length-1],bps);
  let impact='Unavailable — inspect the quoted output carefully.';
  try{
    let spot=amount;
    const factory=contract('rgn',R.C.factory,['function getPair(address,address) view returns(address)']);
    for(let hop=0;hop<path.length-1;hop++){
      const pair=await factory.getPair(path[hop],path[hop+1]);if(pair===E.constants.AddressZero)throw Error('No market');
      const pool=contract('rgn',pair,['function token0() view returns(address)','function getReserves() view returns(uint112,uint112,uint32)']);
      const [token0,reserves]=await Promise.all([pool.token0(),pool.getReserves()]);
      const forward=token0.toLowerCase()===path[hop].toLowerCase();
      spot=spot.mul(reserves[forward?1:0]).div(reserves[forward?0:1]);
    }
    const impactBps=spot.gt(quote[quote.length-1])?spot.sub(quote[quote.length-1]).mul(10000).div(spot).toNumber():0;
    impact=(impactBps>=300?'HIGH · ':'')+(impactBps/100).toFixed(2)+'% including pool fees';
  }catch(e){/* A quote remains available, but missing impact is explicitly disclosed. */}
  checkSession(session);const accepted=await showReview('Review swap quote',[['You pay',text+' '+i.symbol],['Quoted output',E.utils.formatUnits(quote[quote.length-1],o.decimals)+' '+o.symbol],['Minimum received',E.utils.formatUnits(minimum,o.decimals)+' '+o.symbol],['Price impact',impact],['Slippage',String(bps/100)+'%'],['Route',path.join(' → ')]],'Continue to transaction');
  if(!accepted)throw Error('Swap cancelled.');checkSession(session);
  if(i.address)await approveIfNeeded('rgn',i.address,R.C.router,amount);checkSession(session);
  const deadline=Math.floor(Date.now()/1000)+600;
  const method=!i.address?'swapExactOGGForTokens':!o.address?'swapExactTokensForOGG':'swapExactTokensForTokens';
  const args=!i.address?[minimum,path,owner,deadline]:[amount,minimum,path,owner,deadline];
  return callTx('rgn',R.C.router,R.ROUTER,method,args,'Swap on Deepwater',[['You pay',text+' '+i.symbol],['Minimum received',E.utils.formatUnits(minimum,o.decimals)+' '+o.symbol]],!i.address?amount:0);
}
async function capacity(dir){
  const net=dir==='out'?'bsc':'rgn',address=dir==='out'?R.C.bridgeBsc:R.C.bridgeHome;
  await R.verifyNetwork(providers[net],net);const c=contract(net,address,R.BRIDGE_READ);
  const [max,used,window,start,block]=await Promise.all([c.rateMax(),c.issuedInWindow(),c.rateWindow(),c.windowStart(),providers[net].getBlock('latest')]);
  return E.BigNumber.from(block.timestamp).gte(start.add(window))?max:(max.gt(used)?max.sub(used):E.BigNumber.from(0));
}
async function refreshCapacity(){const remaining=await capacity(S.bridgeDirection||'out');if(S.page==='bridge'&&$('capacity'))$('capacity').textContent='Destination capacity now: '+R.display(remaining)+' RGN. Relayer availability is separate.';}
function patchBridge(id,patch){save(STORAGE.bridges,read(STORAGE.bridges).map(e=>e.id===id?Object.assign(e,patch):e));}
async function doBridge(dir,homeAsset,text){
  const owner=requireWallet().address,session=S.session,amount=R.amount(text),src=dir==='out'?'rgn':'bsc',dst=dir==='out'?'bsc':'rgn';
  const remaining=await capacity(dir);if(amount.gt(remaining))throw Error('Amount exceeds destination capacity. Try a smaller amount or wait.');
  checkSession(session);
  const a=dir==='out'?asset(homeAsset==='native'?'rgn:native':'rgn:'+R.C.wrapped.toLowerCase()):asset('bsc:'+R.C.legacyBsc.toLowerCase());
  if((await readBalance(a,owner)).lt(amount))throw Error('Not enough '+a.symbol+' to bridge.');
  if(dir==='out'&&homeAsset==='native'){
    const wrap=await callTx('rgn',R.C.wrapped,R.WRAP,'deposit',[],'Bridge step 1 · wrap RGN',[['Amount',text+' RGN'],['Next step','A separate bridge transaction will need confirmation.']],amount);
    if(wrap.pending)throw Error('Wrapping is pending. Wait for confirmation; then choose wRGN to bridge the wrapped balance.');checkSession(session);
  }
  const address=dir==='out'?R.C.bridgeHome:R.C.bridgeBsc,abi=dir==='out'?R.BRIDGE_HOME:R.BRIDGE_BSC;
  const destinationStart=await providers[dst].getBlockNumber();checkSession(session);
  if((await capacity(dir)).lt(amount))throw Error('Capacity changed. Your wrapped funds remain in your wallet.');
  const recipient=dir==='out'?owner:E.utils.hexZeroPad(owner,32);
  const record=hash=>{const entry={id:hash,sourceHash:hash,owner,dir,amount:E.utils.formatEther(amount),status:'source-pending',fromBlock:destinationStart,cursor:destinationStart-1,unwrap:homeAsset==='native',time:Date.now()};save(STORAGE.bridges,[entry].concat(read(STORAGE.bridges)).slice(0,100));};
  const result=await callTx(src,address,abi,'bridgeOut',[amount,recipient],'Bridge to '+R.NETWORKS[dst].name,[['Amount',text+' RGN'],['Destination address',owner],['Delivery','Depends on relayer, capacity and destination confirmation.']],0,record);
  patchBridge(result.hash,{status:result.pending?'source-pending':'awaiting-delivery'});
  notice('Source transaction recorded. Destination delivery is tracked separately.');
}
let checkingBridges=false;
async function checkBridges(show=true){
  if(checkingBridges||!S.wallet)return;checkingBridges=true;const owner=S.wallet.address;
  try{
    for(const entry of read(STORAGE.bridges).filter(e=>e.owner.toLowerCase()===owner.toLowerCase()&&!['delivered','source-reverted'].includes(e.status))){
      const src=entry.dir==='out'?'rgn':'bsc',dst=entry.dir==='out'?'bsc':'rgn',p=providers[dst];
      const sourceReceipt=await providers[src].getTransactionReceipt(entry.sourceHash);if(!sourceReceipt)continue;
      if(sourceReceipt.status!==1){patchBridge(entry.id,{status:'source-reverted'});continue;}
      const latest=await p.getBlockNumber(),from=Math.max(entry.fromBlock,entry.cursor+1),to=Math.min(latest-2,from+499);
      if(to<from)continue;
      const c=contract(dst,entry.dir==='out'?R.C.bridgeBsc:R.C.bridgeHome,R.BRIDGE_READ);
      const logs=await c.queryFilter(c.filters.BridgedIn(null,owner),from,to);
      const hit=logs.find(event=>R.matchesBridge(event,entry));
      if(hit)patchBridge(entry.id,{status:'delivered',destinationHash:hit.transactionHash,cursor:to});
      else patchBridge(entry.id,{cursor:to,status:'awaiting-delivery'});
    }
    if(S.page==='bridge'&&show){render();refreshCapacity().catch(error);notice('Bridge records checked. Pending delivery is never treated as a failed transfer.');}
  }finally{checkingBridges=false;}
}

const actions={
  welcome:()=>navigate('welcome'),create:()=>navigate('create'),import:()=>navigate('import'),wallet:()=>navigate('wallet'),send:()=>{S.sendId=S.net+':native';navigate('send');},receive:()=>navigate('receive'),settings:()=>navigate('settings'),accounts:()=>navigate('accounts'),export:()=>navigate('export'),token:()=>navigate('token'),lock,
  theme:()=>setTheme(document.body.dataset.theme==='dark'?'light':'dark'),cancelReview:closeReview,
  approveReview:()=>{if(S.review){const resolver=S.review.resolve;S.review=null;$('review').hidden=true;resolver(true);}},
  chooseWallet:button=>{lock();S.unlockId=button.dataset.id;navigate('unlock');},
  generate:()=>{S.generated=E.Wallet.createRandom();render();},copyGenerated:()=>copy(S.generated.privateKey,true),copyAddress:()=>copy(requireWallet().address),
  copyExport:()=>{requireWallet();if(S.page!=='export'||!exportedKey)throw Error('Reveal the key again first.');return copy(exportedKey,true);},
  network:button=>{S.net=button.dataset.net;S.sendId=S.net+':native';render();},
  sendAsset:button=>{S.sendId=button.dataset.id;navigate('send');},refresh:refresh,refreshStaking:loadStaking,max:maxAmount,
  bridgeDirection:button=>{S.bridgeDirection=button.dataset.dir;render();refreshCapacity().catch(error);},checkBridges:()=>checkBridges(true),
  bridgeUnwrap:async button=>{const entry=read(STORAGE.bridges).find(e=>e.id===button.dataset.id&&e.owner.toLowerCase()===requireWallet().address.toLowerCase());if(!entry||entry.status!=='delivered'||entry.unwrapped)throw Error('No delivered wrapped funds to unwrap.');const result=await callTx('rgn',R.C.wrapped,R.WRAP,'withdraw',[E.utils.parseEther(entry.amount)],'Unwrap received wRGN',[['Amount',entry.amount+' wRGN']]);if(!result.pending)patchBridge(entry.id,{unwrapped:true});},
  claim:()=>callTx('rgn',R.C.staking,R.STAKE,'claim',[],'Claim staking rewards',[['Rewards','Current claimable amount, calculated by the contract.']]),
  withdraw:()=>callTx('rgn',R.C.staking,R.STAKE,'withdraw',[],'Withdraw cooldown funds',[['Availability','The contract rejects withdrawal before cooldown ends.']]),
  removeToken:button=>{save(STORAGE.tokens,read(STORAGE.tokens).filter(a=>a.id!==button.dataset.id));render();},
  removeWallet:async button=>{const slot=slots().find(s=>s.id===button.dataset.id);if(!slot)return;const accepted=await showReview('Remove local wallet?',[['Wallet',slot.name],['Address',slot.address],['Recovery','You must have its private key backed up. Removing cannot be undone.']],'Remove local copy');if(!accepted)return;save(STORAGE.wallets,slots().filter(s=>s.id!==slot.id));if(slot.id===S.slot.id)lock();else render();}
};
const forms={
  unlock:async()=>{const session=S.session,slot=slots().find(s=>s.id===S.unlockId),password=$('password').value;$('password').value='';if(!slot)throw Error('Wallet not found.');const pk=await R.decrypt(slot.enc,password),w=new E.Wallet(pk);if(S.session!==session)throw Error('Unlock was interrupted. Please try again.');if(w.address.toLowerCase()!==slot.address.toLowerCase())throw Error('Keystore address does not match.');S.session++;S.wallet=w;S.slot=slot;S.lastTouch=Date.now();navigate('wallet');refresh().catch(error);},
  create:async()=>{if(!S.generated||!$('backupCheck').checked)throw Error('Confirm that your private key is safely backed up.');const w=S.generated,name=$('walletName').value,password=$('password').value,again=$('passwordAgain').value;await saveWallet(w,name,password,again);},
  import:async()=>{const secret=$('importSecret').value.trim(),name=$('walletName').value,password=$('password').value,again=$('passwordAgain').value;const w=/\s/.test(secret)?E.Wallet.fromMnemonic(secret):new E.Wallet(secret.startsWith('0x')?secret:'0x'+secret);await saveWallet(w,name,password,again);},
  send:async()=>{const a=asset($('sendAsset').value),to=R.address($('recipient').value.trim()),text=$('amount').value,amount=R.amount(text,a.decimals);if(a.address)return callTx(a.net,a.address,R.ERC20,'transfer',[to,amount],'Send '+a.symbol,[['Recipient',to],['Amount',text+' '+a.symbol]]);return transact(a.net,{to,value:amount},'Send '+a.symbol,[['Amount',text+' '+a.symbol]]);},
  stake:async()=>{const amount=R.amount($('amount').value),c=contract('rgn',R.C.staking,R.STAKE),minimum=await c.MIN_STAKE_AMOUNT();if(amount.lt(minimum))throw Error('Minimum stake: '+E.utils.formatEther(minimum)+' RGN.');return callTx('rgn',R.C.staking,R.STAKE,'stake',[],'Stake RGN',[['Amount',E.utils.formatEther(amount)+' RGN']],amount);},
  unstake:async()=>{const amount=R.amount($('unstakeAmount').value),minimum=await contract('rgn',R.C.staking,R.STAKE).MIN_UNSTAKE_AMOUNT();if(amount.lt(minimum))throw Error('Minimum unstake: '+E.utils.formatEther(minimum)+' RGN.');return callTx('rgn',R.C.staking,R.STAKE,'unstake',[amount],'Start unstaking cooldown',[['Amount',E.utils.formatEther(amount)+' RGN']]);},
  swap:()=>{const input=$('swapIn').value,output=$('swapOut').value,text=$('amount').value,bps=R.slippage($('slippage').value);S.swapIn=input;S.swapOut=output;return doSwap(input,output,text,bps);},
  bridge:()=>doBridge(S.bridgeDirection||'out',$('bridgeAsset').value,$('amount').value),
  export:async()=>{const session=S.session,slot=S.slot,password=$('password').value;$('password').value='';const pk=await R.decrypt(slot.enc,password);checkSession(session);if(S.page!=='export')return;exportedKey=pk;$('exportResult').innerHTML='<div class="secret" id="exportSecret"></div>'+btn('Copy private key','copyExport','danger full')+'<p class="hint">Store offline. This view clears after 30 seconds.</p>';$('exportSecret').textContent=pk;exportTimer=setTimeout(()=>{exportedKey='';if($('exportResult'))$('exportResult').textContent='Key hidden. Enter your password to reveal it again.';},30000);},
  token:async()=>{const net=$('tokenNetwork').value,address=R.address($('tokenAddress').value.trim()),id=net+':'+address.toLowerCase();if(assets().some(a=>a.id===id))throw Error('This token is already listed.');await R.verifyNetwork(providers[net],net);if(await providers[net].getCode(address)==='0x')throw Error('No token contract exists at this address on the selected network.');const c=contract(net,address,R.ERC20),[name,symbol,decimals]=await Promise.all([c.name(),c.symbol(),c.decimals()]);if(Number(decimals)>36)throw Error('Unsupported token decimals.');save(STORAGE.tokens,read(STORAGE.tokens).concat({id,net,address,name:String(name).slice(0,80),symbol:String(symbol).slice(0,24),decimals:Number(decimals)}));navigate('wallet');refresh().catch(error);}
};
async function run(fn,button){
  if(S.busy)return notice('Finish or cancel the current action first.');S.busy=true;if(button)button.disabled=true;
  try{await fn();}catch(e){error(e);}finally{S.busy=false;if(button&&button.isConnected)button.disabled=false;}
}
document.addEventListener('click',event=>{
  if(event.target.closest('.brand')){event.preventDefault();if(!S.busy)navigate('wallet');return;}
  S.lastTouch=Date.now();const button=event.target.closest('button');if(!button)return;
  if(button.dataset.page){if(!S.busy)navigate(button.dataset.page);return;}
  const name=button.dataset.action;if(!name||!actions[name])return;
  if(['cancelReview','approveReview','lock','theme'].includes(name))return actions[name](button);
  run(()=>actions[name](button),button);
});
document.addEventListener('submit',event=>{
  const form=event.target,name=form.dataset.form;if(!name)return;event.preventDefault();const handler=forms[name];
  if(handler)run(async()=>{
    await handler();
    // A submitted action leaves an empty form, rather than a prefilled repeat payment.
    if(S.wallet&&['send','swap','bridge','stake','unstake'].includes(name)){
      navigate(name==='send'?'wallet':['stake','unstake'].includes(name)?'staking':name);
      refresh().catch(error);
    }
  },form.querySelector('button[type=submit],button:not([type])'));
});
document.addEventListener('change',event=>{if(event.target.id==='sendAsset'){S.sendId=event.target.value;render();}});
document.addEventListener('pointerdown',()=>S.lastTouch=Date.now(),{passive:true});document.addEventListener('keydown',()=>S.lastTouch=Date.now());
document.addEventListener('visibilitychange',()=>{if(document.hidden)lock();});
setInterval(()=>{if(S.wallet&&Date.now()-S.lastTouch>300000)lock();},15000);
setInterval(()=>{if(S.wallet&&!S.busy&&!document.hidden)refresh().catch(error);},45000);
setTheme(localStorage.getItem('rogueTheme')==='dark'?'dark':'light');navigate('welcome');
