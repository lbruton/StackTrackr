/**
 * Catalog Providers (Phase 1D foundation)
 * Note: CatalogProvider base class is defined in catalog-api.js
 */

class NumistaCatalogProvider extends CatalogProvider {
  constructor(){ super({ name: 'Numista', key: 'numista' }); }
  normalizeId(id){
    const s = (id||'').toString().trim().replace(/^N#?/i,'');
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
  function register(p){ map[p.key || p.name.toLowerCase()] = p; }
  function get(key){ return map[key] || map['numista']; }
  function list(){ return Object.values(map); }
  register(new NumistaCatalogProvider());
  return { register, get, list };
})();

if (typeof window!=='undefined'){ window.NumistaCatalogProvider=NumistaCatalogProvider; window.CatalogProviders=CatalogProviders; }
