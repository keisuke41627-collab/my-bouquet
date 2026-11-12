// 保存先はこの端末のブラウザ（IndexedDB）。試作なので、ほかの端末とは共有されない
// kv: 画面の状態をまとめた1件（state）／ blobs: 動画ファイル（id → Blob）
const DB = (() => {
  let db = null;
  const mem = { kv: new Map(), blobs: new Map() }; // IndexedDB が使えないとき（プライベートブラウズなど）の代わり

  function open() {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open("bridal-app", 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore("kv");
          req.result.createObjectStore("blobs");
        };
        req.onsuccess = () => { db = req.result; resolve(); };
        req.onerror = () => resolve();
      } catch (e) { resolve(); }
    });
  }

  function run(store, mode, fn) {
    if (!db) return Promise.resolve(fn(null, mem[store]));
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
    });
  }

  return {
    open,
    persistent: () => !!db,
    getState: () => run("kv", "readonly", (s, m) => s ? s.get("state") : m.get("state")),
    setState: (v) => run("kv", "readwrite", (s, m) => s ? s.put(v, "state") : m.set("state", v)),
    putBlob: (id, b) => run("blobs", "readwrite", (s, m) => s ? s.put(b, id) : m.set(id, b)),
    getBlob: (id) => run("blobs", "readonly", (s, m) => s ? s.get(id) : m.get(id)),
    clear: () => Promise.all([
      run("kv", "readwrite", (s, m) => s ? s.clear() : m.clear()),
      run("blobs", "readwrite", (s, m) => s ? s.clear() : m.clear()),
    ]),
  };
})();
