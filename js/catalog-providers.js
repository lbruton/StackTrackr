/**
 * Catalog Providers (Phase 1D foundation)
 */
class CatalogProvider {
  constructor(key, name){ this.key = key; this.name = name; }
  normalizeId(id){ return (id||'').toString().trim(); }
  buildLink(id){ return null; }
  isValid(id){ return !!this.normalizeId(id); }
}
class NumistaCatalogProvider extends CatalogProvider {
  constructor(){ super('numista','Numista'); }
  normalizeId(id){
    const s = super.normalizeId(id).replace(/^N#?/i,'');
    return s;
  }
  buildLink(id){
    const nid = this.normalizeId(id);
    return nid ? `https://en.numista.com/catalogue/pieces${nid}.html` : null;
  }
  isValid(id){ return /^N?#?\d+$/i.test(id) || /^\d+$/.test(id); }
}
const CatalogProviders = (function(){
  const map = Object.create(null);
  function register(p){ map[p.key] = p; }
  function get(key){ return map[key] || map['numista']; }
  function list(){ return Object.values(map); }
  register(new NumistaCatalogProvider());
  return { register, get, list };
})();
if (typeof window!=='undefined'){ window.CatalogProvider=CatalogProvider; window.NumistaCatalogProvider=NumistaCatalogProvider; window.CatalogProviders=CatalogProviders; }
