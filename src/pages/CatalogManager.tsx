import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {Check,ChevronRight,Info,Plus,Search,Settings2,X} from 'lucide-react';
import {useCrm} from '../store';
import {decimal,uid,type AttributeAnswerType,type CatalogAttribute,type Product,type ProductCategory} from '../domain';
import {Modal} from '../ui';

type Mode='products'|'attributes';
type Editor='category'|'attribute'|'product'|null;
type AttributeEditorType=AttributeAnswerType|'static';
const families=['Depósitos PRFV','Fosas sépticas','Piscinas','Cubas y cisternas','Otros'];
const kinds:{id:AttributeEditorType;name:string}[]=[
 {id:'single',name:'Elegir uno'},
 {id:'multiple',name:'Elegir varios'},
 {id:'boolean',name:'Sí o no'},
 {id:'centimetres',name:'Medida en cm'},
 {id:'text',name:'Texto libre'},
 {id:'static',name:'Dato técnico fijo'}
];
const norm=(s:string)=>s.trim().toLocaleLowerCase('es-ES').replace(/[.\s]+/g,'');
const priceText=(p:Product)=>p.salePriceConfigured&&p.price>0?decimal(p.price):p.price>0?'Pendiente de confirmar':'Sin precio';
const responseName=(a:CatalogAttribute)=>kinds.find(x=>x.id===(a.responseType||'static'))?.name||'Dato técnico fijo';
const responseValues=(a:CatalogAttribute)=>a.responseType==='single'||a.responseType==='multiple'
 ?(a.options||[]).join(', ')||'Sin opciones'
 :a.responseType==='boolean'?'Sí / No'
 :a.responseType==='centimetres'?'Número en cm'
 :a.responseType==='text'?'Respuesta escrita'
 :a.value||'Sin valor definido';

export default function CatalogManager(){
 const {data,addProduct,updateProduct,addProductCategory,updateProductCategory}=useCrm();
 const categories=data.productCategories||[];
 const [selectedId,setSelectedId]=useState(categories[0]?.id||'');
 const [mode,setMode]=useState<Mode>('products');
 const [query,setQuery]=useState('');
 const [editor,setEditor]=useState<Editor>(null);
 const [editingCategoryId,setEditingCategoryId]=useState('');
 const [editingProductId,setEditingProductId]=useState('');
 const [editingAttributeId,setEditingAttributeId]=useState('');
 const [categoryName,setCategoryName]=useState('');
 const [family,setFamily]=useState(families[0]);
 const [productName,setProductName]=useState('');
 const [capacity,setCapacity]=useState('');
 const [price,setPrice]=useState('');
 const [description,setDescription]=useState('');
 const [active,setActive]=useState(true);
 const [priceTouched,setPriceTouched]=useState(false);
 const [confirmPreviousPrice,setConfirmPreviousPrice]=useState(false);
 const [attributeName,setAttributeName]=useState('');
 const [attributeKind,setAttributeKind]=useState<AttributeEditorType>('single');
 const [attributeOptions,setAttributeOptions]=useState('');
 const [attributeValue,setAttributeValue]=useState('');
 const [attributeHidden,setAttributeHidden]=useState(false);
 const [error,setError]=useState('');
 const selected=categories.find(c=>c.id===selectedId)||categories[0];
 const selectedProducts=useMemo(()=>data.products.filter(p=>p.categoryId===selected?.id),[data.products,selected?.id]);
 const visibleProducts=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase('es-ES');
  return selectedProducts.filter(p=>!q||[p.id,p.name,p.description||'',p.capacity].join(' ').toLocaleLowerCase('es-ES').includes(q))
   .slice().sort((a,b)=>a.capacity.localeCompare(b.capacity,'es',{numeric:true}));
 },[selectedProducts,query]);
 const visibleCategories=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase('es-ES');
  return categories.filter(c=>!q||[c.name,c.family].join(' ').toLocaleLowerCase('es-ES').includes(q)||
   data.products.some(p=>p.categoryId===c.id&&[p.name,p.capacity,p.id].join(' ').toLocaleLowerCase('es-ES').includes(q)))
   .slice().sort((a,b)=>a.name.localeCompare(b.name,'es'));
 },[categories,data.products,query]);
 const editingProduct=data.products.find(p=>p.id===editingProductId);
 useEffect(()=>{
  if(editor!=='product')return;
  const handle=(event:KeyboardEvent)=>{if(event.key==='Escape')setEditor(null);};
  document.addEventListener('keydown',handle);
  return ()=>document.removeEventListener('keydown',handle);
 },[editor]);
 const startCategory=(c?:ProductCategory)=>{
  setEditingCategoryId(c?.id||'');setCategoryName(c?.name||'');setFamily(c?.family||families[0]);
  setError('');setEditor('category');
 };
 const startProduct=(p?:Product)=>{
  if(!selected)return;
  setEditingProductId(p?.id||'');
  setProductName(p?.description&&p?.name===selected.name?p.name:(p?.name||selected.name));
  setCapacity(p?.capacity||'');
  setDescription(p?.description||'');
  setPrice(p&&p.price>0?String(p.price):'');
  setPriceTouched(false);setConfirmPreviousPrice(false);
  setActive(p?.active??true);setError('');setEditor('product');
 };
 const startAttribute=(a?:CatalogAttribute)=>{
  setEditingAttributeId(a?.id||'');
  setAttributeName(a?.label||'');
  setAttributeKind(a?.responseType|| (a?'static':'single'));
  setAttributeOptions((a?.options||[]).join('\n'));
  setAttributeValue(a?.value||'');
  setAttributeHidden(Boolean(a?.hidden));
  setError('');setEditor('attribute');
 };
 const saveCategory=(event:FormEvent)=>{
  event.preventDefault();
  const name=categoryName.trim();
  if(!name){setError('Indica el nombre de la categoría.');return;}
  if(categories.some(c=>c.id!==editingCategoryId&&norm(c.name)===norm(name)&&c.family===family)){
   setError('Esta categoría ya existe en la misma familia.');return;
  }
  if(editingCategoryId)updateProductCategory(editingCategoryId,{name,family});
  else {
   const id=uid('CAT');addProductCategory({id,name,family,attributes:[]});setSelectedId(id);
  }
  setEditor(null);
 };
 const saveProduct=(event:FormEvent)=>{
  event.preventDefault();
  if(!selected)return;
  if(!productName.trim()||!capacity.trim()){setError('Introduce el nombre y la capacidad.');return;}
  if(selectedProducts.some(p=>p.id!==editingProductId&&norm(p.capacity)===norm(capacity))){
   setError('Ya existe esa capacidad dentro de la categoría.');return;
  }
  if(price!==''&&(!Number.isFinite(Number(price))||Number(price)<0)){
   setError('El precio no es válido.');return;
  }
  const amount=price===''?0:Number(price);
  const verified=amount>0&&Boolean(editingProduct?.salePriceConfigured||priceTouched||confirmPreviousPrice);
  const item={name:productName.trim(),description:description.slice(0,200),family:selected.family,
   categoryId:selected.id,capacity:capacity.trim(),price:amount,active,salePriceConfigured:verified};
  if(editingProductId)updateProduct(editingProductId,item);
  else addProduct(item);
  setEditor(null);
 };
 const saveAttribute=(event:FormEvent)=>{
  event.preventDefault();
  if(!selected)return;
  const label=attributeName.trim();
  if(!label){setError('Introduce el nombre del atributo.');return;}
  if(selected.attributes.some(a=>a.id!==editingAttributeId&&norm(a.label)===norm(label))){
   setError('Ya existe un atributo con ese nombre.');return;
  }
  const options=[...new Set(attributeOptions.split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];
  if((attributeKind==='single'||attributeKind==='multiple')&&!options.length){
   setError('Introduce al menos una opción, en una línea.');return;
  }
  const item:CatalogAttribute={
   id:editingAttributeId||uid('ATR'),label,
   value:attributeKind==='static'?attributeValue.trim():'',
   responseType:attributeKind==='static'?undefined:attributeKind,
   options:attributeKind==='single'||attributeKind==='multiple'?options:undefined,
   hidden:attributeKind==='static'?undefined:attributeHidden
  };
  const attributes=editingAttributeId
   ?selected.attributes.map(a=>a.id===editingAttributeId?item:a)
   :[...selected.attributes,item];
  updateProductCategory(selected.id,{attributes});
  setEditor(null);
 };
 const close=()=>setEditor(null);
 return <div className="page page-opportunities crm-workspace page-catalog catalog3">
  <header className="catalog3-heading">
   <div><h1>Catálogo</h1><p>Organiza las categorías, productos y precios para preparar presupuestos.</p></div>
   <Link to="/presupuestos/nuevo" className="catalog3-link">Preparar presupuesto <ChevronRight size={16}/></Link>
  </header>
  <nav className="catalog3-tabs" aria-label="Secciones del catálogo">
   <button type="button" aria-pressed={mode==='products'} className={mode==='products'?'is-active':''}
    onClick={()=>setMode('products')}>Productos</button>
   <button type="button" aria-pressed={mode==='attributes'} className={mode==='attributes'?'is-active':''}
    onClick={()=>setMode('attributes')}>Atributos</button>
   <Link to="/presupuestos">Presupuestos <ChevronRight size={14}/></Link>
  </nav>
  <div className="catalog3-layout">
   <aside className="catalog3-sidebar" aria-label="Categorías">
    <div className="catalog3-sidebar-title"><span>CATEGORÍAS</span><button type="button" onClick={()=>startCategory()}><Plus size={14}/> Nueva</button></div>
    <div className="catalog3-category-scroll">
     {visibleCategories.map(c=><button type="button" key={c.id}
      className={'catalog3-category'+(selected?.id===c.id?' is-active':'')}
      aria-pressed={selected?.id===c.id} onClick={()=>{setSelectedId(c.id);setQuery('')}}>
      <span>{c.name}</span>
      <small>{data.products.filter(p=>p.categoryId===c.id).length}</small>
     </button>)}
     {!visibleCategories.length&&<p className="catalog3-sidebar-empty">No hay categorías.</p>}
    </div>
    <div className="catalog3-sidebar-settings">
     <span>CONFIGURACIÓN</span>
     <button type="button" className={mode==='attributes'?'is-active':''}
      onClick={()=>setMode('attributes')}><Settings2 size={16}/> Atributos</button>
    </div>
   </aside>
   <section className="catalog3-workspace" aria-label="Gestión de catálogo">
    {!selected?<div className="catalog3-empty">
     <h2>Sin categorías</h2><p>Crea una categoría para organizar las referencias y sus atributos.</p>
     <button type="button" onClick={()=>startCategory()}><Plus size={16}/> Nueva categoría</button>
    </div>:mode==='products'?<>
     <header className="catalog3-panel-heading">
      <div><h2>{selected.name}</h2><div className="catalog3-subtitle">
       {selectedProducts.length} {selectedProducts.length===1?'producto':'productos'}
       <button type="button" onClick={()=>startCategory(selected)}>Editar categoría</button>
      </div></div>
      <button className="catalog3-primary" type="button" onClick={()=>startProduct()}><Plus size={17}/> Añadir producto</button>
     </header>
     <div className="catalog3-attribute-quick">
       <div><strong>Atributos de esta categoría</strong><span>{selected.attributes.length} configurados · Se comparten entre las capacidades de {selected.name}.</span></div>
       <div><button type="button" className="catalog3-attribute-manage" onClick={()=>setMode('attributes')}><Settings2 size={16}/>Ver y editar atributos</button>
         <button type="button" className="catalog3-attribute-new" onClick={()=>startAttribute()}><Plus size={16}/>Añadir atributo</button></div>
     </div>
     <div className="catalog3-search-row">
      <label><Search size={17}/><input type="search" aria-label="Buscar producto o referencia"
       value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nombre, capacidad o referencia"/>
       {query&&<button type="button" onClick={()=>setQuery('')} aria-label="Borrar búsqueda"><X size={15}/></button>}
      </label>
     </div>
     <div className="catalog3-table-scroll" role="region" aria-label="Productos y precios" tabIndex={0}>
      <table className="catalog3-table">
       <thead><tr><th>REF.</th><th>PRODUCTO</th><th>PRECIO DE VENTA</th><th>ESTADO</th></tr></thead>
       <tbody>{visibleProducts.map(p=><tr key={p.id} className="catalog3-product-row"
        tabIndex={0} role="button" aria-label={'Editar '+(p.name||selected.name)+' · '+p.capacity}
        onClick={()=>startProduct(p)}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();startProduct(p)}}}>
        <td className="catalog3-ref">{p.id}</td>
        <td><strong>{p.name||selected.name}</strong><small>{p.capacity}{p.description?' · '+p.description:''}</small></td>
        <td className={p.salePriceConfigured?'catalog3-price':'catalog3-muted-price'}>{priceText(p)}</td>
        <td><span className={'catalog3-status'+(p.active?' is-active':'')}>
         <i/>{p.active?'Activo':'Inactivo'}</span></td>
       </tr>)}</tbody>
      </table>
      {!visibleProducts.length&&<p className="catalog3-no-rows">{selectedProducts.length?'No hay productos que coincidan con la búsqueda.':'Todavía no hay productos. Añade la primera capacidad.'}</p>}
     </div>
     <footer className="catalog3-footer">
      <span>Los precios anteriores sin confirmar no se aplican automáticamente a presupuestos.</span>
      <span>{visibleProducts.length} referencias</span>
     </footer>
    </>:<>
     <header className="catalog3-panel-heading">
      <div><span className="catalog3-section-eyebrow">ATRIBUTOS DE LA CATEGORÍA</span>
       <h2>{selected.name}</h2>
       <p className="catalog3-subtitle">{selected.attributes.length} {selected.attributes.length===1?'atributo':'atributos'} · configurados para sus {selectedProducts.length} productos</p></div>
      <div className="catalog3-heading-actions">
       <button type="button" className="catalog3-outline" onClick={()=>setMode('products')}>Ver productos</button>
       <button type="button" className="catalog3-primary" onClick={()=>startAttribute()}><Plus size={16}/> Añadir atributo</button>
      </div>
     </header>
     <div className="catalog3-attribute-intro">
       <div><strong>Datos técnicos fijos</strong><span>{selected.attributes.filter(a=>!a.responseType).length} · Información común que debe estar verificada.</span></div>
       <div><strong>Preguntas para nuevas solicitudes</strong><span>{selected.attributes.filter(a=>Boolean(a.responseType)).length} · Opciones que se pueden rellenar al crear una consulta.</span></div>
     </div>
     <div className="catalog3-table-scroll" role="region" aria-label="Atributos de categoría" tabIndex={0}>
      <table className="catalog3-table catalog3-attrs-table">
       <thead><tr><th>ATRIBUTO</th><th>CÓMO RESPONDE</th><th>VALORES</th><th/></tr></thead>
       <tbody>{selected.attributes.map(a=><tr key={a.id}>
        <td><strong>{a.label}</strong>{a.hidden&&<small>Oculto en nuevas solicitudes</small>}</td>
        <td>{responseName(a)}</td><td>{responseValues(a)}</td>
        <td><button type="button" className="catalog3-text-action" onClick={()=>startAttribute(a)}>Editar atributo</button></td>
       </tr>)}</tbody>
      </table>
      {!selected.attributes.length&&<p className="catalog3-no-rows">No hay atributos. Puedes añadir uno para definir opciones del producto o registrar información técnica común.</p>}
     </div>
     <footer className="catalog3-attribute-foot">
      Los atributos de respuesta se pueden cumplimentar al registrar una solicitud manual en el CRM. El formulario público de la web no está conectado a esta configuración.
     </footer>
    </>}
   </section>
  </div>
  {editor==='category'&&<Modal title={editingCategoryId?'Editar categoría':'Nueva categoría'} onClose={close}>
   <form className="catalog3-modal-form" onSubmit={saveCategory}>
    <label>Nombre de la categoría<input autoFocus required value={categoryName} onChange={e=>setCategoryName(e.target.value)}
      placeholder="Ej. Depósitos de poliéster verticales base plana"/></label>
    <label>Familia comercial<select value={family} onChange={e=>setFamily(e.target.value)}>
     {[...new Set([...families,...categories.map(c=>c.family)])].map(x=><option key={x}>{x}</option>)}
    </select></label>
    <p className="catalog3-help">Los productos y sus precios permanecerán vinculados al cambiar el nombre de la categoría.</p>
    {error&&<p className="catalog3-error" role="alert">{error}</p>}
    <div className="catalog3-modal-actions"><button type="button" onClick={close}>Cancelar</button><button type="submit">Guardar categoría</button></div>
   </form>
  </Modal>}
  {editor==='attribute'&&selected&&<Modal title={editingAttributeId?'Editar atributo':'Nuevo atributo'} subtitle={'Se configura para los productos de «'+selected.name+'».'} onClose={close}>
   <form className="catalog3-modal-form" onSubmit={saveAttribute}>
    <label>Nombre del atributo<input autoFocus required value={attributeName} onChange={e=>setAttributeName(e.target.value)} placeholder="Ej. Color"/></label>
    <label>Cómo responde el cliente<select value={attributeKind} onChange={e=>setAttributeKind(e.target.value as AttributeEditorType)}>
     {kinds.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}
    </select></label>
    {(attributeKind==='single'||attributeKind==='multiple')&&<label>Valores, uno por línea
     <textarea rows={5} value={attributeOptions} onChange={e=>setAttributeOptions(e.target.value)}
      placeholder={'Verde\nGris\nBlanco'}/>
     <small>Al registrar una solicitud también se ofrece «Otro / a medida».</small>
    </label>}
    {attributeKind==='static'&&<label>Valor común verificado<textarea rows={3}
     value={attributeValue} onChange={e=>setAttributeValue(e.target.value)} placeholder="Valor que comparten todas las variantes"/>
    </label>}
    {attributeKind!=='static'&&<label className="catalog3-check"><input type="checkbox" checked={attributeHidden} onChange={e=>setAttributeHidden(e.target.checked)}/>
     <span>Oculto: no se ofrece al registrar solicitudes</span>
    </label>}
    {error&&<p className="catalog3-error" role="alert">{error}</p>}
    <div className="catalog3-modal-actions"><button type="button" onClick={close}>Cancelar</button><button type="submit">Guardar atributo</button></div>
   </form>
  </Modal>}
  {editor==='product'&&selected&&<div className="catalog3-drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
   <aside className="catalog3-drawer" role="dialog" aria-modal="true" aria-label={editingProductId?'Editar producto':'Añadir producto'}>
    <header className="catalog3-drawer-head"><div><span>{editingProduct?.id||selected.name}</span>
     <h2>{editingProductId?'Editar producto':'Añadir producto'}</h2></div>
     <button type="button" aria-label="Cerrar panel de edición" onClick={close}><X size={18}/></button></header>
    <form onSubmit={saveProduct} className="catalog3-product-form">
     <div className="catalog3-drawer-fields">
      <label>Nombre del producto<input required value={productName} onChange={e=>setProductName(e.target.value)} autoFocus placeholder="Ej. Depósito vertical base plana"/></label>
      <label>Capacidad / variante<input required value={capacity} onChange={e=>setCapacity(e.target.value)} placeholder="Ej. 10.000 L"/></label>
      <label>En nuevos presupuestos<select value={active?'active':'inactive'} onChange={e=>setActive(e.target.value==='active')}>
       <option value="active">Activo, se ofrece</option><option value="inactive">Inactivo, no se ofrece</option>
      </select></label>
      <label>Descripción corta<textarea rows={4} maxLength={200} value={description} onChange={e=>setDescription(e.target.value)}/><small>Hasta 200 caracteres. Es información interna de apoyo.</small></label>
      <label>Precio de venta orientativo (sin IVA) · €<input type="number" min="0" step=".01" value={price}
       onChange={e=>{setPrice(e.target.value);setPriceTouched(true)}} placeholder="Sin precio configurado"/>
       <small>Solo dentro del CRM; al seleccionar este producto puede copiarse al presupuesto y allí cambiarse.</small></label>
      {editingProduct&&editingProduct.price>0&&!editingProduct.salePriceConfigured&&!priceTouched&&
       <label className="catalog3-check catalog3-price-confirm"><input type="checkbox" checked={confirmPreviousPrice} onChange={e=>setConfirmPreviousPrice(e.target.checked)}/>
        <span>Confirmo que este importe anterior es un precio de venta válido</span></label>}
      <div className="catalog3-drawer-category"><b>Categoría:</b> {selected.name}
       <small>Referencia: {editingProduct?.id||'Se asigna al guardar'}</small></div>
      <div className="catalog3-drawer-attributes"><strong>Atributos de esta categoría</strong>
       {selected.attributes.length?<ul>{selected.attributes.map(a=><li key={a.id}>{a.label} · {responseName(a)}</li>)}</ul>:
        <span>Ninguno todavía</span>}
       <button type="button" onClick={()=>{setEditor(null);setMode('attributes')}}>Gestionar atributos</button>
      </div>
      {error&&<p className="catalog3-error" role="alert">{error}</p>}
      <div className="catalog3-drawer-warning"><Info size={17}/><span>El precio no valida automáticamente transporte, descarga, impuestos ni documentación técnica. Los presupuestos antiguos no cambian.</span></div>
     </div>
     <footer className="catalog3-drawer-footer"><button type="button" onClick={close}>Cancelar</button>
      <button type="submit"><Check size={16}/> Guardar cambios</button></footer>
    </form>
   </aside>
  </div>}
 </div>;
}
