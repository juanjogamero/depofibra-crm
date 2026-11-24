import {useMemo,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {
  ArrowRight,Boxes,Check,ChevronRight,FolderPlus,Info,
  Package,Plus,Search,ShieldCheck,SlidersHorizontal,X
} from 'lucide-react';
import {useCrm} from '../store';
import {decimal,uid,type CatalogAttribute,type Product,type ProductCategory} from '../domain';
import {Button,Field,Modal} from '../ui';

const fams=['Depósitos PRFV','Fosas sépticas','Piscinas','Cubas y cisternas','Otros'];
const key=(value:string)=>value.toLocaleLowerCase('es-ES').replace(/[.\s]+/g,'').trim();
const numbered=(s:string)=>Number(s.replace(/[^\d]/g,''))||0;
const salePrice=(p:Product)=>p.salePriceConfigured&&Number.isFinite(p.price)&&p.price>0?decimal(p.price):(p.price>0?'Revisar precio anterior':'Sin configurar');

export default function CatalogManager(){
 const {data,addProduct,updateProduct,addProductCategory,updateProductCategory}=useCrm();
 const categories=data.productCategories||[];
 const [selectedId,setSelectedId]=useState(categories[0]?.id||'');
 const [search,setSearch]=useState('');
 const [dialog,setDialog]=useState<'category'|'variant'|null>(null);
 const [editCat,setEditCat]=useState('');
 const [editProduct,setEditProduct]=useState('');
 const [categoryName,setCategoryName]=useState('');
 const [categoryFamily,setCategoryFamily]=useState(fams[0]);
 const [attributes,setAttributes]=useState<CatalogAttribute[]>([]);
 const [capacity,setCapacity]=useState('');
 const [price,setPrice]=useState('');
 const [active,setActive]=useState(true);
 const [error,setError]=useState('');
 const selected=categories.find(c=>c.id===selectedId)||categories[0];
 const products=selected?data.products.filter(p=>p.categoryId===selected.id):[];
 const visibleProducts=useMemo(()=>{
   const list=products.filter(p=>!search.trim()||[p.name,p.family,p.capacity,p.id].join(' ').toLocaleLowerCase('es-ES').includes(search.trim().toLocaleLowerCase('es-ES'))||
     (selected?.name||'').toLocaleLowerCase('es-ES').includes(search.trim().toLocaleLowerCase('es-ES')));
   return list.slice().sort((a,b)=>numbered(a.capacity)-numbered(b.capacity)||a.capacity.localeCompare(b.capacity,'es'));
 },[products,search,selected?.name]);
 const visibleCategories=useMemo(()=>{
   const q=search.trim().toLocaleLowerCase('es-ES');
   return categories.filter(c=>!q||[c.name,c.family,c.id].join(' ').toLocaleLowerCase('es-ES').includes(q)
     ||data.products.some(p=>p.categoryId===c.id&&[p.name,p.capacity,p.id].join(' ').toLocaleLowerCase('es-ES').includes(q)))
   .sort((a,b)=>a.name.localeCompare(b.name,'es'));
 },[categories,data.products,search]);
 const priced=data.products.filter(p=>p.salePriceConfigured&&Number.isFinite(p.price)&&p.price>0).length;
 const openCategory=(c?:ProductCategory)=>{
   setEditCat(c?.id||'');setCategoryName(c?.name||'');
   setCategoryFamily(c?.family||fams[0]);
   setAttributes(c?.attributes.map(a=>({...a}))||[]);
   setError('');setDialog('category');
 };
 const openVariant=(p?:Product)=>{
   if(!selected)return;
   setEditProduct(p?.id||'');
   setCapacity(p?.capacity||'');setPrice(p&&p.price>0?String(p.price):'');
   setActive(p?.active??true);
   setError('');setDialog('variant');
 };
 const saveCategory=(e:FormEvent)=>{
   e.preventDefault();
   const name=categoryName.trim();
   if(!name){setError('Indica un nombre para la categoría.');return;}
   if(categories.some(c=>c.id!==editCat&&key(c.name)===key(name)&&c.family===categoryFamily)){
     setError('Ya existe una categoría con ese nombre y familia.');return;
   }
   const attr=attributes.map(a=>({...a,label:a.label.trim(),value:a.value.trim()}))
     .filter(a=>a.label);
   if(editCat){
     updateProductCategory(editCat,{name,family:categoryFamily,attributes:attr});
   }else{
     const id=uid('CAT');
     addProductCategory({id,name,family:categoryFamily,attributes:attr});
     setSelectedId(id);
   }
   setDialog(null);
 };
 const saveVariant=(e:FormEvent)=>{
   e.preventDefault();
   if(!selected)return;
   const cap=capacity.trim();
   if(!cap){setError('Indica la capacidad o variante.');return;}
   if(products.some(p=>p.id!==editProduct&&key(p.capacity)===key(cap))){
     setError('Ya hay una variante con esa capacidad dentro de la categoría.');return;
   }
   if(price.trim()!==''&&(!Number.isFinite(Number(price))||Number(price)<0)){
     setError('El precio debe ser positivo o dejarse vacío.');return;
   }
   const amount=price.trim()?Number(price):0;
   const item={name:selected.name,family:selected.family,categoryId:selected.id,capacity:cap,price:amount,active,salePriceConfigured:amount>0};
   if(editProduct)updateProduct(editProduct,item);
   else addProduct(item);
   setDialog(null);
 };
 return <div className="page page-opportunities crm-workspace page-catalog catalog2">
  <header className="op-screen-heading catalog2-heading">
   <div className="op-heading-copy"><span className="catalog2-eyebrow">GESTIÓN COMERCIAL · REFERENCIAS INTERNAS</span>
    <h1>Catálogo</h1>
    <p>Organiza familias, atributos comunes y capacidades. Asigna precios de venta para preparar presupuestos.</p></div>
   <div className="op-heading-actions">
    <button type="button" className="op-new-button" onClick={()=>openCategory()}><FolderPlus size={17}/>Nueva categoría</button>
   </div>
  </header>
  <div className="catalog2-summary" aria-label="Resumen de catálogo">
   <span><strong>{categories.length}</strong> categorías</span>
   <span><strong>{data.products.length}</strong> referencias</span>
   <span><strong>{priced}</strong> con precio de venta configurado</span>
   <Link to="/presupuestos/nuevo">Nuevo presupuesto <ArrowRight size={15}/></Link>
  </div>
  <div className="catalog2-layout">
   <aside className="catalog2-categories" aria-label="Categorías del catálogo">
    <div className="catalog2-sidebar-title"><h2>Categorías</h2><span>{categories.length}</span></div>
    <label className="catalog2-search"><Search size={17}/>
      <input type="search" aria-label="Buscar categorías o capacidades" placeholder="Buscar categoría o capacidad" value={search} onChange={e=>setSearch(e.target.value)}/>
      {search&&<button type="button" aria-label="Borrar búsqueda" onClick={()=>setSearch('')}><X size={15}/></button>}
    </label>
    <div className="catalog2-category-list">
     {visibleCategories.map(c=>{
       const items=data.products.filter(p=>p.categoryId===c.id);
       return <button type="button" key={c.id} onClick={()=>setSelectedId(c.id)}
         aria-pressed={selected?.id===c.id} className={'catalog2-category'+(selected?.id===c.id?' is-selected':'')}>
         <span className="catalog2-category-icon"><Boxes size={18}/></span>
         <span className="catalog2-category-text"><strong>{c.name}</strong><small>{c.family} · {items.length} {items.length===1?'variante':'variantes'}</small></span>
         <ChevronRight size={16}/>
       </button>;
     })}
     {!visibleCategories.length&&<p className="catalog2-no-results">No hay categorías que coincidan. Puedes crear una nueva.</p>}
    </div>
    <button type="button" className="catalog2-create-secondary" onClick={()=>openCategory()}><Plus size={16}/>Crear categoría</button>
   </aside>
   <section className="catalog2-main" aria-label="Ficha de la categoría seleccionada">
    {selected?<>
     <div className="catalog2-category-heading">
      <div><span className="catalog2-eyebrow">CATEGORÍA SELECCIONADA</span>
       <h2>{selected.name}</h2><p>{selected.family} · {products.length} {products.length===1?'referencia':'referencias'}</p></div>
      <button type="button" className="catalog2-ghost-button" onClick={()=>openCategory(selected)}><SlidersHorizontal size={16}/>Editar categoría</button>
     </div>
     <section className="catalog2-attributes" aria-labelledby="catalog2-attrs-title">
      <div className="catalog2-section-heading"><div>
       <h3 id="catalog2-attrs-title">Atributos comunes</h3>
       <p>Características compartidas por todas las capacidades de esta categoría.</p></div>
       <button type="button" onClick={()=>openCategory(selected)}>Editar atributos <ArrowRight size={15}/></button>
      </div>
      {selected.attributes.length?<div className="catalog2-attribute-list">
       {selected.attributes.map(a=><div className="catalog2-attribute" key={a.id}><span>{a.label}</span><strong>{a.value||'Pendiente de verificar'}</strong></div>)}
      </div>:<p className="catalog2-attribute-empty">Aún no hay atributos técnicos comunes. Añádelos cuando estén verificados para toda la categoría.</p>}
     </section>
     <section className="catalog2-variants" aria-labelledby="catalog2-variants-title">
      <div className="catalog2-section-heading"><div>
       <h3 id="catalog2-variants-title">Capacidades y precios</h3>
       <p>Cada variante tiene su propio precio de venta y estado.</p></div>
       <button type="button" className="catalog2-add-variant" onClick={()=>openVariant()}><Plus size={16}/>Añadir capacidad</button>
      </div>
      <div className="catalog2-tablewrap">
       <table className="catalog2-table">
        <thead><tr><th>Capacidad / referencia</th><th>Precio de venta</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>{visibleProducts.map(p=><tr key={p.id}>
         <td><div className="catalog2-product-id"><span><Package size={19}/></span><div><strong>{p.capacity}</strong><small>{p.id}</small></div></div></td>
         <td><strong className={p.salePriceConfigured&&p.price>0?'catalog2-priced':'catalog2-unpriced'}>{salePrice(p)}</strong></td>
         <td><span className={'catalog2-status'+(p.active?' is-active':'')}>{p.active?'Disponible':'Inactiva'}</span></td>
         <td><button className="catalog2-edit-link" type="button" onClick={()=>openVariant(p)}>Editar <ArrowRight size={15}/></button></td>
        </tr>)}</tbody>
       </table>
       {!visibleProducts.length&&<p className="catalog2-empty">{products.length?'No hay capacidades que coincidan con la búsqueda.':'Esta categoría aún no tiene capacidades. Añade la primera referencia.'}</p>}
      </div>
      <div className="catalog2-table-foot">{visibleProducts.length} de {products.length} variantes · Los precios de venta deben confirmarse al editar cada referencia; los presupuestos antiguos no cambian.</div>
     </section>
     <div className="catalog2-guidance"><ShieldCheck size={18}/><span>Introduce únicamente <b>precios de venta configurados para uso interno</b>, no costes de compra. Antes de comunicar una oferta, revisa impuestos, transporte, descarga, accesorios y condiciones técnicas. Las variantes sin precio requieren introducirlo manualmente en el presupuesto.</span></div>
    </>:<div className="catalog2-welcome"><FolderPlus size={30}/><h2>Empieza creando una categoría</h2><p>Después podrás añadir las capacidades, sus precios y los atributos compartidos.</p><button type="button" onClick={()=>openCategory()}>Crear primera categoría</button></div>}
   </section>
  </div>
  {dialog==='category'&&<Modal title={editCat?'Editar categoría':'Crear categoría'} onClose={()=>setDialog(null)}>
    <form className="modal-form catalog2-modal-form" onSubmit={saveCategory}>
     <Field label="Nombre de la categoría"><input required value={categoryName} onChange={e=>setCategoryName(e.target.value)}
       placeholder="Ej. Depósitos de poliéster verticales de base plana"/></Field>
     <Field label="Familia comercial"><select value={categoryFamily} onChange={e=>setCategoryFamily(e.target.value)}>
       {fams.map(x=><option key={x} value={x}>{x}</option>)}
      </select></Field>
     <div className="catalog2-attrs-editor">
      <div className="catalog2-editor-title"><strong>Atributos comunes</strong><button type="button" onClick={()=>setAttributes(a=>[...a,{id:uid('ATR'),label:'',value:''}])}><Plus size={15}/>Añadir atributo</button></div>
      <p>Introduce solo datos aplicables a toda la categoría. Ej.: material o instalación, siempre tras verificarlos.</p>
      {attributes.map(a=><div className="catalog2-attr-inputs" key={a.id}>
       <input aria-label="Nombre del atributo" placeholder="Atributo" value={a.label}
        onChange={e=>setAttributes(all=>all.map(x=>x.id===a.id?{...x,label:e.target.value}:x))}/>
       <input aria-label={'Valor del atributo '+(a.label||'nuevo')} placeholder="Valor confirmado" value={a.value}
        onChange={e=>setAttributes(all=>all.map(x=>x.id===a.id?{...x,value:e.target.value}:x))}/>
       <button type="button" title="Quitar atributo" aria-label="Quitar atributo" onClick={()=>setAttributes(all=>all.filter(x=>x.id!==a.id))}><X size={17}/></button>
      </div>)}
     </div>
     {error&&<p className="catalog2-error" role="alert">{error}</p>}
     <div className="modal-actions"><Button variant="outline" onClick={()=>setDialog(null)}>Cancelar</Button><Button type="submit"><Check size={16}/>Guardar categoría</Button></div>
    </form>
   </Modal>}
  {dialog==='variant'&&selected&&<Modal title={editProduct?'Editar capacidad':'Nueva capacidad'} onClose={()=>setDialog(null)}>
    <form className="modal-form catalog2-modal-form" onSubmit={saveVariant}>
     <div className="catalog2-variant-category"><Boxes size={17}/><span>{selected.name}</span></div>
     <Field label="Capacidad o referencia"><input required value={capacity} onChange={e=>setCapacity(e.target.value)}
      placeholder="Ej. 10.000 L, 15.000 L, 20.000 L"/></Field>
     <Field label="Precio de venta configurado (€)"><input type="number" min="0" step=".01" value={price}
      onChange={e=>setPrice(e.target.value)} placeholder="Sin precio todavía"/></Field>
     <p className="catalog2-help"><Info size={16}/>Si dejas el precio vacío, la variante se podrá seleccionar en Presupuestos, pero habrá que introducir el importe manualmente.</p>
     <label className="catalog2-check"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>
      <span><strong>Disponible para nuevos presupuestos</strong><small>Desactívala para ocultarla del selector sin borrar su histórico.</small></span>
     </label>
     {error&&<p className="catalog2-error" role="alert">{error}</p>}
     <div className="modal-actions"><Button variant="outline" onClick={()=>setDialog(null)}>Cancelar</Button><Button type="submit"><Check size={16}/>Guardar capacidad</Button></div>
    </form>
   </Modal>}
 </div>;
}
