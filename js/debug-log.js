/* DEBUG LOG BOOTSTRAP */
(function (global) {
  'use strict';
  if (typeof global.debugLog === 'function') return;
  function isEnabled() {
    try { return !!localStorage.getItem('stackrtrackr.debug'); } catch (_) { return true; }
  }
  function log(level,args){
    if(!isEnabled()) return;
    try{
      const a = ['[StackrTrackr]', new Date().toISOString(), level+':'].concat([].slice.call(args));
      if(level==='WARN') console.warn.apply(console,a);
      else if(level==='ERROR') console.error.apply(console,a);
      else console.log.apply(console,a);
    }catch(e){}
  }
  global.debugLog=function(){log('INFO',arguments)};
  global.debugWarn=function(){log('WARN',arguments)};
  global.debugError=function(){log('ERROR',arguments)};
})(typeof window!=='undefined'?window:this);
