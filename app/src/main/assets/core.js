/* Rogue Wallet core. No DOM, telemetry or analytics. Keystore-compatible with OGG v2. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./vendor/ethers-5.8.0.min.js'));
  else root.RogueCore=factory(root.ethers);
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
  'use strict';
  const NETWORKS={
    rgn:{chainId:70088,name:'Rogue Network',symbol:'RGN',rpc:'https://rpc.rogueisles.com',explorer:'https://scan.rogueisles.com'},
    bsc:{chainId:56,name:'BNB Smart Chain',symbol:'BNB',rpc:'https://bsc-dataseed.binance.org',explorer:'https://bscscan.com'}
  };
  const C={staking:'0xa47008c59f729756bEc7d01f6FE71328A242d0c4',router:'0x63bF06B97B6764699715A1421F65F5DBdED54008',factory:'0xeDD3931022b29F1d2EB226E978A775eE05891866',wrapped:'0x481c52Fc0394943d3A1190e5121F63a67C072ABb',bridgeHome:'0x9C86C959dbfD0FFe997fceF3c4b307c1a9AcFc8A',bridgeBsc:'0xb448CE16ec19882556Bea1171cA8D02774a5E49E',legacyBsc:'0xC44Efba271E71351CE20F96cFAc2d1d5c2302Aa3'};
  const ERC20=['function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function approve(address,uint256) returns(bool)','function transfer(address,uint256) returns(bool)','function symbol() view returns(string)','function name() view returns(string)','function decimals() view returns(uint8)'];
  const STAKE=['function getUserStatus(address) view returns(uint256 stakedAmount,uint256 pendingReward,uint256 cooldownAmount,uint256 cooldownEnd,bool cooldownActive,bool canWithdraw)','function getPoolStats() view returns(uint256 totalStakedOGG,uint256 totalCooldownOGG,uint256 rewardPoolBalance,uint256 currentRewardPerToken)','function getUserShare(address) view returns(uint256)','function MIN_STAKE_AMOUNT() view returns(uint256)','function MIN_UNSTAKE_AMOUNT() view returns(uint256)','function COOLDOWN_DURATION() view returns(uint256)','function stake() payable','function unstake(uint256)','function withdraw()','function claim()'];
  const WRAP=['function deposit() payable','function withdraw(uint256)'];
  const ROUTER=['function getAmountsOut(uint256,address[]) view returns(uint256[])','function swapExactOGGForTokens(uint256,address[],address,uint256) payable returns(uint256[])','function swapExactTokensForOGG(uint256,uint256,address[],address,uint256) returns(uint256[])','function swapExactTokensForTokens(uint256,uint256,address[],address,uint256) returns(uint256[])'];
  const BRIDGE_READ=['function rateMax() view returns(uint256)','function issuedInWindow() view returns(uint256)','function rateWindow() view returns(uint256)','function windowStart() view returns(uint256)','event BridgedIn(bytes32 indexed messageId,address indexed to,uint256 amount,bytes32 sourceTxHash)'];
  const BRIDGE_HOME=BRIDGE_READ.concat('function bridgeOut(uint256,address)');
  const BRIDGE_BSC=BRIDGE_READ.concat('function bridgeOut(uint256,bytes32)');
  const DEFAULT_ASSETS=[
    {id:'rgn:native',net:'rgn',address:null,symbol:'RGN',name:'Rogue Network',decimals:18},
    {id:'rgn:'+C.wrapped.toLowerCase(),net:'rgn',address:C.wrapped,symbol:'wRGN',name:'Wrapped RGN',decimals:18},
    {id:'bsc:native',net:'bsc',address:null,symbol:'BNB',name:'BNB Smart Chain',decimals:18},
    {id:'bsc:'+C.legacyBsc.toLowerCase(),net:'bsc',address:C.legacyBsc,symbol:'RGN',name:'Legacy OGG · BSC',decimals:18},
    {id:'bsc:0x55d398326f99059ff775485246999027b3197955',net:'bsc',address:'0x55d398326f99059fF775485246999027B3197955',symbol:'USDT',name:'Tether USD · BSC',decimals:18}
  ];
  function amount(text,decimals=18){
    text=String(text).trim();if(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text))throw Error('Enter a positive decimal amount, without commas.');
    const n=E.utils.parseUnits(text,decimals);if(n.lte(0))throw Error('Amount must be greater than zero.');return n;
  }
  function display(value,decimals=18,digits=6){
    if(value===null||value===undefined)return '—';
    const [whole,fraction='']=E.utils.formatUnits(value,decimals).split('.');const f=fraction.slice(0,digits).replace(/0+$/,'');
    if(whole==='0'&&!f&&!E.BigNumber.from(value).isZero())return '<'+(digits===0?'1':'0.'+'0'.repeat(digits-1)+'1');
    return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(f?'.'+f:'');
  }
  function address(value){if(!E.utils.isAddress(value)||value.toLowerCase()===E.constants.AddressZero)throw Error('Enter a valid non-zero EVM address.');return E.utils.getAddress(value);}
  function compact(value){
    const n=E.BigNumber.from(value);
    for(const [scale,suffix] of [['1000000000','B'],['1000000','M']]){
      const unit=E.utils.parseEther(scale);if(n.gte(unit)){const text=n.mul(10).div(unit).toString();return text.slice(0,-1)+'.'+text.slice(-1)+suffix;}
    }
    return display(n,18,2);
  }
  function slippage(value){const n=Number(value);if(!Number.isFinite(n)||n<0.1||n>5)throw Error('Slippage must be between 0.1% and 5%.');return Math.round(n*100);}
  function minOut(value,bps){return value.mul(10000-bps).div(10000);}
  function matchesBridge(event,entry){return !!(event.args&&entry.sourceHash&&event.args.sourceTxHash.toLowerCase()===entry.sourceHash.toLowerCase()&&event.args.to.toLowerCase()===entry.owner.toLowerCase()&&event.args.amount.eq(E.utils.parseEther(entry.amount)));}
  function escape(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function encode64(data){return btoa(String.fromCharCode.apply(null,new Uint8Array(data)));}
  function decode64(data){return Uint8Array.from(atob(data),c=>c.charCodeAt(0));}
  async function derive(password,salt,iterations=600000){
    const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function encrypt(pk,password){
    if(password.length<10)throw Error('Use at least 10 characters for your wallet password.');
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    const key=await derive(password,salt);const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(pk));
    return {salt:encode64(salt),iv:encode64(iv),ct:encode64(ct),iterations:600000};
  }
  async function decrypt(enc,password){
    try{
      const count=enc.iterations||150000;if(count<150000||count>2000000)throw Error('Invalid keystore parameters');
      const key=await derive(password,decode64(enc.salt),count);
      const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode64(enc.iv)},key,decode64(enc.ct));
      return new TextDecoder().decode(bytes);
    }catch(e){throw Error('Could not unlock this wallet. Check your password and backup.');}
  }
  async function verifyNetwork(provider,net){
    const raw=await provider.send('eth_chainId',[]);if(E.BigNumber.from(raw).toNumber()!==NETWORKS[net].chainId)throw Error('RPC returned the wrong chain. Signing is blocked.');
  }
  return {NETWORKS,C,ERC20,STAKE,WRAP,ROUTER,BRIDGE_READ,BRIDGE_HOME,BRIDGE_BSC,DEFAULT_ASSETS,amount,display,compact,address,slippage,minOut,matchesBridge,escape,encrypt,decrypt,verifyNetwork};
});
