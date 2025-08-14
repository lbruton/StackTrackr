/* DEBUG LOG BOOTSTRAP */
(function (global) {
  'use strict';
  if (typeof global.debugLog === 'function') return;
  const history = [];
  function isEnabled() {
    try { return !!localStorage.getItem('stackrtrackr.debug'); } catch (_) { return true; }
  }
  function log(level,args){
    if(!isEnabled()) return;
    try{
      const parts = ['[StackrTrackr]', new Date().toISOString(), level+':'].concat([].slice.call(args));
      history.push(parts.join(' '));
      if(level==='WARN') console.warn.apply(console,parts);
      else if(level==='ERROR') console.error.apply(console,parts);
      else console.log.apply(console,parts);
    }catch(e){}
  }
  global.debugLog=function(){log('INFO',arguments)};
  global.debugWarn=function(){log('WARN',arguments)};
  global.debugError=function(){log('ERROR',arguments)};
  global.getDebugHistory=function(){return history.slice();};
})(typeof window!=='undefined'?window:this);
